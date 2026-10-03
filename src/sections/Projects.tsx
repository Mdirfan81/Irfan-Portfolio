import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Star } from 'lucide-react'
import { projectFilters, projects, type ProjectFilter } from '@/data/projects'
import { TiltCard } from '@/components/TiltCard'
import { Reveal } from '@/components/Reveal'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
import styles from './Projects.module.css'

export function Projects() {
  const reduced = useReducedMotion() ?? false
  const [filter, setFilter] = useState<ProjectFilter>('All')

  const visible = useMemo(
    () => (filter === 'All' ? projects : projects.filter((p) => p.domain === filter)),
    [filter],
  )

  const countFor = (f: ProjectFilter) =>
    f === 'All' ? projects.length : projects.filter((p) => p.domain === f).length

  return (
    <section className="section" id="projects" aria-labelledby="projects-title">
      <div className="shell">
        <div className={styles.head}>
          <div>
            <Eyebrow>Selected work</Eyebrow>
            <SplitText
              className="section-title"
              id="projects-title"
              text="Things I built and still stand behind"
            />
            <FadeText className="section-lede">
              {projects.length} products across industrial automation, banking and education —
              filter by the domain you care about.
            </FadeText>
          </div>
        </div>

        <Reveal delay={0.35}>

          <div className={styles.filters} role="group" aria-label="Filter projects by domain">
            {projectFilters.map((f) => {
              const isActive = filter === f
              return (
                <button
                  key={f}
                  type="button"
                  className={`${styles.filter} ${isActive ? styles.filterActive : ''}`}
                  onClick={() => setFilter(f)}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.span
                      layoutId="filter-pill"
                      className={styles.filterPill}
                      transition={
                        reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }
                      }
                    />
                  )}
                  {f}
                  <span className={styles.count}>{countFor(f)}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <p aria-live="polite" className="visually-hidden">
          {visible.length} project{visible.length === 1 ? '' : 's'} shown
          {filter === 'All' ? '' : ` in ${filter}`}.
        </p>

        <motion.div className={styles.grid} layout={!reduced}>
          <AnimatePresence mode="popLayout">
            {visible.map((project) => {
              const Icon = project.icon
              return (
                <motion.article
                  key={project.id}
                  layout={!reduced}
                  initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                  transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <TiltCard
                    className={`${styles.card} ${project.featured ? styles.featuredCard : ''}`}
                    intensity={6}
                  >
                    <div className={styles.cardHead}>
                      <span className={styles.icon} aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      {project.featured ? (
                        <span className={styles.star}>
                          <Star size={11} aria-hidden />
                          Featured
                        </span>
                      ) : (
                        <span className={styles.domain}>{project.domain}</span>
                      )}
                    </div>
                    <div>
                      <h3 className={styles.title}>{project.title}</h3>
                      <p className={styles.org}>{project.org}</p>
                    </div>
                    <p className={styles.summary}>{project.summary}</p>
                    <ul className={styles.tags}>
                      {project.tags.map((t) => (
                        <li className="chip chip--mono" key={t}>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </TiltCard>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && <p className={`glass ${styles.empty}`}>No projects in this area yet.</p>}
      </div>
    </section>
  )
}
