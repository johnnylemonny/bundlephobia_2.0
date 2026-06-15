import { decodeFirebaseKey, encodeFirebaseKey } from './index'
import semver from 'semver'
import axios from 'axios'
import firebase from 'firebase/compat/app'
import 'firebase/compat/database'
import debugFactory from 'debug'

const debug = debugFactory('bp:firebase-util')

// Configurable Firebase key for reading package history
const FIREBASE_READ_KEY = process.env.FIREBASE_READ_KEY || 'modules-v2'

if (process.env.FIREBASE_DATABASE_URL) {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  }

  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig)
  }
}

class FirebaseUtils {
  private firebase: typeof firebase | undefined

  constructor(firebaseInstance: typeof firebase, enable = true) {
    if (enable) {
      this.firebase = firebaseInstance
    }
  }

  setRecentSearch(
    name: string,
    packageInfo: { name: string; version: string },
  ) {
    if (!this.firebase) {
      return
    }

    const searches = this.firebase.database().ref().child('searches-v2')
    searches
      .child(encodeFirebaseKey(name))
      .once('value')
      .then(snapshot => snapshot.val())
      .then(res => {
        if (res) {
          return searches
            .child(encodeFirebaseKey(name))
            .update({
              lastSearched: new Date().getTime(),
              name: packageInfo.name,
              count: res.count + 1,
            })
            .catch(err => console.log(err))
        } else {
          return searches
            .child(encodeFirebaseKey(name))
            .set({
              lastSearched: new Date().getTime(),
              name: packageInfo.name,
              version: packageInfo.version,
              count: 1,
            })
            .catch(err => console.log(err))
        }
      })
  }

  async getPackageHistory(name: string, limit = 15) {
    debug('package history %s', name)
    const packageHistory: Record<string, any> = {}

    // Helper to get history from a specific Firebase key
    const getHistoryFromKey = async (key: string) => {
      if (!this.firebase) return null
      const ref = this.firebase
        .database()
        .ref()
        .child(key)
        .child(encodeFirebaseKey(name))
      return ref.once('value').then(snapshot => snapshot.val())
    }

    // Try primary key first, then fallback if using v3
    const firebasePromise = (async () => {
      const result = await getHistoryFromKey(FIREBASE_READ_KEY)
      if (result) {
        debug('package history from %s', FIREBASE_READ_KEY)
        return result
      }
      // Fallback to v2 if reading from v3
      if (
        FIREBASE_READ_KEY === 'modules-v3' &&
        !process.env.DISABLE_FIREBASE_V2_FALLBACK
      ) {
        const fallback = await getHistoryFromKey('modules-v2')
        if (fallback) {
          debug('package history from modules-v2 (fallback)')
        }
        return fallback
      }
      return null
    })()

    const algoliaAppId = process.env.ALGOLIA_APP_ID || 'OFCNCOG2CU'
    const algoliaApiKey =
      process.env.ALGOLIA_API_KEY || 'f54e21fa3a2a0160595bb058179bfb1e'

    const yarnPromise = axios.get(
      `https://${algoliaAppId}-dsn.algolia.net/1/indexes/npm-search/${encodeURIComponent(name)}`,
      {
        params: {
          'x-algolia-agent': 'bundlephobia',
          'x-algolia-application-id': algoliaAppId,
          'x-algolia-api-key': algoliaApiKey,
        },
      },
    )

    let firebaseHistory: any, versions: string[]
    try {
      const [firebaseResult, yarnInfo] = await Promise.all([
        firebasePromise,
        yarnPromise,
      ])

      firebaseHistory = firebaseResult
      yarnInfo.data.versions = {
        [yarnInfo.data.version]: '',
        ...yarnInfo.data.versions,
      }
      versions = Object.keys(yarnInfo.data.versions)
    } catch (err) {
      console.error(err)
      firebaseHistory = await firebasePromise
      versions = Object.keys(firebaseHistory || {}).map(version =>
        decodeFirebaseKey(version),
      )
    }

    const filteredVersions = versions
      // We *may not* want all tagged alpha/beta versions
      .filter(version => !version.includes('-'))
      .sort((versionA, versionB) => semver.compare(versionA, versionB))

    const limitedVersions = filteredVersions.splice(
      filteredVersions.length - limit,
    )
    debug('last npm  %d %s versions %o', limit, name, limitedVersions)

    // Although if the most recent version is tagged,
    // including it might be of interest
    const lastVersion = versions[versions.length - 1]
    if (lastVersion && lastVersion.includes('-')) {
      limitedVersions.shift()
      limitedVersions.push(lastVersion)
    }

    limitedVersions.forEach(version => {
      packageHistory[version] = {}
    })

    if (!firebaseHistory) {
      return packageHistory
    }

    // debug('searched history %s %o', name, Object.keys(firebaseHistory))
    Object.keys(firebaseHistory).forEach(version => {
      const decodedVersion = decodeFirebaseKey(version)
      if (limitedVersions.includes(decodedVersion)) {
        packageHistory[decodedVersion] = firebaseHistory[version]
      }
    })
    return packageHistory
  }

  getRecentSearches(limit: number | string = 10) {
    if (!this.firebase) {
      return {}
    }

    const searches = this.firebase.database().ref().child('searches-v2')
    const recentSearches: Record<string, any> = {}

    return searches
      .orderByChild('lastSearched')
      .limitToLast(Number(limit))
      .once('value')
      .then(snapshot => snapshot.val())
      .then(result => {
        if (!result) {
          return recentSearches
        }

        Object.keys(result).forEach(search => {
          recentSearches[decodeFirebaseKey(search)] = result[search]
        })
        return recentSearches
      })
  }

  async getDailySearches() {
    if (!this.firebase) {
      return {}
    }

    const dailySearches: Record<string, any> = {}
    const searches = this.firebase.database().ref().child('searches-v2')

    const snapshot = await searches
      .orderByChild('lastSearched')
      .startAt(Date.now() - 1000 * 60 * 60 * 24 * 4, 'lastSearched')
      .once('value')
    const packages = snapshot.val()

    if (packages) {
      Object.keys(packages).forEach(packageName => {
        dailySearches[decodeFirebaseKey(packageName)] = packages[packageName]
      })
    }
    return dailySearches
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new FirebaseUtils(firebase, !!process.env.FIREBASE_DATABASE_URL)
