import { useId, type CSSProperties, type ReactNode } from 'react'
import styles from './SquigglyText.module.css'

type SquigglyTextProps = {
  children: ReactNode
  className?: string
  /** Furthest a pixel is pushed, in px: the frames ramp from the first to the second. */
  scale?: [number, number]
}

// Must match the number of steps in the `squiggle` keyframes.
const FRAMES = 5

/**
 * Hand-drawn wobble: the content is redrawn through a handful of slightly
 * different SVG displacement filters, one after another, the way a line
 * boils in cel animation. The stylesheet does the stepping, so there is no
 * timer and nothing re-renders. Still for reduced motion.
 */
export function SquigglyText({ children, className = '', scale = [6, 8] }: SquigglyTextProps) {
  const id = useId()
  const frames = Array.from({ length: FRAMES }, (_, i) => `${id}-${i}`)
  // The keyframes can't know the generated ids, so they are handed over as
  // custom properties.
  const filters = Object.fromEntries(
    frames.map((frame, i) => [`--squiggle-${i}`, `url("#${frame}")`]),
  ) as CSSProperties

  return (
    <span className={`${styles.squiggle} ${className}`} style={filters}>
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          {frames.map((frame, i) => (
            <filter key={frame} id={frame} colorInterpolationFilters="sRGB">
              <feTurbulence baseFrequency="0.02" numOctaves="3" seed={i} result="noise" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={scale[0] + ((scale[1] - scale[0]) * i) / (FRAMES - 1)}
              />
            </filter>
          ))}
        </defs>
      </svg>
      {children}
    </span>
  )
}
