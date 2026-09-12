import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { revealVariants, staggerVariants, viewportOnce } from '@/lib/motion'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'section' | 'article' | 'header'
}

/** Fades and lifts its children in once, when they first scroll into view. */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion() ?? false
  const Tag = motion[as]

  return (
    <Tag
      className={className}
      variants={revealVariants(reduced)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay: reduced ? 0 : delay }}
    >
      {children}
    </Tag>
  )
}

/** Parent wrapper that reveals its `Reveal` children one after another. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
}: {
  children: ReactNode
  className?: string
  stagger?: number
}) {
  const reduced = useReducedMotion() ?? false

  return (
    <motion.div
      className={className}
      variants={staggerVariants(reduced, stagger)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </motion.div>
  )
}

/** Child of RevealGroup — inherits the parent's stagger timing. */
export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false
  return (
    <motion.div className={className} variants={revealVariants(reduced)}>
      {children}
    </motion.div>
  )
}
