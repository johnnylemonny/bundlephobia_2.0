import { Context } from 'koa'
import semver from 'semver'
import config from '../../config'
import firebaseUtils from '../../../utils/firebase.utils'
import now from 'performance-now'
import logger from '../../Logger'
import Cache from '../../../utils/cache.utils'
import BuildService from '../../api/BuildService'
import { getRequestPriority } from '../../../utils/server.utils'
import { parsePackageString } from '../../../utils/common.utils'

const cache = new Cache()
const buildService = new BuildService()

async function buildMiddleware(ctx: Context) {
  let result: any,
    priority = getRequestPriority(ctx)
  const { scoped, name, version, description, repository, packageString } =
    ctx.state.resolved
  const { force, record, package: packageQuery } = ctx.query as { force?: string; record?: string; package: string }

  const buildStart = now()
  result = await buildService.getPackageBuildStats(packageString, priority)
  const buildEnd = now()

  ctx.cacheControl = {
    maxAge: force
      ? 0
      : semver.valid(version)
      ? config.CACHE.SIZE_API_HAS_VERSION
      : config.CACHE.SIZE_API_DEFAULT,
  }

  const body = { scoped, name, version, description, repository, ...result }
  ctx.body = body
  ctx.state.buildResult = body
  const time = buildEnd - buildStart

  logger.info(
    'BUILD',
    {
      result,
      requestId: ctx.state.id,
      packageString,
      time,
    },
    `BUILD: ${packageString} built in ${time.toFixed(0)}ms and is ${
      result.size
    } bytes`
  )

  if (record === 'true') {
    firebaseUtils.setRecentSearch(name, { name, version })
  }

  if (force === 'true') {
    cache.setPackageSize({ name, version }, body)
  }
}

export default buildMiddleware
