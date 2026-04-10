import cash from 'koa-cash'
import { Context, Middleware } from 'koa'

interface JsonCacheOptions {
  get: (key: any) => Promise<any>
  set: (key: any, value: any) => void
  hash: (ctx: Context) => any
}

function jsonCacheMiddleware({ get, set, hash: hashFn }: JsonCacheOptions): Middleware {
  return cash({
    async get(key) {
      // Emulate koa-cash cache value
      const value = await get(key)
      if (!value) return undefined
      return {
        body: typeof value === 'string' ? value : JSON.stringify(value),
        type: 'application/json',
      }
    },
    async set(key, value) {
      // We only need the body part from what
      // koa-cash gives us
      const cashValue = value as { body: string } | undefined
      if (cashValue && cashValue.body) {
        await Promise.resolve(set(key, JSON.parse(cashValue.body)))
      }
    },
    hash(ctx) {
      return JSON.stringify(hashFn(ctx))
    },
  })
}

export default jsonCacheMiddleware
