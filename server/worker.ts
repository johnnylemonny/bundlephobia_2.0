import workerpool from 'workerpool'
import {
  getPackageStats,
  getAllPackageExports,
  getPackageExportSizes,
} from 'package-build-stats'

// create a worker and register public functions
workerpool.worker({
  getPackageStats,
  getAllPackageExports,
  getPackageExportSizes,
})
