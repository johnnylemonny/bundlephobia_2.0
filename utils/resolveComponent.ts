import React from 'react'

/**
 * Robustly resolves a component from a module import.
 * Handles default exports, named exports, and deep nesting common in SVG/Asset loaders.
 */
export const resolveComponent = (comp: any): React.ComponentType<any> => {
  if (!comp) return () => null
  
  // Directly a function
  if (typeof comp === 'function') return comp
  
  // Default export is a function
  if (comp.default && typeof comp.default === 'function') return comp.default
  
  // Nested default export (sometimes seen with some loader configurations)
  if (comp.default && comp.default.default && typeof comp.default.default === 'function') {
    return comp.default.default
  }
  
  // Try to find any function in the object (fallback)
  const firstFunction = Object.values(comp).find(val => typeof val === 'function') as React.ComponentType<any>
  if (firstFunction) return firstFunction

  return () => null
}
