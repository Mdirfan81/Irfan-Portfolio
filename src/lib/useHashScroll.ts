import { useEffect } from 'react'

/**
 * The app renders client-side, so a deep link like `/#projects` arrives before
 * the target element exists and the browser's own fragment scroll is a no-op.
 * This re-runs it once React has painted, and again on any hashchange.
 */
export function useHashScroll() {
  useEffect(() => {
    const scrollToHash = (behavior: ScrollBehavior) => {
      const id = window.location.hash.slice(1)
      if (!id) return
      const el = document.getElementById(decodeURIComponent(id))
      el?.scrollIntoView({ behavior, block: 'start' })
    }

    const raf = requestAnimationFrame(() => scrollToHash('auto'))
    const onHashChange = () => scrollToHash('smooth')
    window.addEventListener('hashchange', onHashChange)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])
}
