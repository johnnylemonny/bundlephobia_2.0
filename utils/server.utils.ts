import 'dotenv-defaults/config'
import pacote from 'pacote'
import Queue from '../server/Queue'
import CustomError from '../server/CustomError'
import { Context } from 'koa'

/**
 * Given a package string, this function resolves to a valid version and name.
 */
export async function resolvePackage(packageString: string) {
  try {
    return await pacote.manifest(packageString, { fullMetadata: true })
  } catch (err: any) {
    if (err.code === 'ETARGET') {
      throw new CustomError('PackageVersionMismatchError', null, {
        validVersions: err.distTags ? Object.keys(err.distTags).concat(Object.keys(err.versions || {})) : [],
      })
    } else {
      throw new CustomError('PackageNotFoundError', err)
    }
  }
}

/**
 * Returns the request priority based on the client header.
 */
export function getRequestPriority(ctx: Context) {
  const client = ctx.headers['x-bundlephobia-user']

  switch (client) {
    case 'bundlephobia website':
      return Queue.priority.HIGH
    case 'yarn website':
      return Queue.priority.LOW
    default:
      return Queue.priority.MEDIUM
  }
}
