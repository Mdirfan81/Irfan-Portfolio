import { useEffect, useState } from 'react'

/**
 * Tracks which section id is currently dominant in the viewport, for nav
 * highlighting. Uses IntersectionObserver rather than scroll math so it stays
 * off the main thread.
 */
export function useActiveSection(ids: readonly string[], rootMargin = '-45% 0px -50% 0px') {
  const [active, setActive] = useState<string>(ids[0] ?? '')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin, threshold: [0, 0.25, 0.5, 1] },
    )

    const nodes = ids.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n)
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [ids, rootMargin])

  return active
}
