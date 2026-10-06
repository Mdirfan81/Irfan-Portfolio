import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
/**
 * Holds a theme the visitor picked with the toggle, and nothing else. The
 * older 'mik-theme' key was written on every visit, so it could not tell a
 * choice from a guess; it is no longer read.
 */
const STORAGE_KEY = 'mik-theme-choice'

/** Dark unless the visitor has chosen otherwise — the system theme is not consulted. */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // Private mode or blocked storage — fall through to the default.
  }
  return 'dark'
}

/** Theme state mirrored onto <html data-theme>; an explicit choice is persisted best-effort. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable — the theme still applies for this visit.
    }
  }, [theme])

  return { theme, toggle }
}
