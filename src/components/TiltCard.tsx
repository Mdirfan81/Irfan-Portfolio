import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react'
import styles from './TiltCard.module.css'

type TiltCardProps = {
  children: ReactNode
  className?: string
  /** Maximum rotation in degrees on each axis. */
  intensity?: number
}

/**
 * Pointer-reactive 3D tilt built on CSS perspective + Motion springs — no
 * WebGL, no extra bytes. Tilt is disabled for reduced motion and for coarse
 * pointers, where the card is simply a static surface.
 */
export function TiltCard({ children, className = '', intensity = 7 }: TiltCardProps) {
  const reduced = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)

  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const spring = { stiffness: 220, damping: 22, mass: 0.5 }
  const rotateX = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), spring)
  const rotateY = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), spring)

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== 'mouse') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    mx.set(x)
    my.set(y)
    e.currentTarget.style.setProperty('--px', `${x * 100}%`)
    e.currentTarget.style.setProperty('--py', `${y * 100}%`)
  }

  const reset = () => {
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <div className={styles.wrap}>
      <motion.div
        ref={ref}
        className={`glass ${styles.card} ${className}`}
        style={reduced ? undefined : { rotateX, rotateY }}
        onPointerMove={handleMove}
        onPointerLeave={reset}
      >
        <span className={styles.sheen} aria-hidden="true" />
        <div className={styles.content}>{children}</div>
      </motion.div>
    </div>
  )
}
