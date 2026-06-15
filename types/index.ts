import React from 'react'

import type { PackageBuildBase } from './package-domain'

/**
 * Props shape used by UI components that display package stats.
 * Derived from `PackageBuildBase` so the field list stays in sync
 * with the domain type; `isTreeShakeable` is a computed UI concept
 * (true when hasJSModule || hasJSNext || isModuleType).
 */
export type PackageInfo = Pick<
  PackageBuildBase,
  'name' | 'description' | 'repository' | 'dependencyCount' | 'hasSideEffects'
> & {
  isTreeShakeable: boolean
}

export type PackageResult = {
  name: string
  version: string
  description: string
  size: number
  gzip: number
  dependencyCount: number
  hasSideEffects: boolean | string[]
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
