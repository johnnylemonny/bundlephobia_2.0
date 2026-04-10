import LRU from 'lru-cache'
import workerpool from 'workerpool'
import Queue from './Queue'
import logger from './Logger'
import config from './config'
import debugFactory from 'debug'

const debug = debugFactory('bp:request')

const failureCache = new LRU({
  max: config.MAX_FAILURE_CACHE_ENTRIES,
  ttl: 6 * 1000 * 60 * 60, // lru-cache v7+ uses ttl instead of maxAge
})

const requestQueue = new Queue({
  concurrency: 4,
  maxAge: 60 * 2,
})

const pool = workerpool.pool(`./server/worker.js`, {
  maxWorkers: config.MAX_WORKERS,
})

if (process.env.BUILD_SERVICE_ENDPOINT) {
  pool.terminate()
}

export {
  failureCache,
  requestQueue,
  pool,
  debug,
  logger,
}
