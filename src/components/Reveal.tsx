import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { revealVariants, viewportOnce } from '@/lib/motion'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'section' | 'article' | 'header'
}

/**
 * Fades and lifts its children in once, when they first scroll into view.
 * For content that should keep moving with the scroll, see `Flow`.
 */
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
