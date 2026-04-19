import React from 'react'

/**
 * Robustly resolves a component from a module import.
 * Handles default exports, named exports, and deep nesting common in SVG/Asset loaders.
 */
export const resolveComponent = (comp: any): React.ComponentType<any> => {
  if (!comp) return () => null
  
  // 1. Handle SVGR (Direct component or .ReactComponent)
  if (typeof comp === 'function') return comp
  if (comp.ReactComponent) return comp.ReactComponent
  
  // 2. Handle ES Modules with .default
  if (comp.default) {
    if (typeof comp.default === 'function') return comp.default
    if (comp.default.ReactComponent) return comp.default.ReactComponent
  }
  
  // 3. Handle Static Assets (Next.js / Webpack file-loader)
  // If it's a string, it's a URL. If it's an object with .src, it's an asset.
  const src = typeof comp === 'string' ? comp : (comp && comp.src)
  if (typeof src === 'string') {
    return (props: any) => <img src={src} {...props} />
  }

  // Fallback
  return () => null
}
