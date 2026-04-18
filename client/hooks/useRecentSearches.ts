import { useState, useEffect, useCallback } from 'react'

const RECENT_SEARCHES_KEY = 'bp_recent_searches'
const MAX_RECENT_SEARCHES = 10

export type RecentSearch = {
  name: string
  version: string
  timestamp: number
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse recent searches', e)
        }
      }
    }

    window.addEventListener('storage', handleUpdate)
    window.addEventListener('recent-searches-update', handleUpdate)
    handleUpdate()

    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('recent-searches-update', handleUpdate)
    }
  }, [])

  const addSearch = useCallback((name: string, version: string) => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
    let prev: RecentSearch[] = []
    if (saved) {
      try {
        prev = JSON.parse(saved)
      } catch (e) {}
    }
    const filtered = prev.filter(s => s.name !== name)
    const updated = [{ name, version, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('recent-searches-update'))
  }, [])

  const clearSearches = useCallback(() => {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
    window.dispatchEvent(new Event('recent-searches-update'))
  }, [])

  return {
    recentSearches,
    addSearch,
    clearSearches,
  }
}
