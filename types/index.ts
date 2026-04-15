import React from 'react'

export type PackageInfo = {
  name: string
  description: string
  repository: string
  dependencyCount: number
  isTreeShakeable: boolean
  hasSideEffects: string[] | boolean
}

export type PackageResult = {
  name: string
  version: string
  description: string
  size: number
  gzip: number
  dependencyCount: number
  hasSideEffects: boolean
  hasJSModule: boolean
  hasJSNext: boolean
  isModuleType: boolean
  repository: string
  ignoredMissingDependencies?: string[]
  dependencySizes?: { name: string; approximateSize: number }[]
  assets?: { name: string; size: number; type: string }[]
}

export type ErrorResponse = {
  error: {
    code: string
    message: string
    details?: {
      originalError?: any
      [key: string]: any
    }
  }
}

export type PackageSuggestion = {
  searchScore: number
  score: { detail: { popularity: number } }
  package: {
    name: string
    version: string
    description: string
    date: string
    scope?: string
  }
}

export type RecentSearch = {
  [key: string]: {
    name: string
    version: string
    lastSearched: number
    count: number
  }
}

export type WithClassName = Pick<React.HTMLAttributes<HTMLElement>, 'className'>
