import { useRef } from 'react'
import { useScroll } from 'motion/react'
import { profile } from '@/data/profile'
import { Eyebrow, ScrollFill } from '@/components/TextReveal'
import styles from './Statement.module.css'

/**
 * One sentence, held in place while the page scrolls past it and lighting up
 * word by word as it does, ending on its last words in code type.
 */
export function Statement() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.3', 'end end'] })

  return (
    <section
      ref={ref}
      className={styles.statement}
      id="what-i-do"
      aria-labelledby="what-i-do-title"
    >
      <div className={styles.pin}>
        <div className="shell">
          <Eyebrow>{profile.statement.label}</Eyebrow>
          <ScrollFill
            as="h2"
            id="what-i-do-title"
            className={styles.text}
            accentClassName={styles.accent}
            text={profile.statement.text}
            accent={profile.statement.accent}
            progress={scrollYProgress}
          />
        </div>
      </div>
    </section>
  )
}
