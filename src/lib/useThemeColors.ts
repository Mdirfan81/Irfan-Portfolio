import { useEffect, useState } from 'react'

export type ThemeColors = {
  bg: string
  accent: string
  violet: string
  cyan: string
  mint: string
  text: string
}

const FALLBACK: ThemeColors = {
  bg: '#070b14',
  accent: '#6aa6ff',
  violet: '#a98bff',
  cyan: '#4fd8e8',
  mint: '#5eead4',
  text: '#e8edf7',
}

function read(): ThemeColors {
  if (typeof window === 'undefined') return FALLBACK
  const cs = getComputedStyle(document.documentElement)
  const get = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb
  return {
    bg: get('--c-bg', FALLBACK.bg),
    accent: get('--c-accent', FALLBACK.accent),
    violet: get('--c-violet', FALLBACK.violet),
    cyan: get('--c-cyan', FALLBACK.cyan),
    mint: get('--c-mint', FALLBACK.mint),
    text: get('--c-text', FALLBACK.text),
  }
}

/**
 * Design tokens, resolved to real colour values for Three.js. Re-reads whenever
 * the theme attribute flips, so the 3D scene recolours with the rest of the page
 * instead of staying stuck in whichever theme loaded first.
 */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(read)

  useEffect(() => {
    const update = () => setColors(read())
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', update)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', update)
    }
  }, [])

  return colors
}
