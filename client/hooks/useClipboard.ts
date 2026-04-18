import { useState, useCallback } from 'react'

export function useClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback((text: string) => {
    if (!navigator.clipboard) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err)
      }
      document.body.removeChild(textArea)
      return
    }

    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      err => {
        console.error('Async: Could not copy text: ', err)
      }
    )
  }, [])

  return { copied, copy }
}
