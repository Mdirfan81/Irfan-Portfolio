import { Suspense, lazy, useEffect, useRef, useState, type RefObject } from 'react'
import { useReducedMotion } from 'motion/react'
import { usePageLoading } from '@/lib/pageLoad'
import { sceneSupport } from '@/lib/sceneSupport'
import { ErrorBoundary } from './ErrorBoundary'
import styles from './Droids.module.css'

// Code-split with three.js, like the journey scene: a visitor who saves data,
// or has no WebGL, never downloads either.
const RobotBuddy = lazy(() => import('@/three/robots/RobotBuddy'))

/**
 * Whether the droids get to exist at all here, and whether they are on screen.
 *
 * Opening a WebGL context holds the GPU for a few hundred milliseconds, and
 * every canvas on the page stops while it does. Measured, that was a visible
 * stall each time a droid canvas arrived mid-scroll. So while the loader still
 * covers the page they are created at once, out of sight; without a loader
 * they wait until their section is within a screen of view. Either way they
 * only draw while on screen.
 */
function useStage(el: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion() ?? false
  const [early] = useState(usePageLoading())
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const allowed = !reduced && sceneSupport() !== 'none'

  useEffect(() => {
    const node = el.current
    if (!node || !allowed || typeof IntersectionObserver === 'undefined') return
    const approach = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      rootMargin: '100% 0px',
    })
    const view = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    approach.observe(node)
    view.observe(node)
    return () => {
      approach.disconnect()
      view.disconnect()
    }
  }, [el, allowed])

  return { mount: allowed && (early || near), active: visible }
}

/**
 * Room above the highest button for the droid standing on it, and for the top
 * of its jump up there: it is about 100px tall and clears the edge by 25px.
 */
const HEADROOM = 150
/**
 * However the card lays out, the stage never reaches further up than this. On
 * a phone the buttons stack in a column above the contact links, and the top
 * one is still within it.
 */
const MAX_REACH = 900

/** An element's top within an ancestor, by layout, so the card's zoom-in does not skew it. */
function topWithin(el: HTMLElement, root: HTMLElement) {
  let top = 0
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    top += n.offsetTop
  }
  return top
}

/**
 * Stretches the droid's stage up from its lane far enough to take in every
 * button it can jump onto, with room above the highest. The buttons are the
 * `[data-perch]` elements in the same `[data-droid-yard]`, and they move as
 * the card reflows, so this follows the card's size.
 */
function useReach(stage: RefObject<HTMLElement | null>, on: boolean) {
  useEffect(() => {
    const el = stage.current
    const lane = el?.parentElement
    const yard = el?.closest<HTMLElement>('[data-droid-yard]')
    if (!on || !el || !lane || !yard || typeof ResizeObserver === 'undefined') return
    const perches = [...yard.querySelectorAll<HTMLElement>('[data-perch]')]
    const measure = () => {
      const highest = Math.min(...perches.map((p) => topWithin(p, yard)))
      const up = Number.isFinite(highest) ? topWithin(lane, yard) - highest + HEADROOM : 0
      el.style.setProperty('--stage-up', `${Math.round(Math.min(Math.max(up, 0), MAX_REACH))}px`)
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(yard)
    for (const p of perches) if (p.parentElement) watch.observe(p.parentElement)
    return () => {
      watch.disconnect()
      el.style.removeProperty('--stage-up')
    }
  }, [stage, on])
}

/**
 * The droid along the foot of the contact card, and the speech bubble it
 * talks in. Its lane is a short strip of empty card it walks along; its stage
 * rises from there over the buttons above, which it jumps up onto. The stage
 * takes no clicks, so everything under it still works; the droid listens on
 * the card instead.
 */
export function DroidBuddy() {
  const stage = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const { mount, active } = useStage(stage)
  useReach(stage, mount)

  return (
    <div className={styles.lane} aria-hidden="true">
      <div ref={stage} className={styles.stage}>
        {mount && (
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <RobotBuddy stage={stage} bubble={bubble} active={active} />
            </Suspense>
            <span ref={bubble} className={styles.bubble} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
