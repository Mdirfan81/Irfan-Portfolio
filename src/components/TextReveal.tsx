import { Fragment, useRef, type ReactNode } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type MotionValue,
} from 'motion/react'
import { EASE_OUT, viewportOnce } from '@/lib/motion'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'p'

/**
 * Splits text into words that rise out of a mask one after another when the
 * line scrolls into view. The real text stays in a visually-hidden span so the
 * accessible name is the plain sentence, not a list of fragments.
 */
export function SplitText({
  text,
  as = 'h2',
  id,
  className,
  delay = 0,
  stagger = 0.06,
}: {
  text: string
  as?: HeadingTag
  id?: string
  className?: string
  delay?: number
  stagger?: number
}) {
  const reduced = useReducedMotion() ?? false
  const Tag = motion[as]
  const words = text.split(' ')

  return (
    <Tag
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: reduced ? 0 : delay },
        },
      }}
    >
      <span className="visually-hidden">{text}</span>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="split-mask" aria-hidden="true">
            <motion.span
              className="split-word"
              variants={{
                hidden: reduced ? { opacity: 0 } : { y: '110%', rotate: 6 },
                visible: {
                  y: 0,
                  rotate: 0,
                  opacity: 1,
                  transition: reduced ? { duration: 0.2 } : { duration: 0.9, ease: EASE_OUT },
                },
              }}
            >
              {word}
            </motion.span>
          </span>
          {/* The space sits between the masks: trailing whitespace inside an
              inline-block collapses to nothing. */}
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}

/** Eyebrow label: the accent rule draws across, then the label slides in after it. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false

  return (
    <motion.p
      className={`eyebrow eyebrow--animated ${className ?? ''}`}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <motion.span
        className="eyebrow-rule"
        aria-hidden="true"
        variants={{
          hidden: { scaleX: reduced ? 1 : 0 },
          visible: { scaleX: 1, transition: { duration: 0.5, ease: EASE_OUT } },
        }}
      />
      <motion.span
        variants={{
          hidden: { opacity: 0, x: reduced ? 0 : -8, letterSpacing: reduced ? '0.14em' : '0.4em' },
          visible: {
            opacity: 1,
            x: 0,
            letterSpacing: '0.14em', // --tracking-label
            transition: { duration: 0.6, delay: reduced ? 0 : 0.2, ease: EASE_OUT },
          },
        }}
      >
        {children}
      </motion.span>
    </motion.p>
  )
}

/** Supporting paragraph that follows a heading in, a beat behind it. */
export function FadeText({
  children,
  className,
  delay = 0.3,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduced = useReducedMotion() ?? false

  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: reduced ? 0.2 : 0.8, delay: reduced ? 0 : delay, ease: EASE_OUT }}
    >
      {children}
    </motion.p>
  )
}

/**
 * A sentence that inks in word by word as `progress` runs from 0 to 1, with
 * a handwritten accent to finish it. The words are marked on and off directly
 * on the DOM as the scroll moves, so reading pace follows the scroll without
 * React rendering anything. See `.fill-word` in global.css for why the colour
 * is painted the way it is.
 */
export function ScrollFill({
  text,
  accent,
  progress,
  as = 'p',
  id,
  className,
  accentClassName,
}: {
  text: string
  accent?: string
  progress: MotionValue<number>
  as?: HeadingTag
  id?: string
  className?: string
  accentClassName?: string
}) {
  const reduced = useReducedMotion() ?? false
  const words = useRef<HTMLSpanElement[]>([])
  const Tag = as
  const plain = text.split(' ')
  const all = accent ? [...plain, accent] : plain

  useMotionValueEvent(progress, 'change', (p) => {
    if (reduced) return
    // One more step than there are words, so the last one lands just before
    // the end rather than exactly on it.
    const lit = Math.ceil(p * (all.length + 1))
    words.current.forEach((word, i) => word.toggleAttribute('data-on', i < lit))
  })

  return (
    <Tag id={id} className={className}>
      <span className="visually-hidden">{accent ? `${text} ${accent}` : text}</span>
      <span aria-hidden="true">
        {all.map((word, i) => {
          const isAccent = accent !== undefined && i === all.length - 1
          return (
            <Fragment key={i}>
              <span
                ref={(el) => {
                  if (el) words.current[i] = el
                }}
                className={`fill-word ${isAccent ? (accentClassName ?? '') : ''}`}
                data-on={reduced ? '' : undefined}
              >
                {word}
              </span>
              {i < all.length - 1 ? ' ' : null}
            </Fragment>
          )
        })}
      </span>
    </Tag>
  )
}

/**
 * Scroll-linked paragraph: each word lights up as the paragraph travels up
 * through the viewport, so reading pace follows scroll.
 */
export function ScrollHighlight({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.55'] })

  return (
    <div ref={ref}>
      <ScrollFill text={text} progress={scrollYProgress} className={className} />
    </div>
  )
}
