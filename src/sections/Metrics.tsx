import { useReducedMotion } from 'motion/react'
import { metrics, type Metric } from '@/data/metrics'
import { TiltCard } from '@/components/TiltCard'
import { RevealGroup, RevealItem } from '@/components/Reveal'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
import { useCountUp } from '@/lib/useCountUp'
import styles from './Metrics.module.css'

function MetricCard({ metric }: { metric: Metric }) {
  const reduced = useReducedMotion() ?? false
  const { ref, value } = useCountUp(metric.value, reduced)

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

        <RevealGroup className={styles.grid}>
          {metrics.map((m) => (
            <RevealItem key={m.label}>
              <MetricCard metric={m} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
