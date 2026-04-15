#!/usr/bin/env node

import firebase from 'firebase'
// @ts-ignore
import firebaseUtils from '../utils/firebase.utils'
// @ts-ignore
import trending from 'trending-github'
import fetch from 'node-fetch'
import createDebug from 'debug'
// @ts-ignore
import GithubAPI from 'github'
// @ts-ignore
import isEmptyObject from 'is-empty-object'
// @ts-ignore
import promiseSeries from 'promise.series'
import dotenv from 'dotenv'

dotenv.config()

const debug = createDebug('bp:trending-fetch')

const github = new GithubAPI({
  debug: false
})

github.authenticate({
  type: 'oauth',
  key: process.env.GITHUB_CLIENT_ID!,
  secret: process.env.GITHUB_CLIENT_SECRET!
})

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

const port = process.env.PORT || 5000

async function getPackageFromRepo(author: string, name: string): Promise<string | undefined> {
  try {
    const {
      data: { content }
    } = await github.repos.getContent({
      repo: author,
      owner: name,
      path: 'package.json'
    })

    if (content) {
      const decodedContent = Buffer.from(content, 'base64').toString('utf8')
      return JSON.parse(decodedContent).name
    }
  } catch (err) {
    debug('failed to get package.json for %s/%s', author, name)
  }
  return undefined
}

async function getGithubTrendingPackages(): Promise<string[]> {
  const repos = (await trending('daily', 'javascript')) as any[]
  const packages = await Promise.all(
    repos.map((repo: any) => getPackageFromRepo(repo.author, repo.name))
  )
  return packages.filter((pack: string | undefined): pack is string => !!pack)
}

async function getTrendingSearches(): Promise<string[]> {
  const limit = 20
  let trendingSearches: string[] = []
  const searches = await firebaseUtils.getDailySearches()

  if (searches) {
    trendingSearches = Object.keys(searches)
      .sort(
        (packageA, packageB) =>
          searches[packageB].count - searches[packageA].count
      )
      .slice(0, limit)
  }

  return trendingSearches
}

export async function updateHistoricalData() {
  try {
    const [githubTrendingPackages, searchTrendingPackages] = await Promise.all([
      getGithubTrendingPackages(),
      getTrendingSearches()
    ])

    const popularPackages = Array.from(new Set(githubTrendingPackages.concat(searchTrendingPackages)))
    console.log('popular', popularPackages)
  } catch (err) {
    console.log(err)
  }
}

async function getVersionsToBuild(name: string): Promise<string[]> {
  const versionsToBuild: string[] = []
  const res = await fetch(
    `http://localhost:${port}/api/package-history?package=${name}`
  )
  const versionInfo: Record<string, any> = await res.json()

  Object.keys(versionInfo).forEach(version => {
    if (isEmptyObject(versionInfo[version])) {
      versionsToBuild.push(version)
    }
  })

  return versionsToBuild
}

async function buildPackage(name: string, version: string) {
  debug('building package %s %s', name, version)
  const res = await fetch(
    `http://localhost:${port}/api/size?package=${name + '@' + version}`
  )
  debug('result %s %s %O', name, version, await res.json())
}

async function buildPackageFromGithub(name: string, author: string) {
  debug('building repo %s', name)
  const packageName = await getPackageFromRepo(name, author)

  if (packageName) {
    const versions = await getVersionsToBuild(packageName)
    debug('versions to build for %s — %o', packageName, versions)
    await promiseSeries(
      versions.map(version => () => buildPackage(packageName, version))
    )
  } else {
    debug('skipped repo %s', name)
  }
}

async function mostPopuplarGithubRepos() {
  const repos = await github.search.repos({
    q: 'language:javascript+npm in:readme+size:1000..50000+mirror:false',
    sort: 'stars',
    page: 1,
    per_page: 10
  })

  debug(
    'Popular GitHub Repos %o',
    repos.data.items.map((r: any) => r.name)
  )

  try {
    const promises = repos.data.items.map(({ name, owner }: any) => () =>
      buildPackageFromGithub(name, owner.login)
    )
    await promiseSeries(promises)
  } catch (err) {
    console.log(err)
  }
}

if (require.main === module) {
  mostPopuplarGithubRepos()
}
