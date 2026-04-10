import { Context, Next } from 'koa'
import { parsePackageString } from '../../../utils/common.utils'
import CustomError from './../../CustomError'
import config from '../../config'

async function blockBlacklistMiddleware(ctx: Context, next: Next) {
  const { package: packageString, force } = ctx.query as { package?: string; force?: string }
  if (force || !packageString) {
    await next()
    return
  }

  const parsedPackage = parsePackageString(packageString)

  // If package is blacklisted, fail fast
  if (config.blackList.some(entry => entry.test(parsedPackage.name))) {
    throw new CustomError('BlocklistedPackageError', { ...parsedPackage })
  }

  // If package is unsupported, fail fast
  const matchedUnsupportedRule = config.unsupported.find(rule =>
    new RegExp(rule.test).test(parsedPackage.name)
  )
  if (matchedUnsupportedRule) {
    throw new CustomError(
      'UnsupportedPackageError',
      { ...parsedPackage },
      { reason: matchedUnsupportedRule.reason }
    )
  }

  await next()
}

export default blockBlacklistMiddleware
