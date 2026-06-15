import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import API from '../../api'

const MOCK_TRENDING = [
  { name: 'react' },
  { name: 'lodash' },
  { name: 'moment' },
  { name: 'typescript' },
  { name: 'zod' },
  { name: 'next' },
  { name: 'axios' },
  { name: 'three' },
]

export function GlobalRecentSearches() {
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecent() {
      try {
        const data = await fetch('/api/recent?limit=10').then(res => res.json())

        // Ensure data is an array
        const recentArray = Array.isArray(data)
          ? data
          : Object.keys(data || {})
              .map(key => ({
                name: key,
                ...data[key],
              }))
              .sort((a, b) => (b.lastSearched || 0) - (a.lastSearched || 0))

        if (recentArray.length === 0) {
          setRecent(MOCK_TRENDING)
        } else {
          setRecent(recentArray)
        }
      } catch (e) {
        console.error(
          'Failed to fetch global recent searches, using fallbacks',
          e,
        )
        setRecent(MOCK_TRENDING)
      } finally {
        setLoading(false)
      }
    }
    fetchRecent()
  }, [])

  if (loading) {
    return null
  }

  return (
    <div className="global-recent-searches">
      <div className="global-recent-searches__header">
        <h3>Trending Packages</h3>
      </div>
      <ul className="global-recent-searches__list">
        {recent.map((search, i) => (
          <li key={`${search.name}-${i}`}>
            <Link href={`/package/${search.name}`}>
              <div className="global-recent-searches__item">
                <span className="global-recent-searches__name">
                  {search.name}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
