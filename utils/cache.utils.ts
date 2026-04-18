import axios from 'axios'
import logger from '../server/Logger'
import debugFactory from 'debug'

const debug = debugFactory('bp:cache')

const API = axios.create({
  baseURL: process.env.CACHE_SERVICE_ENDPOINT,
  timeout: 5000,
})

interface PackageKey {
  name: string
  version: string
}

export class Cache {
  async getPackageSize({ name, version }: PackageKey) {
    if (!API.defaults.baseURL) {
      return undefined
    }
    try {
      const result = await API.get('/package-cache', {
        params: { name, version },
      })
      return result.data
    } catch (err: any) {
      console.error(err.response?.statusText || err.message)
    }
  }

  async setPackageSize({ name, version }: PackageKey, result: any) {
    if (!API.defaults.baseURL) {
      return
    }
    debug('set package %O to %O', { name, version }, result)
    try {
      await API.post('/package-cache', { name, version, result })
    } catch (err: any) {
      console.error(err.response?.data || err.message)
      logger.error(
        'CACHE_SET_ERROR',
        {
          name,
          version,
          error: err.response?.data || err.message,
        },
        `CACHE ERROR for package ${name}@${version}`
      )
    }
  }

  async getExportsSize({ name, version }: PackageKey) {
    if (!API.defaults.baseURL) {
      return undefined
    }
    debug('get exports %s@%s', name, version)
    try {
      const result = await API.get('/exports-cache', {
        params: { name, version },
      })
      debug('cache hit')
      return result.data
    } catch (err: any) {}
  }

  async setExportsSize({ name, version }: PackageKey, result: any) {
    if (!API.defaults.baseURL) {
      return
    }
    debug('set exports %O to %O', { name, version }, result)
    try {
      await API.post('/exports-cache', { name, version, result })
    } catch (err: any) {
      console.error(err.response?.data || err.message)
      logger.error(
        'CACHE_SET_ERROR',
        {
          name,
          version,
          error: err.response?.data || err.message,
        },
        `CACHE ERROR for package exports ${name}@${version}`
      )
    }
  }
}

export default Cache
