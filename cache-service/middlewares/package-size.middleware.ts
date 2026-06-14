import { LRUCache } from 'lru-cache'
import firebase from 'firebase/compat/app'
import 'firebase/compat/database'
import createDebug from 'debug'
import { encodeFirebaseKey } from '../cache.utils'
import { FastifyRequest, FastifyReply } from 'fastify'

const debug = createDebug('bp:cache')
const cache = new LRUCache<string, any>({ max: 3000 })

// Configurable Firebase keys for read/write operations
// This allows safe migration from modules-v2 (old) to modules-v3 (new package-build-stats 8.x)
const FIREBASE_READ_KEY = process.env.FIREBASE_READ_KEY || 'modules-v3'
const FIREBASE_WRITE_KEY = process.env.FIREBASE_WRITE_KEY || 'modules-v3'

debug(
  'Firebase config: READ from %s (with fallback: %s), WRITE to %s',
  FIREBASE_READ_KEY,
  FIREBASE_READ_KEY === 'modules-v3' ? 'yes, to modules-v2' : 'no',
  FIREBASE_WRITE_KEY,
)

interface PackageInfo {
  name: string
  version: string
}

async function getPackageResultFromKey(
  key: string,
  { name, version }: PackageInfo,
) {
  const ref = firebase
    .database()
    .ref()
    .child(key)
    .child(encodeFirebaseKey(name))
    .child(encodeFirebaseKey(version))

  const snapshot = await ref.once('value')
  return snapshot.val()
}

interface GetPackageParams extends PackageInfo {
  readKey?: string
}

async function getPackageResult({ name, version, readKey }: GetPackageParams) {
  const targetReadKey = readKey || FIREBASE_READ_KEY
  // Try primary read key first
  const result = await getPackageResultFromKey(targetReadKey, { name, version })

  if (result) {
    debug('cache hit: firebase (%s)', targetReadKey)
    return result
  }

  // If reading from default v3 and not found, fall back to v2
  if (
    targetReadKey === 'modules-v3' &&
    !readKey &&
    !process.env.DISABLE_FIREBASE_V2_FALLBACK
  ) {
    const fallbackResult = await getPackageResultFromKey('modules-v2', {
      name,
      version,
    })
    if (fallbackResult) {
      debug('cache hit: firebase (fallback to modules-v2)')
    }
    return fallbackResult
  }

  return null
}

interface SetPackageParams extends PackageInfo {
  result: any
}

async function setPackageResult({ name, version, result }: SetPackageParams) {
  const modules = firebase.database().ref().child(FIREBASE_WRITE_KEY)
  return modules
    .child(encodeFirebaseKey(name))
    .child(encodeFirebaseKey(version))
    .set(result)
}

export async function getPackageSizeMiddlware(
  req: FastifyRequest<{
    Querystring: { name: string; version: string; readKey?: string }
  }>,
  res: FastifyReply,
) {
  const name = decodeURIComponent(req.query.name)
  const version = decodeURIComponent(req.query.version)
  const readKey = req.query.readKey

  if (!name || !version) {
    return res.code(422).send()
  }
  debug('get package %s@%s (readKey: %s)', name, version, readKey)

  // Use memory cache only if no explicit readKey is provided
  if (!readKey) {
    const lruCacheEntry = cache.get(`${name}@${version}`)
    if (lruCacheEntry) {
      debug('cache hit: memory')
      return res.code(200).send(lruCacheEntry)
    }
  }

  const result = await getPackageResult({ name, version, readKey })
  if (result) {
    debug('cache hit: firebase')
    if (!readKey) {
      cache.set(`${name}@${version}`, result)
    }
    return res.code(200).send(result)
  }

  return res.code(404).send()
}

export async function postPackageSizeMiddlware(
  req: FastifyRequest<{ Body: { name: string; version: string; result: any } }>,
  res: FastifyReply,
) {
  const { name, version, result } = req.body

  if (!name || !version || !result) return res.code(422).send()

  debug('set package %O to %O', { name, version }, result)
  cache.set(`${name}@${version}`, result)
  try {
    await setPackageResult({ name, version, result })
    return res.code(201).send()
  } catch (err) {
    console.log(err)
    return res.code(500).send({ error: err })
  }
}
