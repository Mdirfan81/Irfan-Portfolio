import { navItems } from '@/data/profile'
import { useActiveSection } from '@/lib/useActiveSection'
import styles from './StationRail.module.css'

const IDS = navItems.map((n) => n.id)

/**
 * The journey has stations; this is the map. A fixed rail marking where you are
 * along the flight, with a jump to any stop. Desktop only — on small screens
 * the nav sheet already does this job and screen space is better spent on content.
 */
export function StationRail() {
  const active = useActiveSection(IDS)

  return (
    <nav className={styles.rail} aria-label="Page progress">
      {navItems.map((item) => {
        const isActive = active === item.id
        return (
          <a
            key={item.id}
            className={`${styles.stop} ${isActive ? styles.active : ''}`}
            href={`#${item.id}`}
            aria-current={isActive ? 'true' : undefined}
          >
            <span className={styles.label}>{item.label}</span>
            <span className={styles.tick} aria-hidden="true" />
          </a>
        )
      })}
    </nav>
  )
}
