import {
  Blocks,
  Bot,
  Boxes,
  Database,
  Gauge,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { skillGroups } from '@/data/skills'
import { TiltCard } from '@/components/TiltCard'
import { Reveal, RevealGroup, RevealItem } from '@/components/Reveal'
import styles from './Skills.module.css'

const ICONS: Record<string, LucideIcon> = {
  frontend: Blocks,
  performance: Gauge,
  testing: ShieldCheck,
  backend: Boxes,
  ai: Bot,
  tooling: Database,
}

const MARQUEE = [
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'Micro-frontends',
  'Storybook',
  'Core Web Vitals',
  'Cypress',
  'Jest',
  'GraphQL',
  'WebSockets',
  'CI/CD',
  'Design systems',
  'WCAG 2.1 AA',
  'Agentic AI',
]

export function Skills() {
  return (
    <section className="section" id="skills" aria-labelledby="skills-title">
      <div className="shell">
        <Reveal>
          <p className="eyebrow">Skills</p>
          <h2 className="section-title" id="skills-title">
            The stack I reach for
          </h2>
          <p className="section-lede">
            Highlighted items are the ones I have taken to production repeatedly, not just tried
            once.
          </p>
        </Reveal>

        <RevealGroup className={styles.grid} stagger={0.06}>
          {skillGroups.map((group) => {
            const Icon = ICONS[group.id] ?? Blocks
            return (
              <RevealItem key={group.id}>
                <TiltCard className={styles.card} intensity={5}>
                  <div className={styles.head}>
                    <span className={styles.icon} aria-hidden="true">
                      <Icon size={19} />
                    </span>
                    <h3 className={styles.label}>{group.label}</h3>
                  </div>
                  <p className={styles.blurb}>{group.blurb}</p>
                  <ul className={styles.tags}>
                    {group.items.map((item) => (
                      <li key={item.name} className={`chip ${item.core ? 'chip--core' : ''}`}>
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </TiltCard>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>

      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.track}>
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span className={styles.tick} key={`${item}-${i}`}>
              <span className={styles.tickDot} />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
