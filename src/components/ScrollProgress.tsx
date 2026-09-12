import { motion, useScroll, useSpring } from 'motion/react'

/** Thin reading-progress bar pinned under the nav. Decorative. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })

  return (
    <motion.div
      aria-hidden="true"
      style={{
        scaleX,
        transformOrigin: '0 50%',
        position: 'fixed',
        insetInline: 0,
        top: 0,
        height: 2,
        zIndex: 60,
        background: 'linear-gradient(90deg, var(--c-accent), var(--c-violet), var(--c-cyan))',
      }}
    />
  )
}
