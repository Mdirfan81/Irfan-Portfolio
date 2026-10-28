import { useEffect, useState } from 'react'

/**
 * Tracks which section id is currently dominant in the viewport, for nav
 * highlighting. Uses IntersectionObserver rather than scroll math so it stays
 * off the main thread. Empty while none of them is — over the hero, say — so
 * nothing is marked current that is not on screen.
 */
export function useActiveSection(ids: readonly string[], rootMargin = '-45% 0px -50% 0px') {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    // Everything in the band right now; the band is thin, so this is almost
    // always one section, and two only for a moment at a boundary.
    const inBand = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id)
          else inBand.delete(entry.target.id)
        }
        setActive(ids.find((id) => inBand.has(id)) ?? '')
      },
      { rootMargin, threshold: 0 },
    )

    const nodes = ids.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n)
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [ids, rootMargin])

  return active
}
