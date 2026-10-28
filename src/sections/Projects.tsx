import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'
import { ArrowUpRight, Star } from 'lucide-react'
import { projectFilters, projects, type Project, type ProjectFilter } from '@/data/projects'
import { profile } from '@/data/profile'
import { TiltCard } from '@/components/TiltCard'
import { RollText } from '@/components/RollText'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
import { useDragScroll } from '@/lib/useDragScroll'
import { useMedia } from '@/lib/useMedia'
import styles from './Projects.module.css'

/** Share of a screen's height held still before the row starts to move. */
const HOLD = 0.2

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const Icon = project.icon
  return (
    <TiltCard
      className={`${styles.card} ${project.featured ? styles.featuredCard : ''}`}
      intensity={6}
    >
      <article className={styles.article}>
        <div className={styles.cardHead}>
          <span className={styles.icon} aria-hidden="true">
            <Icon size={20} />
          </span>
          <span className={styles.index} aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        {project.featured ? (
          <span className={styles.star}>
            <Star size={11} aria-hidden />
            Featured · {project.domain}
          </span>
        ) : (
          <span className={styles.domain}>{project.domain}</span>
        )}
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
      </article>
    </TiltCard>
  )
}

/**
 * Selected work, as one row of cards the scroll carries sideways: the section
 * holds still on screen and every pixel scrolled down moves the row a pixel
 * across, with a thin track underneath showing how far through it is.
 *
 * Where the screen is small, is a touch screen, or motion is reduced, the
 * same row simply scrolls sideways under a finger, with no pinning. A tablet
 * is wide enough to pin, but there a finger swipes the row sideways, and a
 * pinned row ignored that and moved only as the page was scrolled down.
 */
export function Projects() {
  const reduced = useReducedMotion() ?? false
  const roomy = useMedia(
    '(min-width: 760px) and (min-height: 560px) and (hover: hover) and (pointer: fine)',
  )
  const pinned = roomy && !reduced
  const [filter, setFilter] = useState<ProjectFilter>('All')

  const visible = useMemo(
    () => (filter === 'All' ? projects : projects.filter((p) => p.domain === filter)),
    [filter],
  )
  const countFor = (f: ProjectFilter) =>
    f === 'All' ? projects.length : projects.filter((p) => p.domain === f).length

  const runRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const [size, setSize] = useState({ screen: 800, overflow: 0 })

  useEffect(() => {
    const view = viewRef.current
    const track = trackRef.current
    if (!view || !track || typeof ResizeObserver === 'undefined') return
    const measure = () =>
      setSize({
        screen: window.innerHeight,
        overflow: Math.max(track.scrollWidth - view.clientWidth, 0),
      })
    const observer = new ResizeObserver(measure)
    observer.observe(view)
    observer.observe(track)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [pinned])

  // The run is the hold plus the row's overflow, so a pixel scrolled down is a
  // pixel the row moves across.
  const holdPx = size.screen * HOLD
  const runPx = holdPx + size.overflow

  const { scrollYProgress } = useScroll({ target: runRef, offset: ['start start', 'end end'] })
  const across = useTransform(scrollYProgress, (p) =>
    size.overflow ? Math.min(Math.max((p * runPx - holdPx) / size.overflow, 0), 1) : 0,
  )
  const trackX = useTransform(across, (a) => -a * size.overflow)

  // As a card is carried off to the left it dissolves into the star field:
  // 0 while it is still to the right of where the row starts, 1 once it has
  // gone most of its own width past that line. Written straight onto each
  // card as --gone, so nothing re-renders; the stylesheet turns it into dots.
  const dissolve = (x: number) => {
    const track = trackRef.current
    if (!track) return
    const start = parseFloat(getComputedStyle(track).paddingLeft) || 0
    for (const slot of Array.from(track.children) as HTMLElement[]) {
      const left = slot.offsetLeft + x
      const gone = pinned ? Math.min(Math.max((start - left) / (slot.offsetWidth * 0.85), 0), 1) : 0
      if (gone > 0) {
        slot.style.setProperty('--gone', gone.toFixed(3))
        slot.dataset.gone = gone >= 1 ? 'all' : 'some'
      } else if (slot.dataset.gone) {
        slot.style.removeProperty('--gone')
        delete slot.dataset.gone
      }
    }
  }
  useDragScroll(viewRef, !pinned)
  useMotionValueEvent(trackX, 'change', dissolve)
  // Cards move without the row moving when the filter changes or the window
  // resizes, so work it out again then too.
  useEffect(() => dissolve(trackX.get()))

  return (
    <section className={styles.projects} id="projects" aria-labelledby="projects-title">
      <div
        ref={runRef}
        className={pinned ? styles.run : styles.flat}
        style={pinned ? { height: `calc(100svh + ${runPx}px)` } : undefined}
      >
        <div className={styles.pin}>
          <div className={`shell ${styles.head}`}>
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
          </div>

          <p aria-live="polite" className="visually-hidden">
            {visible.length} project{visible.length === 1 ? '' : 's'} shown
            {filter === 'All' ? '' : ` in ${filter}`}.
          </p>

          {/* Unpinned, the row is a scroller of its own. Lenis would take a
              trackpad's sideways swipe over it for the page and cancel it, so
              sideways gestures are left to the browser. It takes focus, so
              the arrow keys scroll it, and a mouse can drag it. */}
          <div
            ref={viewRef}
            className={styles.view}
            data-lenis-prevent-horizontal={pinned ? undefined : true}
            {...(pinned
              ? {}
              : { tabIndex: 0, role: 'region', 'aria-label': 'Projects, scrolls sideways' })}
          >
            <motion.ul
              ref={trackRef}
              className={styles.track}
              style={pinned ? { x: trackX } : undefined}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((project) => (
                  <motion.li
                    key={project.id}
                    className={styles.slot}
                    layout={!reduced}
                    initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
                    transition={{ duration: reduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className={styles.dissolve}>
                      <ProjectCard project={project} index={projects.indexOf(project)} />
                    </div>
                  </motion.li>
                ))}
                <motion.li key="more" className={styles.slot} layout={!reduced}>
                  <div className={styles.dissolve}>
                    <a
                      className={`${styles.more} roll-host`}
                      href={profile.links.github}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className={`${styles.moreBig} gradient-text`} aria-hidden="true">
                        More on GitHub
                      </span>
                      <span className={styles.moreLabel}>
                        <RollText text="Browse the code" />
                        <ArrowUpRight size={16} aria-hidden />
                      </span>
                      <span className="visually-hidden">(opens in a new tab)</span>
                    </a>
                  </div>
                </motion.li>
              </AnimatePresence>
            </motion.ul>
          </div>

          {pinned && (
            <div className={`shell ${styles.progress}`} aria-hidden="true">
              <motion.span className={styles.progressFill} style={{ scaleX: across }} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
