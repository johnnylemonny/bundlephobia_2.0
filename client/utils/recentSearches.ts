const RECENT_SEARCHES_KEY = 'bp_recent_searches'
const MAX_RECENT_SEARCHES = 10

export function addToRecentSearches(name: string, version: string) {
  if (typeof window === 'undefined') return

  const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
  let prev = []
  if (saved) {
    try {
      prev = JSON.parse(saved)
    } catch (e) {}
  }
  
  // @ts-ignore
  const filtered = prev.filter(s => s.name !== name)
  const updated = [{ name, version, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_SEARCHES)
  
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event('recent-searches-update'))
}
