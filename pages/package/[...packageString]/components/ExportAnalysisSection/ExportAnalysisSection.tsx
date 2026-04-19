import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Analytics from '../../../../../client/analytics'
import cx from 'classnames'
import API from '../../../../../client/api'
import SearchIcon from '../../../../../client/components/Icons/SearchIcon'
import JumpingDots from '../../../../../client/components/JumpingDots'
import { formatSize, resolveBuildError } from '../../../../../utils'
import { PackageResult } from '../../../../../types'
import { useClipboard } from '../../../../../client/hooks/useClipboard'

enum AnalysisState {
  TBD = 'tbd',
  IN_PROGRESS = 'in-progress',
  EXPORTS_FULFILLED = 'exports-fulfilled',
  SIZES_FULFILLED = 'sizes-fulfilled',
  REJECTED = 'rejected',
}

function getBGClass(ratio: number) {
  if (ratio < 0.05) return 'low-1'
  if (ratio < 0.15) return 'low-2'
  if (ratio < 0.25) return 'med-1'
  if (ratio < 0.4) return 'med-2'
  if (ratio < 0.5) return 'med-3'
  if (ratio < 0.7) return 'high-1'
  return 'high-2'
}

interface ExportPillProps {
  name: string
  size?: number
  totalSize: number
  isLoading: boolean
  path?: string
}

const ExportPill: React.FC<ExportPillProps> = ({ name, size, totalSize, isLoading }) => {
  return (
    <li className="export-analysis-section__pill export-analysis-section__dont-break">
      <div
        className={cx(
          'export-analysis-section__pill-fill',
          `export-analysis-section__pill-fill--${getBGClass((size || 0) / totalSize)}`
        )}
        style={{
          transform: `scaleX(${Math.min((size || 0) / totalSize, 1)})`,
        }}
      />
      <div className="export-analysis-section__pill-name"> {name} </div>
      {isLoading && <div className="export-analysis-section__pill-spinner" />}
      {size && (
        <div className="export-analysis-section__pill-size">
          {formatSize(size).size.toFixed(1)}
          <span className="export-analysis-section__pill-size-unit">
            {formatSize(size).unit}
          </span>
        </div>
      )}
    </li>
  )
}

interface Export {
  name: string
  gzip?: number
  path?: string
}

interface ExportListProps {
  exports: Export[]
  totalSize: number
  isLoading: boolean
}

const ExportList: React.FC<ExportListProps> = ({ exports, totalSize, isLoading }) => {
  const shouldShowLabels = exports.length > 20
  const exportDictionary = useMemo(() => {
    const dict: Record<string, Export[]> = {}
    exports.forEach(exp => {
      const firstLetter = exp.name[0].toLowerCase()
      if (dict[firstLetter]) {
        dict[firstLetter].push(exp)
      } else {
        dict[firstLetter] = [exp]
      }
    })
    return dict
  }, [exports])

  let curIndex = 0

  return (
    <ul className="export-analysis-section__list">
      {Object.keys(exportDictionary)
        .sort()
        .map(letter => (
          <div className="export-analysis-section__letter-group" key={letter}>
            {shouldShowLabels && (
              <div className="export-analysis-section__dont-break">
                <h3 className="export-analysis-section__letter-heading">
                  {letter}
                </h3>
                <ExportPill
                  size={exportDictionary[letter][0].gzip}
                  totalSize={totalSize}
                  name={exportDictionary[letter][0].name}
                  path={exportDictionary[letter][0].path}
                  key={exportDictionary[letter][0].name}
                  isLoading={curIndex++ < 40 && isLoading}
                />
              </div>
            )}
            {exportDictionary[letter]
              .slice(shouldShowLabels ? 1 : 0)
              .map(exp => (
                <ExportPill
                  size={exp.gzip}
                  totalSize={totalSize}
                  name={exp.name}
                  path={exp.path}
                  key={exp.name}
                  isLoading={curIndex++ < 40 && isLoading}
                />
              ))}
          </div>
        ))}
      <div className="export-analysis-section__overflow-indicator" />
    </ul>
  )
}

const InputExportFilter: React.FC<{ onChange: (val: string) => void }> = ({ onChange }) => (
  <div className="export-analysis-section__filter-input-container">
    <input
      placeholder="Filter methods"
      className="export-analysis-section__filter-input"
      type="text"
      onChange={e => onChange(e.target.value.toLowerCase().trim())}
    />
    <SearchIcon className="export-analysis-section__filter-input-search-icon" />
  </div>
)

interface Asset extends Export {
  name: string
  size: number
  gzip: number
  type: string
}

const ExportAnalysisSection: React.FC<{ result: PackageResult }> = ({ result }) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.TBD)
  const [exportsData, setExportsData] = useState<Record<string, string>>({})
  const [assets, setAssets] = useState<Asset[]>([])
  const [filterText, setFilterText] = useState('')
  const [resultError, setResultError] = useState<any>({})
  const { copied, copy } = useClipboard()

  const getIncompatibleMessage = useCallback(() => {
    if (!(result.hasJSModule || result.hasJSNext || result.isModuleType)) {
      return 'This package does not export ES6 modules.'
    } else if (result.hasSideEffects === true) {
      return "This package exports ES6 modules, but isn't marked side-effect free."
    }
    return ''
  }, [result])

  const startAnalysis = useCallback(async () => {
    const { name, version } = result
    const packageString = `${name}@${version}`
    const startTime = Date.now()
    
    setAnalysisState(AnalysisState.IN_PROGRESS)
    Analytics.performedExportsAnalysis(packageString)

    try {
      const exportsResults = await API.getExports(packageString)
      setExportsData(exportsResults.exports)
      setAnalysisState(AnalysisState.EXPORTS_FULFILLED)
      Analytics.exportsAnalysisSuccess({
        packageName: packageString,
        timeTaken: Date.now() - startTime,
      })

      const sizeStartTime = Date.now()
      const sizesResults = await API.getExportsSizes(packageString)
      setAssets(sizesResults.assets
        .filter((asset: any) => asset.type === 'js')
        .map((asset: any) => ({
          ...asset,
          path: exportsResults.exports[asset.name],
        }))
      )
      setAnalysisState(AnalysisState.SIZES_FULFILLED)
      Analytics.exportsSizesSuccess({
        packageName: packageString,
        timeTaken: Date.now() - sizeStartTime,
      })
    } catch (err) {
      setAnalysisState(AnalysisState.REJECTED)
      setResultError(err)
      console.error('Export analysis failed due to ', err)
      Analytics.exportsAnalysisFailure({
        packageName: packageString,
        timeTaken: Date.now() - startTime,
      })
    }
  }, [result])

  useEffect(() => {
    if (!getIncompatibleMessage()) {
      startAnalysis()
    }
  }, [getIncompatibleMessage, startAnalysis])

  const normalizedExports: Export[] = useMemo(() => {
    if (analysisState === AnalysisState.SIZES_FULFILLED) {
      return assets
    }
    return Object.keys(exportsData)
      .filter(exp => !exp.startsWith('_'))
      .map(exp => ({ name: exp }))
  }, [analysisState, assets, exportsData])

  const matchedExports = useMemo(() => {
    return normalizedExports.filter(asset =>
      filterText ? asset.name.toLowerCase().includes(filterText) : true
    )
  }, [normalizedExports, filterText])

  const handleCopyJSON = () => {
    const json = JSON.stringify(result, null, 2)
    copy(json)
    Analytics.performedCopyJSON(result.name)
  }

  const renderProgress = () => (
    <div className="export-analysis-section__progress-container">
      Fetching all named exports in&nbsp;<code>{result.name}</code>{' '}
      <JumpingDots />
    </div>
  )

  const renderIncompatible = () => (
    <p className="export-analysis-section__subtext">
      Exports analysis is available only for packages that export ES Modules
      and are side-effect free. <br />
      {getIncompatibleMessage()}
    </p>
  )

  const renderFailure = () => {
    const { errorName, errorBody, errorDetails } = resolveBuildError(resultError)
    return (
      <div className="export-analysis-section__error">
        <h4> {errorName}</h4>
        <p dangerouslySetInnerHTML={{ __html: errorBody || '' }} />
        {errorDetails && <pre>{errorDetails}</pre>}
      </div>
    )
  }

  const renderSuccess = () => (
    <>
      <div className="export-analysis-section__topbar">
        <p className="export-analysis-section__subtext export-analysis-section__infotext">
          GZIP sizes of individual exports
        </p>
        <div className="export-analysis-section__actions">
          <InputExportFilter onChange={setFilterText} />
          <button 
            className="export-analysis-section__copy-btn" 
            onClick={handleCopyJSON}
            title="Copy analysis result as JSON"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      </div>

      <ExportList
        isLoading={analysisState === AnalysisState.EXPORTS_FULFILLED}
        totalSize={result.gzip!}
        exports={matchedExports}
      />
    </>
  )

  return (
    <div className="export-analysis-section">
      <h2 className="result__section-heading"> Exports Analysis </h2>

      {getIncompatibleMessage() && renderIncompatible()}
      {analysisState === AnalysisState.REJECTED && renderFailure()}
      {(analysisState === AnalysisState.EXPORTS_FULFILLED ||
        analysisState === AnalysisState.SIZES_FULFILLED) &&
        renderSuccess()}
      {analysisState === AnalysisState.IN_PROGRESS && renderProgress()}
    </div>
  )
}

export default ExportAnalysisSection
