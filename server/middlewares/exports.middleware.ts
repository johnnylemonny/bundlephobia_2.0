import { Context } from 'koa'
import semver from 'semver'
import config from '../config'
const now = () => performance.now()
import logger from '../Logger'
import { getRequestPriority } from '../../utils/server.utils'
import { parsePackageString } from '../../utils/common.utils'
import BuildService from '../api/BuildService'

const buildService = new BuildService()

async function exportsMiddleware(ctx: Context) {
  let result,
    priority = getRequestPriority(ctx)
  const { name, version, packageString } = ctx.state.resolved
  const { force, package: packageQuery } = ctx.query as { force?: string; package: string }

  const buildStart = now()
  result = await buildService.getPackageExports(packageString, priority)

  const buildEnd = now()

  ctx.cacheControl = {
    maxAge: force
      ? 0
      : semver.valid(parsePackageString(packageQuery).version)
      ? config.CACHE.SIZE_API_HAS_VERSION
      : config.CACHE.SIZE_API_DEFAULT,
  }
  ctx.body = { name, version, exports: result }
  const time = buildEnd - buildStart

  logger.info(
    'BUILD_EXPORTS',
    {
      result,
      requestId: ctx.state.id,
      packageString,
      time,
    },
    `BUILD EXPORTS: ${packageString} built in ${time.toFixed()}s`
  )
}

export default exportsMiddleware
