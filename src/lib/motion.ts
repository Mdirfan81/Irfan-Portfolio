import type { Transition, Variants } from 'motion/react'

/** Matches --ease-out in tokens.css so CSS and JS motion agree. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const transitions = {
  fast: { duration: 0.16, ease: EASE_OUT },
  base: { duration: 0.24, ease: EASE_OUT },
  reveal: { duration: 0.64, ease: EASE_OUT },
  spring: { type: 'spring', stiffness: 260, damping: 26, mass: 0.7 },
} satisfies Record<string, Transition>

/**
 * Section reveal. `reduced` flattens the movement to a plain fade so the
 * meaning survives without the travel.
 */
export const revealVariants = (reduced: boolean): Variants => ({
  hidden: { opacity: 0, y: reduced ? 0 : 24, filter: reduced ? 'none' : 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'none',
    transition: reduced ? { duration: 0.001 } : transitions.reveal,
  },
})

/** Parent that staggers its children in reading order. */
export const staggerVariants = (reduced: boolean, stagger = 0.07): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: reduced ? 0 : 0.05 },
  },
})

export const viewportOnce = { once: true, amount: 0.25 } as const
