export type Theme = 'light' | 'dark'

export const STORAGE_KEY = 'bundlephobia-theme'

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme
  if (savedTheme) return savedTheme

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(STORAGE_KEY, theme)
}
