import React, { PureComponent, ReactNode } from 'react'
import Analytics from '../../../client/analytics'

import ResultLayout from '../../../client/components/ResultLayout'
import BarGraph from '../../../client/components/BarGraph'
import { AutocompleteInput } from '../../../client/components/AutocompleteInput'
import AutocompleteInputBox from '../../../client/components/AutocompleteInputBox'
import BuildProgressIndicator from '../../../client/components/BuildProgressIndicator'
import Router, { withRouter, NextRouter } from 'next/router'
import semver from 'semver'
import { parsePackageString } from '../../../utils/common.utils'
import {
  getTimeFromSize,
  DownloadSpeed,
  resolveBuildError,
  formatSize,
} from '../../../utils'
import Stat from '../../../client/components/Stat'

import API from '../../../client/api'
import MetaTags, {
  DEFAULT_DESCRIPTION_START,
} from '../../../client/components/MetaTags'
import InterLinksSection from './components/InterLinksSection'

import TreemapSection from './components/TreemapSection'
import EmptyBoxIcon from '../../../client/assets/empty-box.svg'
import { resolveComponent } from '../../../utils/resolveComponent'

const EmptyBox = resolveComponent(EmptyBoxIcon)
import SimilarPackagesSection from './components/SimilarPackagesSection'
import ExportAnalysisSection from './components/ExportAnalysisSection'
import QuickStatsBar from '../../../client/components/QuickStatsBar/QuickStatsBar'

import Warning from '../../../client/components/Warning/Warning'
import arrayToSentence from 'array-to-sentence'
import { PackageResult } from '../../../types'

import { addToRecentSearches } from '../../../client/utils/recentSearches'

import { toPng } from 'html-to-image'

interface State {
  results: Partial<PackageResult>
  resultsPromiseState: 'pending' | 'fulfilled' | 'rejected' | null
  resultsError: any
  historicalResultsPromiseState: 'pending' | 'fulfilled' | 'rejected' | null
  inputInitialValue: string
  historicalResults: any[]
  similarPackages: any[]
  similarPackagesCategory: string
}

interface Props {
  router: NextRouter
}

class ResultPage extends PureComponent<Props, State> {
  activeQuery: string | null = null
  statsContainerRef = React.createRef<HTMLDivElement>()

  state: State = {
    results: {},
    resultsPromiseState: null,
    resultsError: null,
    historicalResultsPromiseState: null,
    inputInitialValue: this.getPackageString(this.props.router) || '',
    historicalResults: [],
    similarPackages: [],
    similarPackagesCategory: '',
  }

  getPackageString(router: NextRouter): string {
    return (router.query.packageString as string[] || []).join('/')
  }

  componentDidMount() {
    Analytics.pageView('package result')

    const packageString = this.getPackageString(this.props.router)
    if (packageString) {
      this.handleSearchSubmit(packageString)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { results } = this.state
    const packageString = this.getPackageString(prevProps.router)
    const nextPackageString = this.getPackageString(this.props.router)

    if (Object.keys(results).length === 0) {
      return
    }

    const currentPackage = parsePackageString(packageString)
    const nextPackage = parsePackageString(nextPackageString)

    const isPackageDifferent =
      currentPackage.name !== nextPackage.name ||
      currentPackage.version !== nextPackage.version

    if (isPackageDifferent) {
      this.handleSearchSubmit(nextPackageString)
    }
  }

  fetchResults = (packageString: string) => {
    const startTime = Date.now()

    API.getInfo(packageString)
      .then(results => {
        this.fetchSimilarPackages(packageString)

        if (this.activeQuery !== packageString) return

        const newPackageString = `${results.name}@${results.version}`
        this.setState(
          {
            inputInitialValue: newPackageString,
            results,
          },
          () => {
            Router.replace(`/package/${newPackageString}`)
            addToRecentSearches(results.name!, results.version!)
          }
        )

        Analytics.searchSuccess({
          packageName: packageString,
          timeTaken: Date.now() - startTime,
        })
      })
      .catch(err => {
        this.setState({
          resultsError: err,
          resultsPromiseState: 'rejected',
        })
        console.error(err)

        Analytics.searchFailure({
          packageName: packageString,
          timeTaken: Date.now() - startTime,
        })
      })
  }

  fetchHistory = (packageString: string) => {
    API.getHistory(packageString, 15)
      .then(results => {
        if (this.activeQuery !== packageString) return

        this.setState({
          historicalResultsPromiseState: 'fulfilled',
          historicalResults: results,
        })
      })
      .catch(err => {
        this.setState({ historicalResultsPromiseState: 'rejected' })
        console.error('Fetching history failed:', err)
      })
  }

  exportToImage = async () => {
    if (this.statsContainerRef.current) {
      const node = this.statsContainerRef.current
      const { results } = this.state
      const fileName = `bundlephobia-${results.name || 'package'}.png`

      try {
        const dataUrl = await toPng(node, {
          backgroundColor:
            document.documentElement.getAttribute('data-theme') === 'dark'
              ? '#1a1a1a'
              : '#ffffff',
          style: {
            padding: '20px',
            borderRadius: '12px',
          },
        })
        const link = document.createElement('a')
        link.download = fileName
        link.href = dataUrl
        link.click()
      } catch (err) {
        console.error('oops, something went wrong!', err)
      }
    }
  }

  fetchSimilarPackages = (packageString: string) => {
    const { name } = parsePackageString(packageString)
    const promises: Promise<any>[] = []

    API.getSimilar(name)
      .then(result => {
        if (result.category.label) {
          if (result.category.score < 12) return

          result.category.similar.forEach((packageName: string) => {
            promises.push(API.getInfo(packageName))
          })

          Promise.allSettled(promises).then(results => {
            if (this.activeQuery !== packageString) return

            this.setState({
              similarPackagesCategory: result.category.label,
              similarPackages: results
                .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
                .map(result => result.value),
            })
          })
        }
      })
      .catch(err => {
        this.setState({ historicalResultsPromiseState: 'rejected' })
        console.error(err)
      })
  }

  handleSearchSubmit = (packageString: string) => {
    Analytics.performedSearch(packageString)
    const normalizedQuery = packageString.trim()

    this.setState(
      {
        results: {},
        historicalResultsPromiseState: 'pending',
        resultsPromiseState: 'pending',
        inputInitialValue: normalizedQuery,
        similarPackages: [],
        historicalResults: [],
      },
      () => {
        Router.push(`/package/${normalizedQuery}`)
        Analytics.pageView('package result')
        this.activeQuery = normalizedQuery
        this.fetchResults(normalizedQuery)
        this.fetchHistory(normalizedQuery)
      }
    )
  }

  handleProgressDone = () => {
    this.setState({
      resultsPromiseState: 'fulfilled',
    })
  }

  formatHistoricalResults = () => {
    const { results, historicalResults } = this.state
    const totalVersions: Record<string, any> = {
      ...historicalResults,
      [results.version!]: results,
    }

    const formattedResults = Object.keys(totalVersions).map(version => {
      if (!totalVersions[version] || Object.keys(totalVersions[version]).length === 0) {
        return { version, disabled: true }
      }
      return {
        version,
        size: totalVersions[version].size,
        gzip: totalVersions[version].gzip,
        hasSideEffects: totalVersions[version].hasSideEffects,
        hasJSModule: totalVersions[version].hasJSModule,
        hasJSNext: totalVersions[version].hasJSNext,
        isModuleType: totalVersions[version].isModuleType,
        disabled: false,
      }
    })
    const sorted = formattedResults.sort((packageA, packageB) =>
      semver.compare(packageA.version, packageB.version)
    )
    return typeof window !== 'undefined' && window.innerWidth < 640
      ? sorted.slice(-10)
      : sorted
  }

  handleBarClick = (reading: any) => {
    const { results } = this.state

    const packageString = `${results.name}@${reading.version}`
    this.setState({ inputInitialValue: packageString })
    this.handleSearchSubmit(packageString)

    Analytics.graphBarClicked({
      packageName: packageString,
      isDisabled: reading.disabled,
    })
  }

  getMetaTags = () => {
    const { router } = this.props
    const { resultsPromiseState, results } = this.state
    let name: string, version: string | undefined, formattedSizeText: string, formattedGZIPSizeText: string

    if (resultsPromiseState === 'fulfilled') {
      name = results.name!
      version = results.version
      const formattedSize = formatSize(results.size!)
      const formattedGZIPSize = formatSize(results.gzip!)
      formattedSizeText = `${formattedSize.size.toFixed(1)} ${
        formattedSize.unit
      }`
      formattedGZIPSizeText = `${formattedGZIPSize.size.toFixed(1)} ${
        formattedGZIPSize.unit
      }`
    } else {
      const packageInfo = parsePackageString(this.getPackageString(router))
      name = packageInfo.name
      version = packageInfo.version || undefined
      formattedSizeText = ''
      formattedGZIPSizeText = ''
    }

    const origin =
      typeof window === 'undefined'
        ? 'https://bundlephobia.com'
        : window.location.origin

    const title = version ? `${name} v${version}` : name
    const description =
      resultsPromiseState === 'fulfilled'
        ? `Size of ${title} is ${formattedSizeText} (minified), and ${formattedGZIPSizeText} when compressed using GZIP. ${DEFAULT_DESCRIPTION_START}`
        : `Find the size of javascript package ${title}. ${DEFAULT_DESCRIPTION_START}`

    return (
      <MetaTags
        title={`${title} ❘ Bundlephobia`}
        image={
          origin + `/api/stats-image?name=${name}&version=${version}&wide=true`
        }
        description={description}
        twitterDescription="Insights into npm packages"
        canonicalPath={`/package/${name}`}
        isLargeImage={true}
      />
    )
  }

  render(): ReactNode {
    const {
      inputInitialValue,
      resultsPromiseState,
      resultsError,
      historicalResultsPromiseState,
      results,
      similarPackages,
      similarPackagesCategory,
    } = this.state

    const { errorName, errorBody, errorDetails } =
      resolveBuildError(resultsError)

    const referenceSpeedInfoText = (speed: number, units: string) =>
      `Download Speed: ⬇️ ${speed} ${units}.\nExclusive of HTTP request latency.`

    const getQuickStatsBar = () =>
      resultsPromiseState === 'fulfilled' && (
        <QuickStatsBar
          description={results.description || ''}
          dependencyCount={results.dependencyCount || 0}
          hasSideEffects={results.hasSideEffects || false}
          isTreeShakeable={
            !!(results.hasJSModule || results.hasJSNext || results.isModuleType)
          }
          repository={results.repository || ''}
          name={results.name || ''}
        >
           <button 
              className="result-page__share-btn"
              onClick={this.exportToImage}
              title="Share as Image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span>Share Image</span>
            </button>
        </QuickStatsBar>
      )

    return (
      <ResultLayout>
        {this.getMetaTags()}
        <section className="content-container-wrap">
          <div className="content-container">
            <AutocompleteInputBox footer={getQuickStatsBar()}>
              <AutocompleteInput
                key={inputInitialValue}
                initialValue={inputInitialValue}
                className="result-page__search-input"
                onSearchSubmit={this.handleSearchSubmit}
                renderAsH1={true}
              />
            </AutocompleteInputBox>
            {resultsPromiseState === 'pending' && (
              <div className="result-pending">
                <BuildProgressIndicator
                  isDone={!!results.version}
                  onDone={this.handleProgressDone}
                />
              </div>
            )}
            {resultsPromiseState === 'fulfilled' &&
              results.ignoredMissingDependencies &&
              results.ignoredMissingDependencies.length > 0 && (
                <Warning>
                  Ignoring the size of missing{' '}
                  {results.ignoredMissingDependencies.length > 1
                    ? 'dependencies'
                    : 'dependency'}{' '}
                  &nbsp;
                  <code>
                    {arrayToSentence(results.ignoredMissingDependencies)}
                  </code>
                  .
                  <a
                    href="https://github.com/pastelsky/bundlephobia#1-why-does-search-for-package-x-throw-missingdependencyerror-"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read more
                  </a>
                </Warning>
              )}
            {resultsPromiseState === 'fulfilled' && (
              <div className="content-split-container" ref={this.statsContainerRef}>
                <div className="stats-container">
                  <div className="size-container">
                    <div className="size-container__header">
                      <h3> Bundle Size </h3>
                    </div>
                    <div className="size-stats">
                      <Stat
                        value={results.size!}
                        type={Stat.type.SIZE}
                        label="Minified"
                      />
                      <Stat
                        value={results.gzip!}
                        type={Stat.type.SIZE}
                        label="Minified + Gzipped"
                      />
                    </div>
                  </div>
                  <div className="time-container">
                    <h3> Download Time </h3>
                    <div className="time-stats">
                      <Stat
                        value={getTimeFromSize(results.gzip!).threeG}
                        type={Stat.type.TIME}
                        label="Slow 3G"
                        infoText={referenceSpeedInfoText(
                          DownloadSpeed.THREE_G,
                          'kB/s'
                        )}
                      />
                      <Stat
                        value={getTimeFromSize(results.gzip!).fourG}
                        type={Stat.type.TIME}
                        label="Emerging 4G"
                        infoText={referenceSpeedInfoText(
                          DownloadSpeed.FOUR_G,
                          'kB/s'
                        )}
                      />
                    </div>
                  </div>
                </div>
                <div className="chart-container">
                  {historicalResultsPromiseState === 'fulfilled' && (
                    <BarGraph
                      onBarClick={this.handleBarClick}
                      readings={this.formatHistoricalResults()}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {resultsPromiseState === 'rejected' && (
            <div className="result-error">
              <EmptyBox className="result-error__img" />
              <h2 className="result-error__code">{errorName}</h2>
              <p
                className="result-error__message"
                dangerouslySetInnerHTML={{ __html: errorBody || '' }}
              />
              {errorDetails && (
                <details className="result-error__details">
                  <summary> Stacktrace</summary>
                  <pre>{errorDetails}</pre>
                </details>
              )}
            </div>
          )}
          {resultsPromiseState === 'fulfilled' &&
            results.dependencySizes &&
            results.dependencySizes.length > 0 && (
              <div className="content-container">
                <TreemapSection
                  packageName={results.name!}
                  packageSize={results.size!}
                  dependencySizes={results.dependencySizes}
                />
              </div>
            )}

          {resultsPromiseState === 'fulfilled' && (
            <div className="content-container">
              <ExportAnalysisSection result={results as any} />
            </div>
          )}

          {resultsPromiseState === 'fulfilled' && similarPackages.length > 0 && (
            <div className="content-container">
              <SimilarPackagesSection
                category={similarPackagesCategory}
                packs={similarPackages}
                comparisonGzip={results.gzip!}
              />
            </div>
          )}

          {resultsPromiseState === 'fulfilled' &&
            parsePackageString(results.name!).scoped && (
              <InterLinksSection packageName={results.name!} />
            )}
        </section>
      </ResultLayout>
    )
  }
}

export const getServerSideProps = () => {
  return { props: {} }
}

export default withRouter(ResultPage as any)
