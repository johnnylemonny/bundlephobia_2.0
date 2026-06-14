import React, { PureComponent } from 'react'
import Head from 'next/head'
import Router from 'next/router'
import Link from 'next/link'
import Layout from '../../client/components/Layout'
import { AutocompleteInput } from '../../client/components/AutocompleteInput'
import API from '../../client/api'
import { PackageResult } from '../../types'

// @ts-ignore
import GithubLogo from '../../client/assets/github-logo.svg'

interface State {
  results: Partial<PackageResult>
  resultsPromiseState: 'pending' | 'fulfilled' | 'rejected' | null
  resultsError: any
  historicalResultsPromiseState: 'pending' | 'fulfilled' | 'rejected' | null
  inputInitialValue: string
  historicalResults: Record<string, any>
}

export default class ComparePage extends PureComponent<{}, State> {
  state: State = {
    results: {},
    resultsPromiseState: null,
    resultsError: null,
    historicalResultsPromiseState: null,
    inputInitialValue: '',
    historicalResults: {},
  }

  fetchResults = (packageString: string) => {
    API.getInfo(packageString)
      .then(results => {
        const newPackageString = `${results.name}@${results.version}`
        this.setState(
          {
            inputInitialValue: newPackageString,
            results,
          },
          () => {
            Router.replace(`/package/${newPackageString}`)
          },
        )
      })
      .catch(err => {
        this.setState({
          resultsError: err,
          resultsPromiseState: 'rejected',
        })
        console.error(err)
      })
  }

  fetchHistory = (packageString: string) => {
    API.getHistory(packageString, 15)
      .then(results => {
        this.setState({
          historicalResultsPromiseState: 'fulfilled',
          historicalResults: results,
        })
      })
      .catch(err => {
        this.setState({ historicalResultsPromiseState: 'rejected' })
        console.error(err)
      })
  }

  handleSearchSubmit = (packageString: string) => {
    this.setState({
      results: {},
      historicalResultsPromiseState: 'pending',
      resultsPromiseState: 'pending',
    })

    const normalizedQuery = packageString.trim().toLowerCase()

    Router.push(`/package/${normalizedQuery}`)

    this.fetchResults(normalizedQuery)
    this.fetchHistory(normalizedQuery)
  }

  render() {
    const GithubLogoIcon = GithubLogo

    return (
      <Layout className="compare-page">
        <Head>
          <title>Compare Packages | Bundlephobia</title>
        </Head>
        <div className="page-container">
          <header className="result-header">
            <section className="result-header--left-section">
              <Link href="/">
                <div className="logo-small">
                  <span>Bundle</span>
                  <span className="logo-small__alt">Phobia</span>
                </div>
              </Link>
            </section>
            <section className="result-header--right-section">
              <a
                target="_blank"
                href="https://github.com/pastelsky/bundlephobia"
                rel="noreferrer"
              >
                <GithubLogoIcon />
              </a>
            </section>
          </header>
          <div className="compare__search-container">
            <div className="compare__search-inputs">
              <AutocompleteInput
                key={''}
                placeholder="package A"
                initialValue={''}
                onSearchSubmit={this.handleSearchSubmit}
                hideSearchIcon
              />
              <div className="compare__vs">vs</div>
              <AutocompleteInput
                key={'2'}
                placeholder="package B"
                initialValue={''}
                onSearchSubmit={this.handleSearchSubmit}
                hideSearchIcon
              />
            </div>
          </div>
        </div>
      </Layout>
    )
  }
}
