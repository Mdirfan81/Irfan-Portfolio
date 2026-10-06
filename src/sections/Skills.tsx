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
import { Flow } from '@/components/Flow'
import { Marquee } from '@/components/Marquee'
import { flowPart } from '@/lib/flow'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
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
        <Eyebrow>Skills</Eyebrow>
        <SplitText className="section-title" id="skills-title" text="The stack I reach for" />
        <FadeText className="section-lede">
          Highlighted items are the ones I have taken to production repeatedly, not just tried
          once.
        </FadeText>

        <div className={styles.grid}>
          {skillGroups.map((group) => {
            const Icon = ICONS[group.id] ?? Blocks
            return (
              <Flow key={group.id}>
                <TiltCard className={styles.card} intensity={5}>
                  <div className={styles.head}>
                    <span className={styles.icon} aria-hidden="true">
                      <Icon size={19} />
                    </span>
                    <h3 className={styles.label}>{group.label}</h3>
                  </div>
                  <p className={styles.blurb}>{group.blurb}</p>
                  <ul className={styles.tags}>
                    {group.items.map((item, i) => (
                      <li
                        key={item.name}
                        className={`chip flow-part ${item.core ? 'chip--core' : ''}`}
                        style={flowPart(i)}
                      >
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </TiltCard>
              </Flow>
            )
          })}
        </div>
      </div>

      <Marquee items={MARQUEE} />
    </section>
  )
}
