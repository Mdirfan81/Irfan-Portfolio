import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Menu, X, Moon, Sun, ArrowUpRight } from 'lucide-react'
import { navItems, profile } from '@/data/profile'
import { useActiveSection } from '@/lib/useActiveSection'
import { useTheme } from '@/lib/useTheme'
import styles from './Nav.module.css'

const SECTION_IDS = navItems.map((n) => n.id)

export function Nav() {
  const reduced = useReducedMotion() ?? false
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(SECTION_IDS)
  const { theme, toggle } = useTheme()

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
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={`shell ${styles.inner}`}>
          <a href="#top" className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              MI
            </span>
            <span className={styles.brandText}>
              {profile.name}
              <span className={styles.brandRole}>{profile.discipline}</span>
            </span>
          </a>

          <nav className={styles.links} aria-label="Sections">
            {navItems.map((item) => {
              const isActive = active === item.id
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className={styles.pill}
                      transition={
                        reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }
                      }
                    />
                  )}
                  {item.label}
                </a>
              )
            })}
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
