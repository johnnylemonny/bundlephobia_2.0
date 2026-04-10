/**
 * Wraps the original error with an identifiable name.
 */
export default class CustomError extends Error {
  originalError: any
  extra: any

  constructor(name: string, originalError?: any, extra?: any) {
    // If originalError has a message, use it, otherwise use the name
    super(originalError?.message || name)

    this.name = name
    this.originalError = originalError
    this.extra = extra

    // This is needed for custom errors in TS if target is slower than ES2015
    Object.setPrototypeOf(this, CustomError.prototype)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError)
    }
  }
}
