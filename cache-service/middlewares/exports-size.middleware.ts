import 'dotenv-defaults/config'
import LRU from 'lru-cache'
import firebase from 'firebase'
import createDebug from 'debug'
import { encodeFirebaseKey } from '../cache.utils'
import { FastifyRequest, FastifyReply } from 'fastify'

const debug = createDebug('bp:cache')
const LRUCache = new LRU<string, any>({ max: 1500 })

// Configurable Firebase keys for read/write operations
const FIREBASE_READ_KEY_EXPORTS =
  process.env.FIREBASE_READ_KEY_EXPORTS || 'exports-v3'
const FIREBASE_WRITE_KEY_EXPORTS =
  process.env.FIREBASE_WRITE_KEY_EXPORTS || 'exports-v3'

debug(
  'Firebase config (exports): READ from %s (with fallback: %s), WRITE to %s',
  FIREBASE_READ_KEY_EXPORTS,
  FIREBASE_READ_KEY_EXPORTS === 'exports-v3' ? 'yes, to exports' : 'no',
  FIREBASE_WRITE_KEY_EXPORTS
)

interface PackageInfo {
  name: string
  version: string
}

async function getPackageResultFromKey(key: string, { name, version }: PackageInfo) {
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
  const targetReadKey = readKey || FIREBASE_READ_KEY_EXPORTS
  // Try primary read key first
  const result = await getPackageResultFromKey(targetReadKey, { name, version })

  if (result) {
    debug('cache hit: firebase (%s)', targetReadKey)
    return result
  }

  // If reading from default v3 and not found, fall back to "exports" (v2)
  if (
    targetReadKey === 'exports-v3' &&
    !readKey &&
    !process.env.DISABLE_FIREBASE_V2_FALLBACK
  ) {
    const fallbackResult = await getPackageResultFromKey('exports', {
      name,
      version,
    })
    if (fallbackResult) {
      debug('cache hit: firebase (fallback to exports)')
    }
    return fallbackResult
  }

  return null
}

interface SetPackageParams extends PackageInfo {
  result: any
}

async function setPackageResult({ name, version, result }: SetPackageParams) {
  const modules = firebase.database().ref().child(FIREBASE_WRITE_KEY_EXPORTS)
  return modules
    .child(encodeFirebaseKey(name))
    .child(encodeFirebaseKey(version))
    .set(result)
}

export async function getExportsSizeMiddlware(req: FastifyRequest<{ Querystring: { name: string; version: string; readKey?: string } }>, res: FastifyReply) {
  const name = decodeURIComponent(req.query.name)
  const version = decodeURIComponent(req.query.version)
  const readKey = req.query.readKey

  if (!name || !version) {
    return res.code(422).send()
  }
  debug('get exports %s@%s (readKey: %s)', name, version, readKey)

  // Use memory cache only if no explicit readKey is provided
  if (!readKey) {
    const lruCacheEntry = LRUCache.get(`${name}@${version}`)
    if (lruCacheEntry) {
      debug('cache hit: memory')
      return res.code(200).send(lruCacheEntry)
    }
  }

  const result = await getPackageResult({ name, version, readKey })
  if (result) {
    debug('cache hit: firebase')
    if (!readKey) {
      LRUCache.set(`${name}@${version}`, result)
    }
    return res.code(200).send(result)
  }

  return res.code(404).send()
}

export async function postExportsSizeMiddleware(req: FastifyRequest<{ Body: { name: string; version: string; result: any } }>, res: FastifyReply) {
  const { name, version, result } = req.body

  if (!name || !version || !result) return res.code(422).send()

  debug('set exports %O to %O', { name, version }, result)
  LRUCache.set(`${name}@${version}`, result)
  try {
    await setPackageResult({ name, version, result })
    return res.code(201).send()
  } catch (err) {
    console.log(err)
    return res.code(500).send({ error: err })
  }
}
