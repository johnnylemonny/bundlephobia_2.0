import React, { Component, ReactNode } from 'react'
import Analytics from '../../client/analytics'
import ResultLayout from '../../client/components/ResultLayout'
import Separator from '../../client/components/Separator'
import MetaTags from '../../client/components/MetaTags'
import scanBlacklist from '../../client/config/scanBlacklist'
import Dropzone from 'react-dropzone'
import Router from 'next/router'
import * as semver from 'semver'

interface Package {
  name: string
  versionRange: string
  resolvedVersion: string
}

interface State {
  packages: Package[] | null
  selectedPackages: { name: string; resolvedVersion: string }[]
}

export default class Scan extends Component<{}, State> {
  state: State = {
    packages: null,
    selectedPackages: [],
  }

  packageSelectionContainer: HTMLUListElement | null = null

  componentDidMount() {
    Analytics.pageView('scan')
  }

  resolveVersionFromRange = (range: string): string => {
    const rangeSet = new semver.Range(range).set
    // @ts-ignore - semver types can be tricky with internal structures
    return rangeSet[0][0].semver.version
  }

  setSelectedPackages = () => {
    if (!this.packageSelectionContainer) return

    const checkedInputs =
      this.packageSelectionContainer.querySelectorAll('input:checked')

    const selectedPackages = Array.from(checkedInputs).map(input => {
      const { value } = input as HTMLInputElement
      const [name, resolvedVersion] = value.split('#')
      return { name, resolvedVersion }
    })

    this.setState({ selectedPackages })
  }

  handleSelectionChange = () => {
    this.setSelectedPackages()
  }

  handleDropAccepted = ([file]: File[]) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = reader.result as string
        const json = JSON.parse(result)
        const packages = Object.keys(json.dependencies || {})
          .filter(packageName => {
            const versionRange = json.dependencies[packageName]
            return semver.valid(versionRange) || semver.validRange(versionRange)
          })
          .map(packageName => {
            const versionRange = json.dependencies[packageName]

            return {
              name: packageName,
              versionRange,
              resolvedVersion: this.resolveVersionFromRange(versionRange),
            }
          })

        this.setState({ packages }, this.setSelectedPackages)

        Analytics.scanPackageJsonDropped(packages.length)
      } catch (err) {
        this.showInvalidFileError()
      }
    }

    try {
      reader.readAsBinaryString(file)
    } catch (err) {
      console.error(err)
      this.showInvalidFileError()
    }
  }

  handleDropRejected = () => {
    this.showInvalidFileError()
  }

  handleScanClick = () => {
    const { selectedPackages } = this.state
    const query = selectedPackages
      .map(pack => `${pack.name}@${pack.resolvedVersion}`)
      .join(',')
    Router.push(`/scan-results?packages=${query}`)

    Analytics.performedScan()
  }

  handleResetClick = () => {
    this.setState({ packages: null, selectedPackages: [] })
  }

  showInvalidFileError() {
    alert('Could not parse the `package.json` file.')

    Analytics.scanParseError()
  }

  render(): ReactNode {
    let content: ReactNode
    const { packages, selectedPackages } = this.state

    if (!packages) {
      content = (
        <div>
          <Dropzone
            // @ts-ignore - react-dropzone types might differ between versions
            className="scan__dropzone"
            onDropAccepted={this.handleDropAccepted}
            onDropRejected={this.handleDropRejected}
            multiple={false}
            accept="application/json"
          >
            <p>
              Drop a <code> package.json </code> file here
            </p>
            <Separator />
            <button className="scan__btn">
              Upload <code> package.json </code>
            </button>
          </Dropzone>
        </div>
      )
    } else {
      content = (
        <div>
          <header className="scan__selection-header">
            <h1 className="scan__page-title"> Select packages to scan </h1>
            <button className="scan__btn" onClick={this.handleScanClick}>
              Scan {selectedPackages.length} packages
            </button>
            <button className="scan__btn" onClick={this.handleResetClick}>
              Reset
            </button>
          </header>
          <ul
            className="scan__package-container"
            ref={pc => (this.packageSelectionContainer = pc)}
          >
            {packages.map(({ name, versionRange, resolvedVersion }) => (
              <li className="scan__package-item" key={name}>
                <label>
                  <input
                    type="checkbox"
                    defaultChecked={
                      !scanBlacklist.some(regex => regex.test(name))
                    }
                    value={`${name}#${resolvedVersion}`}
                    onChange={this.handleSelectionChange}
                  />
                  <span className="scan__package-item-title">
                    <span>{name}</span>
                    <span className="scan__package-item-version">
                      {versionRange} &rarr; {resolvedVersion}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return (
      <ResultLayout className="scan-page">
        <MetaTags
          title="Scan package.json ❘ Bundlephobia"
          canonicalPath="/scan"
          description="Scan dependencies in your package.json to find the largest and heaviest npm packages in your frontend javascript bundle."
        />
        {content}
      </ResultLayout>
    )
  }
}

export const getServerSideProps = () => {
  return { props: {} }
}
