import { useEffect, useRef, type RefObject } from 'react'
import { STATIONS } from '@/three/stations'

export type JourneyInput = {
  /** Scroll offset in viewport heights, so speed reads the same on any screen. */
  y: number
  /**
   * Position along the stations as a float: 2.0 is the third section's top
   * crossing the middle of the viewport, 2.5 is halfway through that section.
   */
  station: number
  /** Pointer position in -1…1. */
  px: number
  py: number
}

/**
 * Scroll and pointer state for the 3D scene, kept in a ref rather than in
 * React state. The scene reads it every frame; React never re-renders because
 * the mouse moved or the page scrolled.
 */
export function useJourneyInput(): RefObject<JourneyInput> {
  const ref = useRef<JourneyInput>({ y: 0, station: 0, px: 0, py: 0 })

  useEffect(() => {
    let frame = 0

    const readScroll = () => {
      frame = 0
      const viewport = window.innerHeight || 1
      ref.current.y = window.scrollY / viewport

      // Sections differ in height, so the station is measured from where each
      // one actually sits rather than assumed from overall scroll progress.
      const probe = viewport / 2
      let station = 0
      for (let i = 0; i < STATIONS.length; i++) {
        const top = document.getElementById(STATIONS[i].id)?.getBoundingClientRect().top
        if (top === undefined || top > probe) break
        const next = document.getElementById(STATIONS[i + 1]?.id ?? '')?.getBoundingClientRect().top
        station = next === undefined || next <= top ? i : i + Math.min((probe - top) / (next - top), 1)
      }

      // A short last section never reaches the middle of the viewport, so the
      // end of the page pulls the journey through to its final station.
      const remaining = document.documentElement.scrollHeight - viewport - window.scrollY
      const last = STATIONS.length - 1
      ref.current.station =
        remaining < probe ? Math.max(station, last - Math.max(remaining, 0) / probe) : station
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(readScroll)
    }

    const onPointer = (e: PointerEvent) => {
      ref.current.px = (e.clientX / window.innerWidth) * 2 - 1
      ref.current.py = (e.clientY / window.innerHeight) * 2 - 1
    }

    readScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return ref
}
