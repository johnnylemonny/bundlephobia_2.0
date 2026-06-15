import { Context } from 'koa'
import semver from 'semver'
import config from '../config'
const now = () => performance.now()
import logger from '../Logger'
import Cache from '../../utils/cache.utils'
import { getRequestPriority } from '../../utils/server.utils'
import { parsePackageString } from '../../utils/common.utils'
import BuildService from '../api/BuildService'

const cache = new Cache()
const buildService = new BuildService()

async function exportSizesMiddleware(ctx: Context) {
  let result: any,
    priority = getRequestPriority(ctx)
  const { name, version, packageString } = ctx.state.resolved
  const {
    force,
    peek,
    package: packageQuery,
  } = ctx.query as { force?: string; peek?: string; package: string }

  if (peek) {
    ctx.body = { name, version, peekSuccess: false }
    return
  }

  const buildStart = now()
  result = await buildService.getPackageExportSizes(packageString, priority)

  const buildEnd = now()

  ctx.cacheControl = {
    maxAge: force
      ? 0
      : semver.valid(parsePackageString(packageQuery).version)
        ? config.CACHE.SIZE_API_HAS_VERSION
        : config.CACHE.SIZE_API_DEFAULT,
  }

  const body = { name, version, ...result }
  ctx.body = body
  const time = buildEnd - buildStart

  logger.info(
    'BUILD_EXPORTS_SIZES',
    {
      result,
      requestId: ctx.state.id,
      packageString,
      time,
    },
    `BUILD EXPORTS SIZES: ${packageString} built in ${time.toFixed()}s`,
  )

  if (force === 'true') {
    cache.setExportsSize({ name, version: version as string }, body)
  }
}

export default exportSizesMiddleware
