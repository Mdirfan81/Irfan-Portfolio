import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import { BUBBLE, FIELD, startLiquidCursor } from '@/lib/liquidCursor'
import styles from './LiquidCursor.module.css'

/** A mouse or trackpad: something that hovers, and points finely enough to aim a bubble. */
const hasFinePointer = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

/**
 * Replaces the system cursor with a bubble of liquid glass. Decorative, and
 * only for a mouse: touch screens never see it, and with motion reduced the
 * system cursor is left exactly as it is. See `lib/liquidCursor.ts`.
 */
export function LiquidCursor() {
  const reduced = useReducedMotion() ?? false
  // Read once in a lazy initialiser: it is a fact about the device.
  const [capable] = useState(hasFinePointer)
  const enabled = capable && !reduced

  const root = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLCanvasElement>(null)
  const lens = useRef<SVGFEImageElement>(null)

  useEffect(() => {
    if (!enabled) return
    if (!root.current || !bubble.current || !dot.current || !field.current || !lens.current) return
    return startLiquidCursor({
      root: root.current,
      bubble: bubble.current,
      dot: dot.current,
      field: field.current,
      lens: lens.current,
    })
  }, [enabled])

  if (!enabled) return null

  return (
    <div ref={root} className={styles.cursor} data-mode="free" aria-hidden="true">
      <svg className={styles.defs} width="0" height="0" focusable="false">
        <defs>
          {/* Fuses shapes that touch, then lights the result like a wet surface. */}
          <filter
            id="liquid-goo"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            {/* Blur, then snap the alpha back to a hard edge: where two blurs
                overlap they clear the threshold together and join up. */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 24 -10"
              result="shape"
            />
            {/* The shape softened again is the height map the light falls on. */}
            <feGaussianBlur in="shape" stdDeviation="2.6" result="dome" />
            <feSpecularLighting
              in="dome"
              surfaceScale="5"
              specularConstant="1.5"
              specularExponent="34"
              result="shine"
              style={{ lightingColor: 'var(--liquid-light)' }}
            >
              <feDistantLight azimuth="235" elevation="34" />
            </feSpecularLighting>
            <feComposite in="shine" in2="shape" operator="in" result="gloss" />

            {/* A thin bright edge: the shape minus itself shrunk. */}
            <feMorphology in="shape" operator="erode" radius="1.1" result="inner" />
            <feComposite in="shape" in2="inner" operator="out" result="edge" />
            <feFlood style={{ floodColor: 'var(--liquid-rim)' }} result="rimColor" />
            <feComposite in="rimColor" in2="edge" operator="in" result="rim" />

            <feFlood
              style={{ floodColor: 'var(--liquid-tint)', floodOpacity: 'var(--liquid-fill)' } as CSSProperties}
              result="tint"
            />
            <feComposite in="tint" in2="shape" operator="in" result="body" />

            <feMerge>
              <feMergeNode in="body" />
              <feMergeNode in="rim" />
              <feMergeNode in="gloss" />
            </feMerge>
          </filter>

          {/* Bends whatever is behind the bubble. The map is drawn at start-up. */}
          <filter id="liquid-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage
              ref={lens}
              x="0"
              y="0"
              width={BUBBLE}
              height={BUBBLE}
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale="24"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <canvas
        ref={field}
        className={styles.field}
        style={{ width: FIELD, height: FIELD, filter: 'url(#liquid-goo)' }}
      />
      <div ref={bubble} className={styles.bubble} />
      <div ref={dot} className={styles.dot} />
    </div>
  )
}
