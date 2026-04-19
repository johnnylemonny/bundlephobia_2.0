import React, { Component } from 'react'
import Link from 'next/link'

import API from '../../api'
import HeartIcon from '../../assets/heart.svg'
import DigitalOceanLogoIcon from '../../assets/digital-ocean-logo.svg'

import { resolveComponent } from '../../../utils/resolveComponent'

const Heart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 428 364" fill="currentColor" {...props}>
    <path d="M402.8 43.48C339.3-38.96 214.33 9.68 214.33 93.4c0-83.72-124.96-132.36-188.46-49.92C-19 101.74-2.95 189.95 72.22 267.33c34.77 35.8 82.2 69.28 142.12 96.4C403.74 278 468.42 128.7 402.8 43.5z" fillRule="evenodd"/>
  </svg>
)
const DigitalOceanLogo = resolveComponent(DigitalOceanLogoIcon)

if (typeof window !== 'undefined') {
  console.log('Layout SVG Debug (Client):', { 
    HeartIconType: typeof HeartIcon, 
    HeartType: typeof Heart,
    DigitalOceanLogoType: typeof DigitalOceanLogo
  })
}

import { AnnouncementBanner } from '../AnnouncementBanner'
import { WithClassName } from '../../../types'

type LayoutProps = React.PropsWithChildren & WithClassName

type LayoutState = {
  recentSearches: string[]
}

export default class Layout extends Component<LayoutProps, LayoutState> {
  state = {
    recentSearches: [],
  }

  componentDidMount() {
    API.getRecentSearches(5).then(searches => {
      this.setState({
        recentSearches: Object.keys(searches),
      })
    })
  }

  render() {
    const { children, className } = this.props
    const { recentSearches } = this.state

    return (
      <section className="layout">
        <AnnouncementBanner />
        <section className={className}>{children}</section>

        <footer>
          <div className="footer__recent-search-bar">
            <div className="footer__recent-search-bar__wrap">
              <h4>Recent Searches</h4>
              <ul className="footer__recent-search-list">
                {(recentSearches.length > 0 ? recentSearches : ['react', 'lodash', 'next', 'axios', 'express']).map(search => (
                  <li key={search}>
                    <Link href={`/package/${search}`}>
                      {search}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <section className="footer__split">
            <div className="footer__description">
              <h3> What does Bundlephobia do? </h3>
              <p>
                JavaScript bloat is more real today than it ever was. Sites
                continuously get bigger as more (often redundant) libraries are
                thrown to solve new problems. Until of-course, the{' '}
                <i> big rewrite </i>
                happens.
              </p>
              <p>
                Bundlephobia lets you understand the performance cost of
                <code>npm&nbsp;install</code> ing a new npm package before it
                becomes a part of your bundle. Analyze size, compositions and
                exports
              </p>
              <p>
                Credits to{' '}
                <a href="https://twitter.com/thekitze" target="_blank">
                  {' '}
                  @thekitze{' '}
                </a>
                for the name.
              </p>
              <div className="footer__hosting-credits">
                Hosted on
                <a href="https://digitalocean.com" target="_blank">
                  <DigitalOceanLogo className="footer__sponsor-logo" />
                </a>
              </div>
            </div>
            <div className="footer__credits">
              <Heart className="footer__credits__heart" />️
              <a
                className="footer__credits-profile"
                target="_blank"
                href="https://github.com/pastelsky"
              >
                @pastelsky
              </a>
              <a
                target="_blank"
                href="https://github.com/pastelsky/bundlephobia"
              >
                <button className="footer__credits-fork-button">
                  Star on GitHub
                </button>
              </a>
            </div>
          </section>
        </footer>
      </section>
    )
  }
}
