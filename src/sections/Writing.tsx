import { ArrowUpRight, BookOpen } from 'lucide-react'
import { posts } from '@/data/writing'
import { profile } from '@/data/profile'
import { Reveal } from '@/components/Reveal'
import { Eyebrow, FadeText, SplitText } from '@/components/TextReveal'
import styles from './Writing.module.css'

export function Writing() {
  return (
    <section className="section" id="writing" aria-labelledby="writing-title">
      <div className="shell">
        <div className={styles.head}>
          <div>
            <Eyebrow>Writing</Eyebrow>
            <SplitText
              className="section-title"
              id="writing-title"
              text="Explaining the thing I just learned"
            />
            <FadeText className="section-lede">
              Short pieces on Medium, written for the version of me who was stuck on the same
              problem a week earlier.
            </FadeText>
          </div>
          <Reveal delay={0.35}>
            <a className="btn" href={profile.links.medium} target="_blank" rel="noreferrer">
              <BookOpen size={16} aria-hidden />
              All posts on Medium
              <ArrowUpRight size={14} aria-hidden />
              <span className="visually-hidden">(opens in a new tab)</span>
            </a>
          </Reveal>
        </div>

        <ol className={styles.list}>
          {posts.map((post, i) => (
            <li key={post.id}>
              <Reveal delay={i * 0.05}>
                <a
                  className={`glass ${styles.item}`}
                  href={post.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className={styles.index} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className={styles.title}>{post.title}</span>
                    <span className={styles.blurb}>{post.blurb}</span>
                    <span className={styles.meta}>
                      <span className="chip chip--mono">{post.topic}</span>
                      <span className="chip chip--mono">Medium</span>
                    </span>
                  </span>
                  <span className={styles.arrow} aria-hidden="true">
                    <ArrowUpRight size={17} />
                  </span>
                  <span className="visually-hidden">(opens in a new tab)</span>
                </a>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
