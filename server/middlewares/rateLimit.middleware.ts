// @ts-ignore
import ipchecker from 'ipchecker'
import { Context, Next, Middleware } from 'koa'

interface RateLimitOptions {
  duration?: number
  whiteList?: string[]
  blackList?: string[]
  accessLimited?: string
  accessForbidden?: string
  max?: number
  env?: string | null
  message_429?: string
  message_403?: string
}

const defaults = {
  duration: 1000 * 60 * 60,
  whiteList: [] as string[],
  blackList: [] as string[],
  accessLimited: '429: Too Many Requests.',
  accessForbidden: '403: This is forbidden area for you.',
  max: 100,
  env: null,
}

export default function betterlimit(options: RateLimitOptions = {}): Middleware {
  const db: Record<string, { ip: string; reset: number; limit: number }> = {}

  const mergedOptions = { ...defaults, ...options }

  if (options.message_429) {
    mergedOptions.accessLimited = options.message_429
  }

  if (options.message_403) {
    mergedOptions.accessForbidden = options.message_403
  }

  const whiteListMap = ipchecker.map(mergedOptions.whiteList)
  const blackListMap = ipchecker.map(mergedOptions.blackList)

  return async function ratelimit(ctx: Context, next: Next) {
    const ip =
      (ctx.request.header['x-koaip'] as string) ||
      (ctx.request.header['cf-connecting-ip'] as string) ||
      ctx.ip

    if (!ip) {
      return await next()
    }
    if (ipchecker.check(ip, blackListMap)) {
      ctx.response.status = 403
      ctx.response.body = mergedOptions.accessForbidden
      return
    }
    if (ipchecker.check(ip, whiteListMap)) {
      return await next()
    }

    const now = Date.now()
    const reset = now + mergedOptions.duration

    if (!db.hasOwnProperty(ip)) {
      db[ip] = { ip, reset, limit: mergedOptions.max }
    }

    const delta = db[ip].reset - now
    const retryAfter = (delta / 1000) | 0

    db[ip].limit = db[ip].limit - 1
    ctx.response.set('X-RateLimit-Limit', String(mergedOptions.max))

    if (db[ip].reset > now) {
      const rateLimiting = db[ip].limit < 0 ? 0 : db[ip].limit
      ctx.response.set('X-RateLimit-Remaining', String(rateLimiting))
    }

    if (db[ip].limit < 0 && db[ip].reset < now) {
      db[ip] = { ip, reset, limit: mergedOptions.max }
      db[ip].limit = db[ip].limit - 1
      ctx.response.set('X-RateLimit-Remaining', String(db[ip].limit))
    }

    ctx.response.set('X-RateLimit-Reset', String(db[ip].reset))

    if (db[ip].limit < 0) {
      ctx.response.set('Retry-After', String(retryAfter))
      ctx.response.status = 429
      ctx.response.body = mergedOptions.accessLimited
      return
    }

    return await next()
  }
}
