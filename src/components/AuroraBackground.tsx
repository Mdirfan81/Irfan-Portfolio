import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import styles from './AuroraBackground.module.css'

/**
 * Decorative depth layer: drifting aurora blooms, a fine grid, grain and a
 * pointer-tracked highlight. Purely presentational — hidden from assistive tech.
 *
 * The pointer highlight writes CSS custom properties straight onto the node
 * instead of going through state, so moving the mouse never triggers a render.
 */
export function AuroraBackground() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [pointerActive, setPointerActive] = useState(false)

  useEffect(() => {
    if (reduced) return
    // Coarse pointers (touch) get no spotlight — there is no hover to track.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let frame = 0
    const onMove = (e: PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const node = ref.current
        if (!node) return
        node.style.setProperty('--mx', `${(e.clientX / window.innerWidth) * 100}%`)
        node.style.setProperty('--my', `${(e.clientY / window.innerHeight) * 100}%`)
        setPointerActive(true)
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [reduced])

  return (
    <div ref={ref} className={styles.field} aria-hidden="true" data-testid="aurora">
      <div className={`${styles.bloom} ${styles.bloom1}`} />
      <div className={`${styles.bloom} ${styles.bloom2}`} />
      <div className={`${styles.bloom} ${styles.bloom3}`} />
      <div className={styles.grid} />
      <div className={`${styles.spotlight} ${pointerActive ? styles.spotlightOn : ''}`} />
      <div className={styles.grain} />
      <div className={styles.vignette} />
    </div>
  )
}
