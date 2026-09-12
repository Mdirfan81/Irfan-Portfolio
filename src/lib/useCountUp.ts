import { useEffect, useRef, useState } from 'react'

const SUPPORTS_IO = typeof IntersectionObserver !== 'undefined'

/**
 * Counts from 0 up to `target` the first time the element scrolls into view.
 *
 * When motion is reduced — or IntersectionObserver is missing (jsdom, older
 * browsers) — the final value is returned straight from render rather than
 * being pushed through state, so there is no cascading re-render and no
 * flash of "0".
 */
export function useCountUp(target: number, reduced: boolean, duration = 1200) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [animated, setAnimated] = useState(0)
  const animate = !reduced && SUPPORTS_IO

  useEffect(() => {
    if (!animate) return
    const node = ref.current
    if (!node) return

    let raf = 0
    let start = 0

    const step = (now: number) => {
      if (!start) start = now
      const p = Math.min((now - start) / duration, 1)
      // easeOutCubic — quick arrival, gentle settle
      setAnimated(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          raf = requestAnimationFrame(step)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(node)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, duration, animate])

  return { ref, value: animate ? animated : target }
}
