import DOMPurify from 'dompurify'

export interface ParsedPackage {
  name: string
  version: string | null
  scope?: string
  scoped: boolean
}

/**
 * Parses a package string into its constituent parts.
 * Supports scoped packages and versions.
 */
export function parsePackageString(packageString: string): ParsedPackage {
  // Scoped packages
  let name: string,
    version: string | null,
    scope: string | undefined,
    scoped = false
  const lastAtIndex = packageString.lastIndexOf('@')
  const firstSlashIndex = packageString.indexOf('/')

  if (packageString.startsWith('@')) {
    scoped = true
    scope = packageString.substring(1, firstSlashIndex)
    if (lastAtIndex === 0) {
      name = packageString
      version = null
    } else {
      name = packageString.substring(0, lastAtIndex)
      version = packageString.substring(lastAtIndex + 1)
    }
  } else {
    if (lastAtIndex === -1) {
      name = packageString
      version = null
    } else {
      name = packageString.substring(0, lastAtIndex)
      version = packageString.substring(lastAtIndex + 1)
    }
  }

  return { name, version, scope, scoped }
}

/**
 * Returns the number of days between the given date and today.
 */
export function daysFromToday(date: string | number | Date): number {
  const date1 = new Date()
  const date2 = new Date(date)
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Sanitizes HTML string using DOMPurify.
 */
export function sanitizeHTML(html: string): string {
  // Check if we're in a browser environment or node
  if (typeof window === 'undefined') {
    // In node, DOMPurify needs a window object (usually from jsdom)
    // But this utility is used by server as well as client.
    // If used on server, it must be initialized properly.
    // Looking at the original code, it just did require('dompurify').
    // In older versions of dompurify or specific setups, this might work differently.
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'div'],
      ALLOWED_ATTR: [''],
    }) as string
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'div'],
    ALLOWED_ATTR: [''],
  }) as string
}
