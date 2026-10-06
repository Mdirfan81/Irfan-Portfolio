import { useRef } from 'react'
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import styles from './Marquee.module.css'

/** Share of the strip's own width it drifts per second when the page is still. */
const DRIFT = 50 / 38
/** Extra drift for each pixel-per-second of scroll speed. */
const BOOST = 0.0014

/**
 * A strip of labels that never stops moving — and takes its pace and its
 * direction from the scroll, so it reads as part of the page going by rather
 * than a loop playing on top of it. Decorative: the same items are listed in
 * full, as real content, elsewhere in the section.
 */
export function Marquee({ items }: { items: string[] }) {
  const reduced = useReducedMotion() ?? false
  const strip = useRef<HTMLDivElement>(null)
  // Nothing is worked out for a strip nobody can see.
  const visible = useInView(strip)
  const paused = useRef(false)
  const direction = useRef(-1)

  // The strip is the list twice over, so sliding by half its width lands on an
  // identical frame: the position only ever needs to live in -50…0.
  const offset = useMotionValue(0)
  const x = useTransform(offset, (value) => `${value}%`)

  const { scrollY } = useScroll()
  const velocity = useSpring(useVelocity(scrollY), { stiffness: 300, damping: 50 })

  useAnimationFrame((_, delta) => {
    if (reduced || !visible || paused.current) return
    const speed = velocity.get()
    if (speed > 1) direction.current = -1
    else if (speed < -1) direction.current = 1

    const step = (DRIFT + Math.min(Math.abs(speed), 4000) * BOOST) * (delta / 1000)
    const next = offset.get() + direction.current * step
    offset.set(next <= -50 ? next + 50 : next > 0 ? next - 50 : next)
  })

  return (
    <div
      ref={strip}
      className={styles.marquee}
      aria-hidden="true"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
    >
      <motion.div className={styles.track} style={reduced ? undefined : { x }}>
        {[...items, ...items].map((item, i) => (
          <span className={styles.tick} key={`${item}-${i}`}>
            <span className={styles.tickDot} />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
