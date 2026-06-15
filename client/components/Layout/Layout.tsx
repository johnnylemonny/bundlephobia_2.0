import React, { Component } from 'react'
import Link from 'next/link'

import API from '../../api'
import HeartIcon from '../../assets/heart.svg'
import DigitalOceanLogoIcon from '../../assets/digital-ocean-logo.svg'

const Heart = (HeartIcon as any).default || HeartIcon
const DigitalOceanLogo =
  (DigitalOceanLogoIcon as any).default || DigitalOceanLogoIcon

if (typeof window !== 'undefined') {
  console.log('Layout SVG Debug (Client):', {
    HeartIcon: typeof HeartIcon,
    HeartIconKeys:
      typeof HeartIcon === 'object' ? Object.keys(HeartIcon as any) : 'n/a',
    Heart: typeof Heart,
    DigitalOceanLogoIcon: typeof DigitalOceanLogoIcon,
    DigitalOceanLogo: typeof DigitalOceanLogo,
  })
} else {
  console.log('Layout SVG Debug (Server):', {
    HeartIcon: typeof HeartIcon,
    Heart: typeof Heart,
  })
}

import { AnnouncementBanner } from '../AnnouncementBanner'
import { WithClassName } from '../../../types'
import JohnnyLemonnyBanner from '../../assets/johnnylemonny-banner.png'

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

    console.log('Layout rendering SVG check:', { Heart, DigitalOceanLogo })

    const HeartIcon = Heart
    const DOLogo = DigitalOceanLogo

    return (
      <section className="layout">
        <AnnouncementBanner />
        <main className={className}>{children}</main>

        <footer>
          <div className="footer__recent-search-bar">
            <div className="footer__recent-search-bar__wrap">
              <h4>Recent searches</h4>
              <ul className="footer__recent-search-list">
                {recentSearches.map(search => (
                  <li key={search}>
                    <Link href={`/package/${search}`}>{search}</Link>
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
                  <DOLogo className="footer__sponsor-logo" />
                </a>
              </div>
            </div>
            <div className="footer__credits">
              <HeartIcon className="footer__credits__heart" />️
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
              <div className="footer__johnnylemonny">
                <a
                  href="https://github.com/johnnylemonny"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={
                      typeof JohnnyLemonnyBanner === 'object'
                        ? (JohnnyLemonnyBanner as any).src
                        : JohnnyLemonnyBanner
                    }
                    alt="johnnylemonny"
                    className="footer__johnnylemonny-banner"
                  />
                </a>
              </div>
            </div>
          </section>
        </footer>
      </section>
    )
  }
}
