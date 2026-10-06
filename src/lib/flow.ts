import { useLayoutEffect, useRef, type CSSProperties } from 'react'

/**
 * Scroll flow: content arrives and leaves in step with the scroll position
 * instead of playing a one-off entrance.
 *
 * The engine does no animating of its own. For every registered element it
 * works out three numbers and writes them as custom properties, and CSS turns
 * those into whatever movement suits the element:
 *
 *   --flow-in       0 → 1 as the element rises in from the bottom of the view
 *   --flow-out      0 → 1 as it leaves through the top
 *   --flow-through  0 → 1 as the reading line travels down its height
 *
 * One scroll listener and one frame loop serve every element. Each frame reads
 * all the layout it needs and only then writes, so it never forces a reflow,
 * and everything it drives is transform or opacity.
 */

/** Share of the viewport height an element rises through while it arrives. */
const ENTER_RANGE = 0.36
/** An element starts to leave once its bottom edge is above this line… */
const EXIT_LINE = 0.24
/** …and has left after travelling this much further. */
const EXIT_RANGE = 0.2
/** Elements further right arrive later, by up to this share of the range. */
const STAGGER = 0.5
/** How far outside the viewport an element is still kept up to date. */
const MARGIN = 0.15
/** Higher follows the scroll more tightly; lower trails it more softly. */
const SMOOTHING = 9
const SETTLED = 0.001

type State = 'new' | 'idle' | 'live' | 'rest'

type Entry = {
  in: number
  out: number
  through: number
  targetIn: number
  targetOut: number
  targetThrough: number
  near: boolean
  state: State
}

const entries = new Map<HTMLElement, Entry>()
let frame = 0
let last = 0
let resizeObserver: ResizeObserver | null = null

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

/** Where the element sits in the page, ignoring any transform on it. */
function pageOffset(el: HTMLElement) {
  let top = 0
  let left = 0
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop
    left += node.offsetLeft
  }
  return { top, left }
}

function tick(now: number) {
  frame = 0
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  const follow = 1 - Math.exp(-SMOOTHING * dt)

  const vh = window.innerHeight
  const vw = window.innerWidth
  const scrollY = window.scrollY
  const range = vh * ENTER_RANGE
  // The last things on the page cannot be scrolled far enough to arrive on
  // their own, so reaching the end of the page brings everything in.
  const remaining = document.documentElement.scrollHeight - vh - scrollY
  const pageEnd = clamp(1 - remaining / range)

  // Read…
  for (const [el, entry] of entries) {
    const offset = pageOffset(el)
    const height = el.offsetHeight
    const top = offset.top - scrollY
    const bottom = top + height

    entry.near = top < vh * (1 + MARGIN) && bottom > -vh * MARGIN

    const lag = (offset.left / vw) * STAGGER * range
    const arrived = Math.max(clamp((vh - top - lag) / range), pageEnd)
    const left = clamp((vh * EXIT_LINE - bottom) / (vh * EXIT_RANGE))
    // Ease out on the way in and in on the way out: quick to appear, slow to
    // settle, and in no hurry to start leaving.
    entry.targetIn = 1 - (1 - arrived) ** 3
    entry.targetOut = left * left
    entry.targetThrough = height > 0 ? clamp((vh * 0.62 - top) / height) : 1
  }

  // …then write.
  let moving = false
  for (const [el, entry] of entries) {
    // Out of sight, or seen for the first time: jump straight to the target.
    const snap = !entry.near || entry.state === 'new'
    const before = entry.in + entry.out + entry.through

    const toward = (current: number, target: number) => {
      const next = snap ? target : current + (target - current) * follow
      return Math.abs(target - next) < SETTLED ? target : next
    }
    entry.in = toward(entry.in, entry.targetIn)
    entry.out = toward(entry.out, entry.targetOut)
    entry.through = toward(entry.through, entry.targetThrough)
    if (
      entry.in !== entry.targetIn ||
      entry.out !== entry.targetOut ||
      entry.through !== entry.targetThrough
    ) {
      moving = true
    }

    const resting = entry.in === 1 && entry.out === 0
    const state: State = !entry.near ? 'idle' : resting ? 'rest' : 'live'
    if (state === entry.state && before === entry.in + entry.out + entry.through) continue

    el.style.setProperty('--flow-in', entry.in.toFixed(4))
    el.style.setProperty('--flow-out', entry.out.toFixed(4))
    el.style.setProperty('--flow-through', entry.through.toFixed(4))
    if (state !== entry.state) {
      entry.state = state
      el.dataset.flow = state
    }
  }

  if (moving) frame = requestAnimationFrame(tick)
}

function schedule() {
  if (frame) return
  last = performance.now()
  frame = requestAnimationFrame(tick)
}

function start() {
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  // Content that changes height — a filtered grid, a late font — moves
  // everything below it without a scroll event.
  resizeObserver = new ResizeObserver(schedule)
  resizeObserver.observe(document.body)
}

function stop() {
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  resizeObserver?.disconnect()
  resizeObserver = null
  cancelAnimationFrame(frame)
  frame = 0
}

/**
 * Starts driving an element's flow properties. Returns the function that stops.
 * Does nothing when motion is reduced: the properties keep their resting
 * values from the stylesheet and the element simply sits in place.
 */
export function observeFlow(el: HTMLElement): () => void {
  if (
    typeof window === 'undefined' ||
    typeof ResizeObserver === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return () => {}
  }

  if (entries.size === 0) start()
  entries.set(el, {
    in: 1,
    out: 0,
    through: 1,
    targetIn: 1,
    targetOut: 0,
    targetThrough: 1,
    near: false,
    state: 'new',
  })
  // The first frame runs before the browser paints, so a new element is never
  // seen in its resting place before it is put where the scroll says it is.
  schedule()

  return () => {
    entries.delete(el)
    el.style.removeProperty('--flow-in')
    el.style.removeProperty('--flow-out')
    el.style.removeProperty('--flow-through')
    delete el.dataset.flow
    if (entries.size === 0) stop()
  }
}

/** Ref for an element whose flow properties should follow the scroll. */
export function useFlow<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    if (ref.current) return observeFlow(ref.current)
  }, [])

  return ref
}

/**
 * Props for a `.flow-part`: a child of a flowing element that follows it in a
 * beat later than the part before it. `index` is its place in the sequence.
 */
export const flowPart = (index: number) => ({ '--i': index }) as CSSProperties
