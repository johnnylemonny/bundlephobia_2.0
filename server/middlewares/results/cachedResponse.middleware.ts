import { Context, Next } from 'koa'
import semver from 'semver'
import config from '../../config'
import { failureCache, debug as initDebug } from '../../init'
import logger from '../../Logger'

async function cachedResponse(ctx: Context, next: Next) {
  const { force, peep } = ctx.query as { force?: string; peep?: string }
  if (force) {
    await next()
    return
  }
  const { name, version, packageString } = ctx.state.resolved

  const logCache = ({ hit, type = '', message }: { hit: boolean; type?: string; message: string }) =>
    logger.info(
      'CACHE',
      {
        name,
        version,
        packageString,
        hit,
        type,
        requestId: ctx.state.id,
      },
      message
    )

  // @ts-ignore - ctx.cashed is added by koa-cash
  const cached = await ctx.cashed()
  if (cached) {
    ctx.cacheControl = {
      maxAge: force
        ? 0
        : semver.valid(version)
        ? config.CACHE.SIZE_API_HAS_VERSION
        : config.CACHE.SIZE_API_DEFAULT,
    }

    logCache({ hit: true, message: `CACHE HIT: ${packageString}` })
    return
  }

  const failureCacheEntry = failureCache.get(packageString)
  if (failureCacheEntry) {
    initDebug('fetched %s from failure cache', packageString)

    logCache({
      hit: true,
      type: 'failure',
      message: `FAILURE CACHE HIT: ${packageString}`,
    })

    ctx.status = (failureCacheEntry as any).status
    ctx.body = (failureCacheEntry as any).body
    return
  }

  logCache({ hit: false, message: `CACHE MISS: ${packageString}` })

  // When peeping into the built results,
  // we return a 404 if a build is required.
  if (peep) {
    ctx.status = 404
    return
  }
  await next()
}

export default cachedResponse
