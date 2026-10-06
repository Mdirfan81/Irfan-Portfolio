import { useEffect, type CSSProperties } from 'react'
import styles from './JourneyLoader.module.css'

type JourneyLoaderProps = {
  /** The scene has drawn its first frame, or given up: let go and fade out. */
  done: boolean
  /** Called once the exit has played, so the loader can be unmounted. */
  onGone: () => void
}

/** Matches the exit transition in the stylesheet, with a little to spare. */
const EXIT_MS = 1100

const TONES = ['var(--c-accent)', 'var(--c-cyan)', 'var(--c-violet)']
const frac = (n: number) => n - Math.floor(n)

// Spread by the golden angle, with reach and pace taken from the index rather
// than from a random number, so the swarm is the same on every load.
const MOTES = Array.from({ length: 14 }, (_, i) => {
  const seconds = 2.3 + frac(i * 0.37) * 1.5
  return {
    '--angle': `${(i * 137.508) % 360}deg`,
    '--reach': 0.6 + frac(i * 0.618) * 0.4,
    '--size': `${4 + frac(i * 0.29) * 4}px`,
    '--tone': TONES[i % TONES.length],
    '--time': `${seconds}s`,
    // Negative, so the loop is already in full flow on the first frame.
    '--delay': `${-frac(i * 0.61) * seconds}s`,
  } as CSSProperties
})

/**
 * Holds the constellation's place while three.js is still on its way: loose
 * stars are reeled in to a bubble at the spot where the first figure will
 * gather, then the bubble lets go as the real stars arrive.
 *
 * Everything here animates transform and opacity only. The main thread is at
 * its busiest exactly while this is on screen, parsing the 3D chunk and
 * compiling shaders, and the compositor keeps these moving through that.
 */
export function JourneyLoader({ done, onGone }: JourneyLoaderProps) {
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(onGone, EXIT_MS)
    return () => clearTimeout(timer)
  }, [done, onGone])

  return (
    <div className={`${styles.loader} ${done ? styles.done : ''}`} aria-hidden="true">
      <span className={styles.glow} />
      <span className={`${styles.orbit} ${styles.orbitOuter}`} />
      <span className={`${styles.orbit} ${styles.orbitInner}`} />
      {MOTES.map((mote, i) => (
        <span key={i} className={styles.mote} style={mote} />
      ))}
      <span className={styles.core} />
    </div>
  )
}
