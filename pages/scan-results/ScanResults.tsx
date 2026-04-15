import Router, { withRouter, NextRouter } from 'next/router'
import React, { Component, ReactNode } from 'react'
import Analytics from '../../client/analytics'
import FlipMove from 'react-flip-move'
import cx from 'classnames'

const PromiseQueue = require('p-queue')
const queryString = require('query-string')
import Stat from '../../client/components/Stat'
import Link from 'next/link'
import ResultLayout from '../../client/components/ResultLayout'
import { parsePackageString } from '../../utils/common.utils'

import API from '../../client/api'
import { getTimeFromSize } from '../../utils'

interface Result {
  size: number
  gzip: number
  version?: string
}

interface ScanPackage {
  promiseState: 'pending' | 'fulfilled' | 'rejected'
  packageString: string
  name: string
  version?: string
  result?: Result
  error?: {
    code: string
    message: string
  }
}

interface ResultCardProps {
  pack: ScanPackage
  index: number
}

class ResultCard extends Component<ResultCardProps> {
  render(): ReactNode {
    const { pack, index } = this.props

    let content: ReactNode

    switch (pack.promiseState) {
      case 'pending':
        content = (
          <div className="scan-results__loading-text">Calculating &hellip;</div>
        )
        break

      case 'fulfilled':
        if (pack.result) {
          content = (
            <div className="scan-results__stat-container">
              <Stat
                className="scan-results__stat-item"
                value={pack.result.size}
                type={Stat.type.SIZE}
                label="Min"
                compact
              />
              <Stat
                className="scan-results__stat-item"
                value={pack.result.gzip}
                type={Stat.type.SIZE}
                label="Min + GZIP"
                compact
              />
              <Stat
                className="scan-results__stat-item"
                value={getTimeFromSize(pack.result.gzip).threeG}
                type={Stat.type.TIME}
                label="Slow 3G"
                compact
              />
              <Stat
                className="scan-results__stat-item"
                value={getTimeFromSize(pack.result.gzip).fourG}
                type={Stat.type.TIME}
                label="Emerging 4G"
                compact
              />
            </div>
          )
        }
        break

      case 'rejected':
        if (pack.error) {
          content = (
            <details className="scan-results__error-text">
              <summary> {pack.error.code}</summary>
              <p dangerouslySetInnerHTML={{ __html: pack.error.message }} />
            </details>
          )
        }
        break
    }

    return (
      <li
        className={cx('scan-results__item', {
          'scan-results__item--loading': pack.promiseState === 'pending',
          'scan-results__item--error': pack.promiseState === 'rejected',
        })}
      >
        <div className="scan-results__index">
          <span> {index + 1}. </span>
        </div>
        <div className="scan-results__name" data-name={pack.name}>
          <Link href={`/package/${pack.packageString}`}>
            <span className="scan-results__package-name"> {pack.name}</span>
            <div>
              {pack.version && (
                <span className="scan-results__package-version">
                  v{pack.version}
                </span>
              )}
            </div>
          </Link>
        </div>
        {content}
      </li>
    )
  }
}

interface ScanResultsProps {
  router: NextRouter
}

interface ScanResultsState {
  packages: ScanPackage[]
  sortMode: string | undefined
}

class ScanResults extends Component<ScanResultsProps, ScanResultsState> {
  constructor(props: ScanResultsProps) {
    super(props)

    const { router } = this.props
    const sortMode = router.query.sortMode as string | undefined
    const packageStrings = (router.query.packages as string) || ''
    const packages = packageStrings
      .split(',')
      .map(str => str.trim())
      .filter(Boolean)
      .map(str => ({
        promiseState: 'pending' as const,
        packageString: str,
        ...parsePackageString(str),
      }))

    this.state = { packages, sortMode }
  }

  // Disables Next.js's Automatic Static Optimization
  // which causes query params to be empty
  // see https://nextjs.org/docs/routing/dynamic-routes#caveats
  static async getInitialProps() {
    return {}
  }

  componentDidMount() {
    const { packages } = this.state
    const queue = new PromiseQueue({ concurrency: 3 })
    const startTime = Date.now()

    Analytics.pageView('scan results')

    packages.forEach(pack => {
      queue.add(() => {
        const start = Date.now()

        return API.getInfo(pack.packageString)
          .then(result => {
            this.updatePackageState(pack, {
              promiseState: 'fulfilled',
              version: result.version,
              result,
            })

            Analytics.searchSuccess({
              packageName: pack.packageString,
              timeTaken: Date.now() - start,
            })
          })
          .catch(({ error }) => {
            console.error(error)
            this.updatePackageState(pack, {
              promiseState: 'rejected',
              error,
            })

            Analytics.searchFailure({
              packageName: pack.packageString,
              timeTaken: Date.now() - start,
            })
          })
      })
    })

    queue.onIdle().then(() => {
      const successfulBuildCount = packages.reduce(
        (curSum, nextPack) =>
          nextPack.promiseState === 'fulfilled' ? curSum + 1 : curSum,
        0
      )

      Analytics.scanCompleted({
        successRatio: successfulBuildCount / packages.length,
        timeTaken: Date.now() - startTime,
      })
    })
  }

  updatePackageState(pack: ScanPackage, state: Partial<ScanPackage>) {
    const { packages } = this.state
    const packIndex = packages.findIndex(
      ({ packageString }) => packageString === pack.packageString
    )

    if (packIndex === -1) return

    packages[packIndex] = {
      ...packages[packIndex],
      ...state,
    } as ScanPackage

    this.setState({ packages: [...packages] })
  }

  setParamsAndState = (sortMode: string) => {
    const updatedQuery = { ...this.props.router.query, sortMode }
    Router.replace(
      `/scan-results?${queryString.stringify(updatedQuery, { encode: false })}`
    )

    this.setState({ sortMode: sortMode })
  }

  handleSortAlphabetic = () => {
    this.setParamsAndState('alphabetic')
  }

  handleSortSize = () => {
    this.setParamsAndState('size')
  }

  sortPackages = () => {
    const { packages, sortMode } = this.state
    let sortedList = [...packages]

    if (sortMode === 'size') {
      sortedList = sortedList.sort((packA, packB) => {
        const packASize = packA.result ? packA.result.gzip : 0
        const packBSize = packB.result ? packB.result.gzip : 0

        return packBSize - packASize
      })
    } else {
      sortedList = sortedList.sort((packA, packB) =>
        packA.name.localeCompare(packB.name)
      )
    }
    return sortedList
  }

  render(): ReactNode {
    const { sortMode } = this.state
    const sortedPackages = this.sortPackages()

    const totalMinSize = sortedPackages.reduce(
      (curTotal, pack) => curTotal + (pack.result ? pack.result.size : 0),
      0
    )

    const totalGZIPSize = sortedPackages.reduce(
      (curTotal, pack) => curTotal + (pack.result ? pack.result.gzip : 0),
      0
    )

    return (
      <ResultLayout className="scan-results">
        <h1> Results</h1>
        <div className="scan-results__sort-panel">
          <label> Sort By: </label>
          <button
            className={cx({
              'scan-results__sort--selected': sortMode === 'alphabetic',
            })}
            onClick={this.handleSortAlphabetic}
          >
            Name: A &rarr; Z
          </button>
          <button
            className={cx({
              'scan-results__sort--selected': sortMode === 'size',
            })}
            onClick={this.handleSortSize}
          >
            Size: High &rarr; Low
          </button>
        </div>
        <ul className="scan-results__container">
          <FlipMove
            // @ts-ignore - types might be missing or different
            duration={350}
            easing="cubic-bezier(0.175, 0.885, 0.325, 1.040)"
          >
            {sortedPackages.map((pack, index) => (
              <ResultCard pack={pack} index={index} key={pack.name} />
            ))}
          </FlipMove>
          <li className="scan-results__item scan-results__item--total">
            <div className="scan-results__name">Total</div>
            <div className="scan-results__stat-container">
              <Stat
                className="scan-results__stat-item"
                value={totalMinSize}
                type={Stat.type.SIZE}
                label="Min"
                compact
              />
              <Stat
                className="scan-results__stat-item"
                value={totalGZIPSize}
                type={Stat.type.SIZE}
                label="Min + GZIP"
                compact
              />
              <Stat
                className="scan-results__stat-item"
                value={totalGZIPSize / 1024 / 30}
                type={Stat.type.TIME}
                label="2G Edge"
                compact
              />
              <Stat
                className="scan-results__stat-item"
                value={totalGZIPSize / 1024 / 50}
                type={Stat.type.TIME}
                label="Slow 3G"
                compact
              />
            </div>
          </li>
        </ul>
        <div className="scan-results__note">
          <b>NOTE:</b> Sizes shown are when importing the complete package.
          Actual sizes might be smaller if only parts of the package are used or
          if packages share common dependencies. This is not a substitute for
          bundle size.
        </div>
      </ResultLayout>
    )
  }
}

export default withRouter(ScanResults as any)
