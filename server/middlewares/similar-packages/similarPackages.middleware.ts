import { Context } from 'koa'
import axios from 'axios'
import { remark } from 'remark'
import remarkStrip from 'strip-markdown'
import natural from 'natural'
import flatten from 'flatten'
import { categories } from './fixtures'
import { parsePackageString } from '../../../utils/common.utils'
import logger from '../../Logger'
import config from '../../config'
import Debug from 'debug'

const debug = Debug('bp:similar')
const debugTest = Debug('classifier:test')

const MIN_CUTOFF_SCORE = 12

interface Repository {
  host: string
  user: string
  project: string
  branch: string
  path: string
}

interface PackageDetails {
  description: string
  keywords: string[]
  readme: string
  repository?: Repository
  [key: string]: any
}

const prefixURL = (url: string, { base, user, project, head, path }: { base: string; user: string; project: string; head: string; path: string }) => {
  if (url.includes('//')) {
    return url
  } else {
    try {
      return new URL(
        (path ? path.replace(/^\//, '') + '/' : '') +
          url.replace(/^(\.?\/?)/, ''),
        `${base}/${user}/${project}/${path ? '' : `${head}/`}`
      ).toString()
    } catch (e) {
      console.error('Invalid URL in prefixURL:', url, base, user, project)
      return url
    }
  }
}

async function getPackageDetails(packageName: string): Promise<PackageDetails> {
  let readme = ''
  const response = await axios.get(
    `https://ofcncog2cu-dsn.algolia.net/1/indexes/npm-search/${encodeURIComponent(
      packageName
    )}?x-algolia-application-id=OFCNCOG2CU&x-algolia-api-key=f54e21fa3a2a0160595bb058179bfb1e`
  )
  const body = response.data

  if ('readme' in body && body.readme.trim()) {
    readme = await stripMarkdown(body.readme)
  } else {
    try {
      if (body.repository) {
        let readmeMD = await getReadme(body.repository)
        readme = await stripMarkdown(readmeMD)
      }
    } catch (e) {
      console.error('error getting readme contents for ' + packageName, e)
    }
  }

  return { ...body, readme }
}

async function getReadme(repository: Repository): Promise<string> {
  const { host, user, project, branch, path } = repository
  if (host === 'github.com') {
    const getGithubFile = async (fileName: string) =>
      await axios.get(
        prefixURL(fileName, {
          base: 'https://raw.githubusercontent.com',
          user,
          project,
          head: branch,
          path: path.replace(/\/tree\//, ''),
        })
      )

    try {
      const { data: body } = await getGithubFile('README.md')
      return body
    } catch (e) {
      try {
        const { data: body } = await getGithubFile('readme.md')
        return body
      } catch (e) {
        const { data: body } = await getGithubFile('Readme.md')
        return body
      }
    }
  } else if (host === 'gitlab.com') {
    const getGitlabFile = async ({ user, project, branch, filePath }: { user: string; project: string; branch: string; filePath: string }) => {
      const apiUrl = `https://gitlab.com/api/v4/projects/${user}%2F${project}/repository/files/${encodeURIComponent(
        filePath
      )}?ref=${branch}`
      const { data: body } = await axios.get(apiUrl)

      if (body.encoding === 'base64') {
        return Buffer.from(body.content, 'base64').toString()
      } else {
        return body.content
      }
    }

    return getGitlabFile({
      user,
      project,
      branch,
      filePath: `${path}/README.md`,
    })
  } else if (host === 'bitbucket.org') {
    const { data: body } = await axios.get(
      `https://bitbucket.org/${user}/${project}${
        path ? path.replace('src', 'raw') : `/raw/${branch}`
      }/README.md`
    )
    return body
  }
  return ''
}

async function stripMarkdown(readme: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    remark()
      .use(remarkStrip)
      .process(readme, function (err: any, file: any) {
        if (err) reject(err)
        resolve(
          String(file).replace(
            /\b(npm|code|library|Node|example|project|license|MIT)\b/gi,
            ''
          )
        )
      })
  })
}

function getScore(categoryTokens: { tag: string; weight: number }[], packageTokens: string[]) {
  const packageTokenWithoutDupes = Array.from(new Set(packageTokens))
  return packageTokenWithoutDupes.reduce((acc, curToken) => {
    const match = categoryTokens.find(token => token.tag === curToken)
    if (match) {
      return acc + match.weight
    }
    return acc
  }, 0)
}

function getInCategoryMap(packageName: string) {
  return Object.keys(categories).find(label =>
    categories[label].similar.some(
      similarPackage => similarPackage === packageName
    )
  )
}

async function getCategory(packageName: string) {
  const categoryId = getInCategoryMap(packageName)
  if (categoryId) {
    return {
      label: categoryId,
      score: 999,
    }
  }

  const { description, keywords } = await getPackageDetails(packageName)
  const tokenizer = new (natural as any).WordTokenizer()
  const tokenString =
    (await stripMarkdown(description)) + ' ' + (keywords || []).join(' ')
  const packageTokens = tokenizer
    .tokenize(tokenString)
    .map((token: string) => token.toLowerCase())
    .map((natural as any).PorterStemmer.stem)
    .concat(tokenizer.tokenize(packageName).map((natural as any).PorterStemmer.stem))

  let maxScoreCategory = {
    label: '',
    score: 0,
  }

  Object.keys(categories).forEach(label => {
    const categoryTokens = flatten(
      categories[label].tags.map(tagObj =>
        tokenizer.tokenize(tagObj.tag).map((tokenizedTag: string) => ({
          tag: (natural as any).PorterStemmer.stem(tokenizedTag).toLowerCase(),
          weight: tagObj.weight,
        }))
      )
    )

    const score = getScore(categoryTokens as any, packageTokens)
    if (score > maxScoreCategory.score) {
      maxScoreCategory = {
        label,
        score,
      }
    }
  })

  return maxScoreCategory
}

export async function test() {
  Object.keys(categories).forEach(label => {
    categories[label].similar.forEach(async pack => {
      const actualCategory = await getCategory(pack)

      if (
        !actualCategory ||
        actualCategory.label !== label ||
        actualCategory.score < MIN_CUTOFF_SCORE
      ) {
        debugTest(
          'Package %s. Category expected: %s, got: %o',
          pack,
          label,
          actualCategory
        )
      }
    })
  })
}

async function similarPackagesMiddleware(ctx: Context) {
  const { name } = parsePackageString(ctx.query.package as string)

  try {
    const matchedCategory = await getCategory(name)
    debug('Category for %s : %o', name, matchedCategory)
    if (matchedCategory.label) {
      const value = categories[matchedCategory.label]

      ctx.cacheControl = {
        maxAge: config.CACHE.SIMILAR_API,
      }

      ctx.body = {
        name,
        category: {
          ...matchedCategory,
          label: value.name,
          tags: value.tags,
          similar: value.similar.filter(pack => pack !== name),
        },
      }
    } else {
      ctx.body = {
        name,
        category: {
          label: null,
          score: 0,
          similarPackages: [],
        },
      }
    }
  } catch (err) {
    console.error(err)
    ctx.status = 500
    ctx.body = {
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    }

    logger.error(
      'SIMILAR_PACKAGES_ERROR',
      {
        type: 'SIMIAR_PACKAGES',
        requestId: ctx.state.id,
        name,
        details: err,
      },
      `SIMILAR PACKAGES FAILED: ${name}`
    )
  }
}

export default similarPackagesMiddleware
