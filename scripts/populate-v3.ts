/**
 * Script to pre-populate modules-v3 by building top packages
 */

import path from 'path'
import fs from 'fs'
import axios from 'axios'

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:5000'
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10)
const TIMEOUT_MS = 120000 // 120 seconds per request
const TOP_PACKAGES_PATH = path.join(__dirname, '../top-packages.json')
const PROGRESS_PATH = path.join(__dirname, '../populate-v3-progress.json')
const STATS_PATH = path.join(__dirname, '../populate-v3-stats.json')
const COMPARISON_PATH = path.join(__dirname, '../populate-v3-comparison.json')

const EXPORTS_STATS_PATH = path.join(
  __dirname,
  '../populate-v3-exports-stats.json'
)
const EXPORTS_COMPARISON_PATH = path.join(
  __dirname,
  '../populate-v3-exports-comparison.json'
)

const CACHE_SERVICE_BASE =
  process.env.CACHE_SERVICE_BASE || 'http://localhost:7001'

// Parse command line args
const args = process.argv.slice(2)
const shouldReset = args.includes('--reset')
const concurrencyArg = args.find(a => a.startsWith('--concurrency='))
const concurrency = concurrencyArg
  ? parseInt(concurrencyArg.split('=')[1], 10)
  : CONCURRENCY

const limitArg = args.find(a => a.startsWith('--limit-packages='))
const packageLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

const packageFilterArg = args.find(a => a.startsWith('--package='))
const packageFilter = packageFilterArg ? packageFilterArg.split('=')[1] : null

const sizesOnly = args.includes('--sizes-only')
const exportsOnly = args.includes('--exports-only')

// Validate flags
if (sizesOnly && exportsOnly) {
  console.error(
    'Error: Cannot use both --sizes-only and --exports-only flags together'
  )
  process.exit(1)
}

console.log(`
=== Populate modules-v3 ===
API: ${API_BASE}
Concurrency: ${concurrency}
Package Limit: ${packageLimit}
Package Filter: ${packageFilter || 'None'}
Reset: ${shouldReset}
Mode: ${
  sizesOnly
    ? 'Sizes Only'
    : exportsOnly
    ? 'Exports Only'
    : 'Both (Sizes + Exports)'
}
`)

interface ProgressStats {
  success: number
  failed: number
  skipped: number
  exports_success: number
  exports_failed: number
}

interface Progress {
  completed: Set<string>
  completed_exports: Set<string>
  failed: Set<string>
  stats: ProgressStats
}

// Load progress
function loadProgress(): Progress {
  // Only full reset if requested AND no package filter
  if (shouldReset && !packageFilter) {
    console.log('Resetting ALL progress...')
    return {
      completed: new Set(),
      completed_exports: new Set(),
      failed: new Set(),
      stats: {
        success: 0,
        failed: 0,
        skipped: 0,
        exports_success: 0,
        exports_failed: 0,
      },
    }
  }

  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
      console.log(
        `Resuming: ${data.completed.length} sizes completed, ${
          data.completed_exports?.length || 0
        } exports completed, ${data.failed.length} failed`
      )

      const stats = data.stats || {}
      return {
        completed: new Set(data.completed),
        completed_exports: new Set(data.completed_exports || []),
        failed: new Set(data.failed),
        stats: {
          success: stats.success || 0,
          failed: stats.failed || 0,
          skipped: stats.skipped || 0,
          exports_success: stats.exports_success || 0,
          exports_failed: stats.exports_failed || 0,
        },
      }
    } catch (e) {
      console.log('Could not load progress, starting fresh')
    }
  }
  return {
    completed: new Set(),
    completed_exports: new Set(),
    failed: new Set(),
    stats: {
      success: 0,
      failed: 0,
      skipped: 0,
      exports_success: 0,
      exports_failed: 0,
    },
  }
}

// Save progress
function saveProgress(progress: Progress) {
  const data = {
    completed: Array.from(progress.completed),
    completed_exports: Array.from(progress.completed_exports),
    failed: Array.from(progress.failed),
    stats: progress.stats,
    lastSaved: new Date().toISOString(),
  }
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(data, null, 2))
}

// Save helpers
function saveJson(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// Timeout wrapper that ABORTS the underlying request
function withAbortableTimeout<T>(promiseFactory: (signal: AbortSignal) => Promise<T>, timeoutMs: number, timeoutValue: T): Promise<T> {
  const controller = new AbortController()
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<T>(resolve => {
    timeoutId = setTimeout(() => {
      console.log(`[WATCHDOG] Aborting request after ${timeoutMs}ms`)
      controller.abort()
      resolve(timeoutValue)
    }, timeoutMs)
  })

  const workPromise = promiseFactory(controller.signal)
    .then(result => {
      clearTimeout(timeoutId)
      return result
    })
    .catch(err => {
      clearTimeout(timeoutId)
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return timeoutValue
      }
      throw err
    })

  return Promise.race([workPromise, timeoutPromise])
}

// Build a single package version
async function buildPackage(packageName: string, version: string, signal: AbortSignal | null = null) {
  const key = `${packageName}@${version}`

  // 1. Fetch v2 data from cache-service
  let v2Result = null
  try {
    const v2Response = await axios.get(`${CACHE_SERVICE_BASE}/package-cache`, {
      params: { name: packageName, version: version, readKey: 'modules-v2' },
      timeout: 10000,
    })
    if (v2Response.data && v2Response.data.size) {
      v2Result = { size: v2Response.data.size, gzip: v2Response.data.gzip }
    }
  } catch (err) { }

  // 2. Fetch v3 data (trigger build)
  const url = `${API_BASE}/api/size?package=${encodeURIComponent(key)}&record=true&force=true`

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT_MS,
      signal: signal || undefined,
    })
    if (response.data && response.data.size) {
      return {
        success: true,
        size: response.data.size,
        gzip: response.data.gzip,
        v2: v2Result,
      }
    }
    return { success: false, error: 'No size in response', v2: v2Result }
  } catch (err: any) {
    if (err.name === 'CanceledError' || err.name === 'AbortError') {
      return { success: false, error: 'Request aborted', v2: v2Result }
    }
    const errorMsg =
      err.response?.data?.error?.code ||
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown Error'
    return { success: false, error: errorMsg, v2: v2Result }
  }
}

async function buildExports(packageName: string, version: string, signal: AbortSignal | null = null) {
  const key = `${packageName}@${version}`

  let v2Result = null
  try {
    const v2Response = await axios.get(`${CACHE_SERVICE_BASE}/exports-cache`, {
      params: { name: packageName, version: version, readKey: 'exports' },
      timeout: 10000,
    })
    if (v2Response.data) {
      v2Result = v2Response.data
    }
  } catch (err) { }

  const url = `${API_BASE}/api/exports-sizes?package=${encodeURIComponent(key)}&force=true`

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT_MS,
      signal: signal || undefined,
    })
    if (response.data) {
      return {
        success: true,
        data: response.data,
        v2: v2Result,
      }
    }
    return { success: false, error: 'No data in response', v2: v2Result }
  } catch (err: any) {
    if (err.name === 'CanceledError' || err.name === 'AbortError') {
      return { success: false, error: 'Request aborted', v2: v2Result }
    }
    const errorMsg =
      err.response?.data?.error?.code ||
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown Error'
    return { success: false, error: errorMsg, v2: v2Result }
  }
}

// Process a batch
async function processBatch(
  batch: { packageName: string; version: string }[],
  progress: Progress,
  detailedStats: any[],
  comparisons: any[],
  exportsStats: any[],
  exportsComparisons: any[]
) {
  const promises = batch.map(async ({ packageName, version }) => {
    const key = `${packageName}@${version}`

    const shouldBuildSize = !exportsOnly && !progress.completed.has(key)
    const shouldBuildExports = !sizesOnly && !progress.completed_exports.has(key)

    if (!shouldBuildSize && !shouldBuildExports) {
      progress.stats.skipped++
      return { key, skipped: true }
    }

    const startTime = Date.now()
    let sizeResult: any = { success: true, skipped: true }
    let exportsResult: any = { success: true, skipped: true }

    const tasks = []
    if (shouldBuildSize) {
      tasks.push(
        withAbortableTimeout(
          signal => buildPackage(packageName, version, signal),
          TIMEOUT_MS + 5000,
          { success: false, error: 'Operation timeout (aborted)', v2: null }
        ).then(res => {
          sizeResult = res
        })
      )
    }
    if (shouldBuildExports) {
      tasks.push(
        withAbortableTimeout(
          signal => buildExports(packageName, version, signal),
          TIMEOUT_MS + 5000,
          { success: false, error: 'Operation timeout (aborted)', v2: null }
        ).then(res => {
          exportsResult = res
        })
      )
    }

    if (tasks.length > 0) {
      await Promise.all(tasks)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    const finalResult: any = { key, duration }

    if (shouldBuildSize) {
      if (sizeResult.success) {
        progress.completed.add(key)
        progress.stats.success++
        detailedStats.push({
          package: key,
          status: 'success',
          size: sizeResult.size,
          gzip: sizeResult.gzip,
          duration: parseFloat(duration),
          timestamp: new Date().toISOString(),
        })

        if (sizeResult.v2) {
          comparisons.push({
            package: key,
            v2_size: sizeResult.v2.size,
            v3_size: sizeResult.size,
            v2_gzip: sizeResult.v2.gzip,
            v3_gzip: sizeResult.gzip,
            size_diff: sizeResult.size - sizeResult.v2.size,
            gzip_diff: sizeResult.gzip - sizeResult.v2.gzip,
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        progress.failed.add(key)
        progress.stats.failed++
        detailedStats.push({
          package: key,
          status: 'failed',
          error: sizeResult.error,
          duration: parseFloat(duration),
          timestamp: new Date().toISOString(),
        })
      }
    }

    if (shouldBuildExports) {
      if (exportsResult.success) {
        progress.completed_exports.add(key)
        progress.stats.exports_success++
        exportsStats.push({
          package: key,
          status: 'success',
          data: exportsResult.data,
          duration: parseFloat(duration),
          timestamp: new Date().toISOString(),
        })

        if (exportsResult.v2) {
          exportsComparisons.push({
            package: key,
            v2: exportsResult.v2,
            v3: exportsResult.data,
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        progress.stats.exports_failed++
        exportsStats.push({
          package: key,
          status: 'failed',
          error: exportsResult.error,
          duration: parseFloat(duration),
          timestamp: new Date().toISOString(),
        })
      }
    }

    return {
      key,
      duration,
      size: shouldBuildSize ? sizeResult : null,
      exports: shouldBuildExports ? exportsResult : null,
    }
  })

  return Promise.all(promises)
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}h ${m}m ${s}s`
}

async function main() {
  if (!fs.existsSync(TOP_PACKAGES_PATH)) {
    console.error('top-packages.json not found.')
    process.exit(1)
  }

  const packages = JSON.parse(fs.readFileSync(TOP_PACKAGES_PATH, 'utf8'))
  let targetPackages = packages
  if (packageFilter) {
    targetPackages = packages.filter((p: any) => p.name === packageFilter)
  }

  targetPackages = targetPackages.slice(0, packageLimit)

  const allVersions: { packageName: string; version: string }[] = []
  for (const pkg of targetPackages) {
    for (const version of pkg.versions) {
      allVersions.push({
        packageName: pkg.name,
        version,
      })
    }
  }

  const progress = loadProgress()
  let detailedStats: any[] = []
  let comparisons: any[] = []
  let exportsStats: any[] = []
  let exportsComparisons: any[] = []

  if (!(shouldReset && !packageFilter)) {
    if (fs.existsSync(STATS_PATH)) detailedStats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'))
    if (fs.existsSync(COMPARISON_PATH)) comparisons = JSON.parse(fs.readFileSync(COMPARISON_PATH, 'utf8'))
    if (fs.existsSync(EXPORTS_STATS_PATH)) exportsStats = JSON.parse(fs.readFileSync(EXPORTS_STATS_PATH, 'utf8'))
    if (fs.existsSync(EXPORTS_COMPARISON_PATH)) exportsComparisons = JSON.parse(fs.readFileSync(EXPORTS_COMPARISON_PATH, 'utf8'))
  }

  if (shouldReset && packageFilter) {
    const keysToRemove: string[] = []
    progress.completed.forEach(key => { if (key.startsWith(packageFilter + '@')) keysToRemove.push(key) })
    progress.completed_exports.forEach(key => { if (key.startsWith(packageFilter + '@')) keysToRemove.push(key) })
    progress.failed.forEach(key => { if (key.startsWith(packageFilter + '@')) keysToRemove.push(key) })

    keysToRemove.forEach(key => {
      progress.completed.delete(key)
      progress.completed_exports.delete(key)
      progress.failed.delete(key)
    })

    detailedStats = detailedStats.filter(item => !item.package.startsWith(packageFilter + '@'))
    comparisons = comparisons.filter(item => !item.package.startsWith(packageFilter + '@'))
    exportsStats = exportsStats.filter(item => !item.package.startsWith(packageFilter + '@'))
    exportsComparisons = exportsComparisons.filter(item => !item.package.startsWith(packageFilter + '@'))
  }

  const startTime = Date.now()
  for (let i = 0; i < allVersions.length; i += concurrency) {
    const batch = allVersions.slice(i, i + concurrency)
    await processBatch(
      batch,
      progress,
      detailedStats,
      comparisons,
      exportsStats,
      exportsComparisons
    )

    const elapsed = (Date.now() - startTime) / 1000
    const rate = (progress.stats.success + progress.stats.failed) / elapsed
    const remaining = (allVersions.length - (i + batch.length)) / (rate || 1)

    console.log(`[${i + batch.length}/${allVersions.length}] Elapsed: ${formatTime(elapsed)}, ETA: ${formatTime(remaining)}`)

    saveProgress(progress)
    saveJson(STATS_PATH, detailedStats)
    saveJson(COMPARISON_PATH, comparisons)
    saveJson(EXPORTS_STATS_PATH, exportsStats)
    saveJson(EXPORTS_COMPARISON_PATH, exportsComparisons)
  }

  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
