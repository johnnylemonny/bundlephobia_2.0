import axios from 'axios'
import { requestQueue, pool } from '../init'
import config from '../config'
import CustomError from '../CustomError'
import debugFactory from 'debug'

const debug = debugFactory('bp:build')

export enum OperationType {
  PACKAGE_BUILD_STATS = 'PACKAGE_BUILD_STATS',
  PACKAGE_EXPORTS = 'PACKAGE_EXPORTS',
  PACKAGE_EXPORTS_SIZES = 'PACKAGE_EXPORTS_SIZES',
}

interface Operation {
  type: OperationType
  endpoint: string
  methodName: string
}

class BuildService {
  constructor() {
    const operations: Operation[] = [
      {
        type: OperationType.PACKAGE_BUILD_STATS,
        endpoint: '/size',
        methodName: 'getPackageStats',
      },
      {
        type: OperationType.PACKAGE_EXPORTS,
        endpoint: '/exports',
        methodName: 'getAllPackageExports',
      },
      {
        type: OperationType.PACKAGE_EXPORTS_SIZES,
        endpoint: '/exports-sizes',
        methodName: 'getPackageExportSizes',
      },
    ]

    operations.forEach(operation => {
      requestQueue.addExecutor(operation.type, async ({ packageString }: { packageString: string }) => {
        if (process.env.BUILD_SERVICE_ENDPOINT) {
          try {
            const response = await axios.get(
              `${process.env.BUILD_SERVICE_ENDPOINT}${
                operation.endpoint
              }?p=${encodeURIComponent(packageString)}`
            )
            return response.data
          } catch (error: any) {
            this._handleError(error, operation.type)
          }
        } else {
          return await pool
            .exec(operation.methodName, [packageString])
            .timeout(config.WORKER_TIMEOUT)
        }
      })
    })
  }

  private _handleError(error: any, operationType: OperationType): never {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const contents = error.response.data
      throw new CustomError(
        contents.name || 'BuildError',
        contents.originalError,
        contents.extra
      )
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      debug('No response received from build server. Is the server down?')
      throw new CustomError('BuildError', {
        operation: operationType,
        reason: 'BUILD_SERVICE_UNREACHABLE',
        url: error.request._currentUrl,
      })
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new CustomError('BuildError', error.message, {
        operation: operationType,
      })
    }
  }

  async getPackageBuildStats(packageString: string, priority?: number) {
    return await requestQueue.process(
      packageString,
      OperationType.PACKAGE_BUILD_STATS,
      { packageString },
      { priority }
    )
  }

  async getPackageExports(packageString: string, priority?: number) {
    return await requestQueue.process(
      packageString,
      OperationType.PACKAGE_EXPORTS,
      { packageString },
      { priority }
    )
  }

  async getPackageExportSizes(packageString: string, priority?: number) {
    return await requestQueue.process(
      packageString,
      OperationType.PACKAGE_EXPORTS_SIZES,
      { packageString },
      { priority }
    )
  }
}

export default BuildService
