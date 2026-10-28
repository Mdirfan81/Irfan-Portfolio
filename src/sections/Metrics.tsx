import { useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { metrics } from '@/data/metrics'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
import { EASE_OUT, viewportOnce } from '@/lib/motion'
import styles from './Metrics.module.css'

/** The figure being read, large, counting up to itself each time it changes. */
function BigFigure({ index }: { index: number }) {
  const reduced = useReducedMotion() ?? false
  const metric = metrics[index]
  const count = useMotionValue(reduced ? metric.value : 0)
  const shown = useTransform(count, (v) => Math.round(v))

  useEffect(() => {
    if (reduced) {
      count.set(metric.value)
      return
    }
    count.set(0)
    const run = animate(count, metric.value, { duration: 0.9, ease: EASE_OUT })
    return () => run.stop()
  }, [count, metric.value, reduced])

  return (
    <div className={styles.big} aria-hidden="true">
      <motion.p
        key={index}
        className={`${styles.bigValue} gradient-text`}
        initial={{ opacity: 0, y: reduced ? 0 : 24, filter: reduced ? 'none' : 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: reduced ? 0 : 0.6, ease: EASE_OUT }}
      >
        <motion.span>{shown}</motion.span>
        {metric.suffix}
      </motion.p>
      <p className={styles.bigLabel}>
        <span className={styles.bigIndex}>{String(index + 1).padStart(2, '0')}</span>
        {metric.label}
      </p>
    </div>
  )
}

/**
 * The impact figures as a list, with the one being read shown large beside it.
 * Which one that is follows the scroll — the row crossing the middle of the
 * screen — and a hover overrides it.
 */
export function Metrics() {
  const reduced = useReducedMotion() ?? false
  const [active, setActive] = useState(0)
  const rows = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const i = rows.current.indexOf(entry.target as HTMLLIElement)
          if (i >= 0) setActive(i)
        }
      },
      // A thin band across the middle of the screen.
      { rootMargin: '-48% 0px -48% 0px' },
    )
    rows.current.forEach((row) => row && observer.observe(row))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="section" id="impact" aria-labelledby="impact-title">
      <div className={`shell ${styles.grid}`}>
        <div className={styles.aside}>
          <Eyebrow>Impact</Eyebrow>
          <SplitText className="section-title" id="impact-title" text="Numbers from shipped work" />
          <FadeText className="section-lede">
            Every figure comes from production systems — measured before and after, not
            estimated.
          </FadeText>
          <BigFigure index={active} />
        </div>

        <ol className={styles.list}>
          {metrics.map((m, i) => {
            // A percentage fills its share of the meter; anything else fills it all.
            const share = m.suffix.trim() === '%' ? m.value / 100 : 1
            return (
              <motion.li
                key={m.label}
                ref={(el) => {
                  rows.current[i] = el
                }}
                className={`glass ${styles.row} ${active === i ? styles.rowActive : ''}`}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                initial={{ opacity: 0, x: reduced ? 0 : 48 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: reduced ? 0.2 : 0.8, ease: EASE_OUT }}
              >
                <span className={styles.value}>
                  {m.value}
                  {m.suffix}
                </span>
                <div>
                  <h3 className={styles.label}>{m.label}</h3>
                  <p className={styles.detail}>{m.detail}</p>
                </div>
                <span className={styles.meter} aria-hidden="true">
                  <motion.span
                    className={styles.meterFill}
                    initial={{ scaleX: reduced ? share : 0 }}
                    whileInView={{ scaleX: share }}
                    viewport={viewportOnce}
                    transition={{ duration: reduced ? 0 : 1.2, delay: reduced ? 0 : 0.3, ease: EASE_OUT }}
                  />
                </span>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
