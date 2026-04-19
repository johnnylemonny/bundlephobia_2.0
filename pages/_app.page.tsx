import React from 'react'
import Head from 'next/head'
import { AppProps } from 'next/app'
import '../stylesheets/index.scss'

import { getInitialTheme, setTheme, STORAGE_KEY } from '../client/utils/theme'

function App({ Component, pageProps }: AppProps) {
  React.useEffect(() => {
    // 1. Set initial theme
    const initialTheme = getInitialTheme()
    setTheme(initialTheme, false) // Don't save auto-detected theme to localStorage

    // 2. Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if the user hasn't manually set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light', false)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title key="title">Bundlephobia ❘ cost of adding a npm package</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default App
