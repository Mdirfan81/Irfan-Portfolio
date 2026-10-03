import { Fragment, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
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
  stagger = 0.05,
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
                hidden: reduced ? { opacity: 0 } : { y: '110%', rotate: 4 },
                visible: {
                  y: 0,
                  rotate: 0,
                  opacity: 1,
                  transition: reduced ? { duration: 0.2 } : { duration: 0.7, ease: EASE_OUT },
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
export function Eyebrow({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false

  return (
    <motion.p
      className="eyebrow eyebrow--animated"
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
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: reduced ? 0.2 : 0.6, delay: reduced ? 0 : delay, ease: EASE_OUT }}
    >
      {children}
    </motion.p>
  )
}

/**
 * Scroll-linked paragraph: each word brightens from dim to full as the
 * paragraph travels up through the viewport, so reading pace follows scroll.
 */
export function ScrollHighlight({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const reduced = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.55'] })

  if (reduced) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    )
  }

  const words = text.split(' ')
  return (
    <p ref={ref} className={className}>
      <span className="visually-hidden">{text}</span>
      {words.map((word, i) => (
        <Word
          key={i}
          progress={scrollYProgress}
          range={[i / words.length, (i + 1) / words.length]}
        >
          {word}
          {i < words.length - 1 ? ' ' : null}
        </Word>
      ))}
    </p>
  )
}

function Word({
  children,
  progress,
  range,
}: {
  children: ReactNode
  progress: MotionValue<number>
  range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.22, 1])
  return (
    <motion.span aria-hidden="true" style={{ opacity }}>
      {children}
    </motion.span>
  )
}
