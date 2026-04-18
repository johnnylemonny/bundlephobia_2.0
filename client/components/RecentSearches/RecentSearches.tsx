import React from 'react'
import Link from 'next/link'
import { useRecentSearches } from '../../hooks/useRecentSearches'

export function RecentSearches() {
  const { recentSearches, clearSearches } = useRecentSearches()

  if (recentSearches.length === 0) {
    return null
  }

  return (
    <div className="recent-searches">
      <div className="recent-searches__header">
        <h3>Recent Searches</h3>
        <button className="recent-searches__clear" onClick={clearSearches}>
          Clear
        </button>
      </div>
      <ul className="recent-searches__list">
        {recentSearches.map(search => (
          <li key={`${search.name}@${search.version}`}>
            <Link href={`/package/${search.name}@${search.version}`}>
              <div className="recent-searches__item">
                <span className="recent-searches__name">{search.name}</span>
                <span className="recent-searches__version">v{search.version}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
