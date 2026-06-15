import React, { useState, useRef, useEffect } from 'react'
import Analytics from '../../analytics'

const McpNavPopup = () => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const setupSnippet = `{
  "mcpServers": {
    "bundlephobia": {
      "url": "https://bundlephobia.com/api/mcp"
    }
  }
}`

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const onToggle = () => {
    const nextOpen = !open
    setOpen(nextOpen)
    Analytics.mcpHeaderClicked({ open: nextOpen })
  }

  const handleMouseLeave = () => {
    setOpen(false)
  }

  const onCopySnippet = async () => {
    await navigator.clipboard.writeText(setupSnippet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
    Analytics.mcpSetupSnippetCopied()
  }

  return (
    <div className="mcp-nav" ref={containerRef}>
      <button className="mcp-nav__trigger" onClick={onToggle} type="button">
        MCP
      </button>
      {open && (
        <div className="mcp-nav__popup">
          <div className="mcp-nav__header">
            <h4 className="mcp-nav__title">Model Context Protocol (MCP)</h4>
            <button
              className="mcp-nav__close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <p className="mcp-nav__desc">
            Copy this configuration into your Cursor or Claude Desktop setup to
            query bundle sizes in your IDE.
          </p>
          <div className="mcp-nav__code-wrap">
            <button
              className={`mcp-nav__copy-icon ${
                copied ? 'mcp-nav__copy-icon--copied' : ''
              }`}
              type="button"
              onClick={onCopySnippet}
              aria-label="Copy MCP snippet"
              title="Copy"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"
                />
              </svg>
            </button>
            <pre className="mcp-nav__result">{setupSnippet}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default McpNavPopup
