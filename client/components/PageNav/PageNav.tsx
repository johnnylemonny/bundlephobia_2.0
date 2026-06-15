import Link from 'next/link'
import React from 'react'
import ThemeToggle from '../ThemeToggle'
import McpNavPopup from '../McpNavPopup/McpNavPopup'
import { GitHubIcon } from '../Icons/GitHubIcon'

type PageNavProps = {
  minimal?: boolean
}

const PageNav = ({ minimal }: PageNavProps) => {
  return (
    <header className="page-header">
      {!minimal && (
        <section className="result-header--left-section">
          <Link href="/">
            <div className="logo-small">
              <span>Bundle</span>
              <span className="logo-small__alt">Phobia</span>
            </div>
          </Link>
        </section>
      )}
      <section className="page-header--right-section">
        <ul className="page-header__quicklinks">
          <li>
            <a
              target="_blank"
              rel="noreferrer noopener"
              href="https://badgen.net/#bundlephobia"
            >
              Badges
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="noreferrer noopener"
              href="https://github.com/sponsors/pastelsky"
            >
              Sponsor
            </a>
          </li>
          <li>
            <Link
              href="/blog"
              className="blog-link disabled"
              style={{
                opacity: 0.4,
                cursor: 'not-allowed',
                pointerEvents: 'none',
              }}
              aria-disabled="true"
            >
              Blog
            </Link>
          </li>
          <li>
            <Link href="/scan" className="scan-link">
              Scan package.json
            </Link>
          </li>
        </ul>
        <McpNavPopup />
        <ThemeToggle />
        <a
          target="_blank"
          rel="noreferrer noopener"
          href="https://github.com/pastelsky/bundlephobia"
          className="github-link"
          title="GitHub Repository"
        >
          <GitHubIcon />
        </a>
      </section>
    </header>
  )
}

export default PageNav
