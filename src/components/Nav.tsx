import { useCallback, useEffect, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import type { MotionStyle, MotionValue } from 'motion/react'
import { Menu, X, Moon, Sun, ArrowUpRight } from 'lucide-react'
import { navItems, profile } from '@/data/profile'
import { usePageLoading } from '@/lib/pageLoad'
import { useActiveSection } from '@/lib/useActiveSection'
import { useTheme } from '@/lib/useTheme'
import styles from './Nav.module.css'

const SECTION_IDS = navItems.map((n) => n.id)

// Dock magnification: how far either side of the pointer the swell reaches (px),
// how large the link right under it gets, and the spring every link rides to
// its target size.
const DOCK_REACH = 130
const DOCK_PEAK = 1.35
const DOCK_SPRING = { mass: 0.1, stiffness: 150, damping: 12 }

type DockLinkProps = {
  item: (typeof navItems)[number]
  isActive: boolean
  pointerX: MotionValue<number>
  reduced: boolean
  /** Reports how many extra pixels of width this link's swollen label takes. */
  onSwell: (id: string, px: number) => void
}

function DockLink({ item, isActive, pointerX, reduced, onSwell }: DockLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const labelWidth = useMotionValue(0)

  // A raised-cosine falloff rather than a straight ramp: it is flat at the
  // pointer and flat again at the edge of its reach, so the swell has no kink
  // as it passes from one link to the next.
  const target = useTransform(pointerX, (x) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return 1
    const t = Math.min(Math.abs(x - (box.left + box.width / 2)) / DOCK_REACH, 1)
    return 1 + (DOCK_PEAK - 1) * 0.5 * (1 + Math.cos(Math.PI * t))
  })
  const scale = useSpring(target, DOCK_SPRING)
  useMotionValueEvent(scale, 'change', (s) => onSwell(item.id, (s - 1) * labelWidth.get()))

  // The label is scaled with a transform, which takes up no room, so the
  // stylesheet needs its resting width to open the matching space around it.
  // Measured live because the webfont lands after first paint.
  useEffect(() => {
    const label = labelRef.current
    if (!label || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) =>
      labelWidth.set(entry.borderBoxSize[0].inlineSize),
    )
    observer.observe(label)
    return () => observer.disconnect()
  }, [labelWidth])

  return (
    <motion.a
      ref={ref}
      href={`#${item.id}`}
      className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
      aria-current={isActive ? 'true' : undefined}
      style={{ '--dock-scale': scale, '--dock-label': labelWidth } as MotionStyle}
    >
      {isActive && (
        <motion.span
          layoutId="nav-pill"
          className={styles.pill}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span ref={labelRef} className={styles.linkLabel}>
        {item.label}
      </span>
    </motion.a>
  )
}

export function Nav() {
  const reduced = useReducedMotion() ?? false
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(SECTION_IDS)
  const { theme, toggle } = useTheme()
  // The bar drops in once the loader has lifted, not behind it.
  const waiting = usePageLoading()
  // Where the pointer is along the dock; Infinity while it is somewhere else,
  // which puts every link out of reach and lets them settle back.
  const pointerX = useMotionValue(Infinity)
  // The dock keeps its width while links swell: whatever extra the swollen
  // labels take is shared out evenly as padding given up by every link, so the
  // brand and the actions either side are never pushed.
  const swell = useRef(new Map<string, number>())
  const squeeze = useMotionValue('0px')
  const onSwell = useCallback(
    (id: string, px: number) => {
      swell.current.set(id, px)
      let total = 0
      for (const extra of swell.current.values()) total += extra
      squeeze.set(`${total / (2 * navItems.length)}px`)
    },
    [squeeze],
  )

  // Mouse only: a tap fires pointer events too, but never the leave that would
  // let the dock settle again.
  const onDockPointerMove = (e: PointerEvent) => {
    if (!reduced && e.pointerType === 'mouse') pointerX.set(e.clientX)
  }
  // Keyboard focus swells the dock the same way the pointer does.
  const onDockFocus = (e: FocusEvent<HTMLElement>) => {
    if (reduced || !e.target.matches(':focus-visible')) return
    const box = e.target.getBoundingClientRect()
    pointerX.set(box.left + box.width / 2)
  }
  const releaseDock = () => pointerX.set(Infinity)
  // Under the name: the discipline at the top of the page, then whichever
  // section is on screen — so the capsule always says where you are, including
  // on small screens where the section links are folded away.
  const here = navItems.find((item) => item.id === active)?.label
  const caption = scrolled && here ? here : profile.discipline

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll and close on Escape while the mobile sheet is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <header
        className={`${styles.nav} ${scrolled ? styles.scrolled : ''} ${waiting ? styles.waiting : ''}`}
      >
        <div className={`shell ${styles.inner}`}>
          <a href="#top" className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              MI
            </span>
            <span className={styles.brandText}>
              {profile.name}
              <span className={styles.brandRole}>
                <span className="visually-hidden">{profile.discipline}</span>
                <span key={caption} className={styles.brandCaption} aria-hidden="true">
                  {caption}
                </span>
              </span>
            </span>
          </a>

          <nav
            className={styles.links}
            aria-label="Sections"
            onPointerMove={onDockPointerMove}
            onPointerLeave={releaseDock}
            onFocus={onDockFocus}
            onBlur={releaseDock}
          >
            <motion.div
              className={styles.dock}
              style={{ '--dock-squeeze': squeeze } as MotionStyle}
            >
              {navItems.map((item) => (
                <DockLink
                  key={item.id}
                  item={item}
                  isActive={active === item.id}
                  pointerX={pointerX}
                  reduced={reduced}
                  onSwell={onSwell}
                />
              ))}
            </motion.div>
          </nav>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </button>

            <a className={`btn btn--primary ${styles.cta}`} href="#contact">
              Get in touch
              <ArrowUpRight size={16} aria-hidden />
            </a>

            <button
              type="button"
              className={`${styles.iconBtn} ${styles.menuBtn}`}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className={styles.sheet}
            initial={{ opacity: 0, y: reduced ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {navItems.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={styles.sheetLink}
                onClick={() => setOpen(false)}
              >
                {item.label}
                <span className={styles.sheetIndex}>{String(i + 1).padStart(2, '0')}</span>
              </a>
            ))}
            <div className={styles.sheetFooter}>
              <a className="btn" href={profile.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a className="btn" href={profile.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a className="btn btn--primary" href={`mailto:${profile.email}`}>
                Email me
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
