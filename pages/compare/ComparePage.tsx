import React, { PureComponent } from 'react'
import Head from 'next/head'
import Router, { withRouter, NextRouter } from 'next/router'
import Link from 'next/link'

import Layout from '../../client/components/Layout'
import { AutocompleteInput } from '../../client/components/AutocompleteInput'
import { parsePackageString } from '../../utils/common.utils'
import API from '../../client/api'
import { PackageResult } from '../../types'
import { GitHubIcon } from '../../client/components/Icons/GitHubIcon'
import { ThemeToggle } from '../../client/components/ThemeToggle/ThemeToggle'
import { getTimeFromSize, DownloadSpeed } from '../../utils'


interface State {
  package1: Partial<PackageResult> | null
  package2: Partial<PackageResult> | null
  loading1: boolean
  loading2: boolean
  error1: any
  error2: any
}

interface Props {
  router: NextRouter
}

class ComparePage extends PureComponent<Props, State> {
  state: State = {
    package1: null,
    package2: null,
    loading1: false,
    loading2: false,
    error1: null,
    error2: null,
  }

  componentDidMount() {
    const { p1, p2 } = this.props.router.query
    if (p1) this.fetchPackage(1, p1 as string)
    if (p2) this.fetchPackage(2, p2 as string)
  }

  componentDidUpdate(prevProps: Props) {
    const { p1: prevP1, p2: prevP2 } = prevProps.router.query
    const { p1, p2 } = this.props.router.query

    if (p1 !== prevP1 && p1) this.fetchPackage(1, p1 as string)
    if (p2 !== prevP2 && p2) this.fetchPackage(2, p2 as string)
  }

  fetchPackage = (index: 1 | 2, name: string) => {
    const loadingKey = `loading${index}` as const
    const packageKey = `package${index}` as const
    const errorKey = `error${index}` as const

    this.setState({ [loadingKey]: true, [errorKey]: null } as any)

    API.getInfo(name)
      .then(results => {
        this.setState({ [packageKey]: results, [loadingKey]: false } as any)
      })
      .catch(err => {
        this.setState({ [errorKey]: err, [loadingKey]: false } as any)
      })
  }

  handleSearchSubmit = (index: 1 | 2) => (packageString: string) => {
    const { p1, p2 } = this.props.router.query
    const normalizedQuery = packageString.trim().toLowerCase()
    
    const newQuery = { ...this.props.router.query }
    if (index === 1) newQuery.p1 = normalizedQuery
    else newQuery.p2 = normalizedQuery

    Router.push({
      pathname: '/compare',
      query: newQuery,
    })
  }

  renderStatColumn = (pkg: Partial<PackageResult> | null, loading: boolean, error: any) => {
    if (loading) return <div className="compare__column loading">Loading...</div>
    if (error) return <div className="compare__column error">Error loading package</div>
    if (!pkg) return <div className="compare__column empty">Select a package</div>

    return (
      <div className="compare__column">
        <h2 className="compare__package-name">{pkg.name}<span>@{pkg.version}</span></h2>
        <div className="compare__stats">
          <Stat value={pkg.size!} type="size" label="Minified" compact />
          <Stat value={pkg.gzip!} type="size" label="Minified + Gzipped" compact />
          <Stat 
            value={getTimeFromSize(pkg.gzip!).threeG} 
            type="time" 
            label="Slow 3G" 
            compact 
          />
        </div>
      </div>
    )
  }

  render() {
    const { package1, package2, loading1, loading2, error1, error2 } = this.state
    const { p1, p2 } = this.props.router.query

    return (
      <Layout className="compare-page">
        <Head>
          <title>Compare Packages | Bundlephobia</title>
        </Head>
        <div className="page-container">
          <header className="page-header">
            <Link href="/">
              <div className="logo-small">
                <span>Bundle</span>
                <span className="logo-small__alt">Phobia</span>
              </div>
            </Link>
            <section className="page-header--right-section">
              <ul className="page-header__quicklinks">
                <li>
                  <Link href="/scan">Scan</Link>
                </li>
              </ul>
              <ThemeToggle />
              <a
                href="https://github.com/pastelsky/bundlephobia"
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
              >
                <GitHubIcon />
              </a>
            </section>
          </header>

          <div className="compare__content">
            <div className="compare__search-bar">
               <AutocompleteInput
                initialValue={(p1 as string) || ''}
                placeholder="Search package..."
                onSearchSubmit={this.handleSearchSubmit(1)}
              />
              <div className="compare__vs">vs</div>
               <AutocompleteInput
                initialValue={(p2 as string) || ''}
                placeholder="Search package..."
                onSearchSubmit={this.handleSearchSubmit(2)}
              />
            </div>

            <div className="compare__results">
              {this.renderStatColumn(package1, loading1, error1)}
              <div className="compare__divider" />
              {this.renderStatColumn(package2, loading2, error2)}
            </div>
          </div>
        </div>
      </Layout>
    )
  }
}

export default withRouter(ComparePage)
