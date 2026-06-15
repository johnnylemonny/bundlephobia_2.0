// Server-specific types only.
// Domain types (PackageBuildResult, PackageExports*, etc.) are
// re-exported from here so callers need only one import site.
import type { PackageMetadata } from '../types/package-domain'

export type {
  PackageBuildResult,
  PackageDependencySize,
  PackageExportAsset,
  PackageExportsResult,
  PackageExportSizesResult,
} from '../types/package-domain'

export interface ResolvedPackageState {
  name: string
  version: string | null
  description?: string
  repository?: string
  scoped: boolean
  packageString: string
}

export interface FailureCacheEntry {
  status: number
  body: unknown
}
