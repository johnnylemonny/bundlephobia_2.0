// Firebase does not accept a
// few special characters for keys
export function encodeFirebaseKey(key: string): string {
  return key.replace(/[.]/g, ',').replace(/\//g, '__')
}

export function decodeFirebaseKey(key: string): string {
  return key.replace(/[,]/g, '.').replace(/__/g, '/')
}

export const formatSize = (value: number): { unit: string; size: number } => {
  let unit: string, size: number
  if (Math.log10(value) < 3) {
    unit = 'B'
    size = value
  } else if (Math.log10(value) < 6) {
    unit = 'kB'
    size = value / 1024
  } else {
    unit = 'MB'
    size = value / 1024 / 1024
  }

  return { unit, size }
}

export const formatTime = (value: number): { unit: string; size: number } => {
  let unit: string, size: number
  if (value < 0.0005) {
    unit = 'μs'
    size = Math.round(value * 1000000)
  } else if (value < 0.5) {
    unit = 'ms'
    size = Math.round(value * 1000)
  } else {
    unit = 's'
    size = value
  }

  return { unit, size }
}

// Picked up from http://www.webpagetest.org/
// Speed in KB/s

export const DownloadSpeed = {
  THREE_G: 400 / 8, // Slow 3G
  FOUR_G: 7000 / 8, // 4G
} as const

export const getTimeFromSize = (sizeInBytes: number): { threeG: number; fourG: number } => {
  return {
    threeG: sizeInBytes / 1024 / DownloadSpeed.THREE_G,
    fourG: sizeInBytes / 1024 / DownloadSpeed.FOUR_G,
  }
}

export function randomFromArray<T>(arr: T[] | readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function zeroToN(n: number): number[] {
  return Array.from(Array(n).keys())
}

export function resolveBuildError(resultsError: any): { errorName: string | null; errorBody: string | null; errorDetails: string | null } {
  if (!resultsError) {
    return {
      errorName: null,
      errorBody: null,
      errorDetails: null,
    }
  }
  const errorName = resultsError.error
    ? resultsError.error.code
    : 'InternalServerError'
  const errorBody = resultsError.error
    ? resultsError.error.message
    : 'Something went wrong!'
  const errorDetails =
    resultsError.error &&
    resultsError.error.details &&
    resultsError.error.details.originalError
      ? typeof resultsError.error.details.originalError === 'object'
        ? JSON.stringify(resultsError.error.details.originalError, null, 2)
        : resultsError.error.details.originalError.toString()
      : null

  return {
    errorName,
    errorBody,
    errorDetails,
  }
}
