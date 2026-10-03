import { experience } from '@/data/experience'
import { Reveal } from '@/components/Reveal'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
import styles from './Experience.module.css'

export function Experience() {
  return (
    <section className="section" id="experience" aria-labelledby="experience-title">
      <div className="shell">
        <Eyebrow>Experience</Eyebrow>
        <SplitText className="section-title" id="experience-title" text="6+ Years, Four Teams" />
        <FadeText className="section-lede">
          From an internship in Hyderabad to leading frontend work for an industrial
          automation group in Dubai.
        </FadeText>

        <ol className={styles.timeline}>
          {experience.map((role, i) => (
            <li className={styles.row} key={role.id}>
              <span
                className={`${styles.node} ${role.current ? styles.nodeCurrent : ''}`}
                aria-hidden="true"
              />
              <Reveal delay={i * 0.04}>
                <article className={`glass ${styles.card}`}>
                  <div className={styles.head}>
                    <h3 className={styles.company}>{role.company}</h3>
                    <span className={styles.period}>{role.period}</span>
                  </div>

                  <div className={styles.meta}>
                    <span className={styles.title}>{role.title}</span>
                    <span className={styles.location}>{role.location}</span>
                    {role.current && <span className={styles.badge}>Current</span>}
                  </div>

                  <ul className={styles.bullets}>
                    {role.bullets.map((b) => (
                      <li className={styles.bullet} key={b}>
                        {b}
                      </li>
                    ))}
                  </ul>

                  <ul className={styles.stack}>
                    {role.stack.map((s) => (
                      <li className="chip chip--mono" key={s}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
