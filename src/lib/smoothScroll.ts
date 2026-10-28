import { useEffect } from 'react'
import Lenis from 'lenis'
import { usePageLoading } from './pageLoad'

/**
 * Eased, momentum scrolling for the whole page.
 *
 * Lenis moves the real window scroll, a little at a time, so everything that
 * listens to scroll — Motion's useScroll, sticky positioning, the browser's
 * own anchors — keeps working unchanged; it only arrives more gently. Touch
 * keeps the device's own scrolling, which is already smooth and which people
 * expect to feel native.
 */
let lenis: Lenis | null = null

export function getLenis() {
  return lenis
}

/** Runs Lenis for as long as the app is mounted, unless motion is reduced. */
export function useSmoothScroll() {
  const loading = usePageLoading()

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const instance = new Lenis({
      // In-page links ease to their target instead of jumping.
      anchors: true,
      duration: 1.12,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      autoRaf: true,
    })
    lenis = instance

    return () => {
      instance.destroy()
      if (lenis === instance) lenis = null
    }
  }, [])

  // The page holds still while the loader covers it, then lets go.
  useEffect(() => {
    if (loading) lenis?.stop()
    else lenis?.start()
  }, [loading])
}
