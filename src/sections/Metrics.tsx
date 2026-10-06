import type { CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import { metrics, type Metric } from '@/data/metrics'
import { TiltCard } from '@/components/TiltCard'
import { Flow } from '@/components/Flow'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
import { useCountUp } from '@/lib/useCountUp'
import styles from './Metrics.module.css'

function MetricCard({ metric }: { metric: Metric }) {
  const reduced = useReducedMotion() ?? false
  const { ref, value } = useCountUp(metric.value, reduced)
  // A percentage fills its share of the track; anything else fills it all.
  const share = metric.suffix.trim() === '%' ? metric.value / 100 : 1

  return (
    <TiltCard className={styles.card} intensity={5}>
      {/* The full figure is exposed to assistive tech up front; the animated
          number is decorative and mirrors it visually. */}
      <p className={styles.value} aria-hidden="true">
        <span ref={ref}>{value}</span>
        {metric.suffix}
      </p>
      <p className={styles.label}>
        <span className="visually-hidden">
          {metric.value}
          {metric.suffix}{' '}
        </span>
        {metric.label}
      </p>
      <p className={styles.detail}>{metric.detail}</p>
      <span className={styles.meter} aria-hidden="true">
        <span className={styles.meterFill} style={{ '--share': share } as CSSProperties} />
      </span>
    </TiltCard>
  )
}

export function Metrics() {
  return (
    <section className="section" id="impact" aria-labelledby="impact-title">
      <div className="shell">
        <Eyebrow>Impact</Eyebrow>
        <SplitText className="section-title" id="impact-title" text="Numbers from shipped work" />
        <FadeText className="section-lede">
          Every figure below comes from production systems — measured before and after, not
          estimated.
        </FadeText>

        <div className={styles.grid}>
          {metrics.map((m) => (
            <Flow key={m.label}>
              <MetricCard metric={m} />
            </Flow>
          ))}
        </div>
      </div>
    </section>
  )
}
