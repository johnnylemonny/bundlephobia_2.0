import { Context, Next } from 'koa'
import { resolvePackage } from '../../../utils/server.utils'
import { parsePackageString } from '../../../utils/common.utils'
import gitURLParse from 'git-url-parse'
import { debug, logger } from '../../init'
const now = () => performance.now()

async function resolvePackageMiddleware(ctx: Context, next: Next) {
  const { package: packageString } = ctx.query as { package: string }
  const parsedPackage = parsePackageString(packageString)
  let resolvedPackage

  // prefill values in case resolution fails
  ctx.state.resolved = {
    ...parsedPackage,
    packageString: `${parsedPackage.name}@${parsedPackage.version}`,
  }

  const resolveStart = now()
  resolvedPackage = await resolvePackage(packageString)
  const resolveEnd = now()

  const { name, version, repository, description } = resolvedPackage
  let truncatedDescription = ''
  let repositoryURL = ''

  try {
    if (repository) {
      repositoryURL = gitURLParse((repository as any).url || repository).toString('https')
    }
  } catch (e) {
    console.error('failed to parse repository url', repository)
  }

  if (description) {
    truncatedDescription =
      description.length > 300
        ? description.substring(0, 300) + '…'
        : description
  }

  const result = {
    name,
    version,
    scoped: parsedPackage.scoped,
    packageString: `${name}@${version}`,
    description: truncatedDescription,
    repository: repositoryURL,
  }

  ctx.state.resolved = result

  debug('resolved to %s@%s', name, version)
  const time = resolveEnd - resolveStart
  logger.info(
    'RESOLVE_PACKAGE',
    { ...result, time, requestId: ctx.state.id },
    `RESOLVED: ${result.packageString} in ${time.toFixed(0)}ms`
  )

  await next()
}

export default resolvePackageMiddleware
