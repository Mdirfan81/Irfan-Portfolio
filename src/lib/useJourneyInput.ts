import { useEffect, useRef, type RefObject } from 'react'

export type JourneyInput = {
  /** 0 at the top of the document, 1 at the bottom. */
  progress: number
  /** Pointer position in -1…1, already smoothed. */
  px: number
  py: number
}

/**
 * Scroll and pointer state for the 3D scene, kept in a ref rather than in
 * React state. The scene reads it every frame; React never re-renders because
 * the mouse moved or the page scrolled.
 */
export function useJourneyInput(): RefObject<JourneyInput> {
  const ref = useRef<JourneyInput>({ progress: 0, px: 0, py: 0 })

  useEffect(() => {
    let frame = 0

    const readScroll = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      ref.current.progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
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
