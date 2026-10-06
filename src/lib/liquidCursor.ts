/**
 * The liquid cursor: a bubble of glass that trails the pointer on a spring,
 * sheds drops when it moves quickly, and pours itself round a control when it
 * reaches one.
 *
 * It is drawn in three layers, back to front:
 *
 *   field   a small canvas that follows the bubble. The bubble's body and its
 *           drops are plain circles here; an SVG filter over the canvas fuses
 *           circles that touch and lights the result, which is what makes
 *           separate shapes read as one liquid.
 *   bubble  an element sitting over the body that bends the page behind it,
 *           and the thing that changes shape to wrap a control.
 *   dot     the exact pointer position, with no lag, so aiming stays precise
 *           while the bubble takes its time arriving.
 *
 * Everything runs in one frame loop that stops when nothing is moving.
 */

type Parts = {
  root: HTMLElement
  bubble: HTMLElement
  dot: HTMLElement
  field: HTMLCanvasElement
  /** The displacement map of the lens filter; filled in here. */
  lens: SVGFEImageElement
}

type Mode = 'free' | 'card' | 'wrap'

type Drop = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  age: number
  life: number
}

/** Resting diameter of the bubble. */
export const BUBBLE = 36
/** Side of the canvas the liquid is drawn on. Drops die before they leave it. */
export const FIELD = 300

/** Controls the bubble wraps itself round… */
const CONTROLS = 'a, button, [role="button"]'
/** …provided they are no bigger than this. Anything larger is a surface. */
const WRAP_MAX_WIDTH = 320
const WRAP_MAX_HEIGHT = 76
/** How far the wrapped bubble stands off the control it is holding. */
const WRAP_PAD = 6
/** Surfaces whose edge lights up under the pointer. */
const SURFACES = '.glass'

const DROP_SPACING = 20
const DROP_MIN_SPEED = 150
const MAX_DROPS = 28
/** The loop keeps running this long after the last input, to follow anything still easing. */
const LINGER = 450

/**
 * A lens as a displacement map: red and green say how far to shift each pixel
 * sideways and upwards. Nothing moves at the centre and the pull towards it
 * grows steeply to the rim, which is where a real drop bends light most.
 */
function lensMap(size: number): string {
  const n = size * 2
  const canvas = document.createElement('canvas')
  canvas.width = n
  canvas.height = n
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const image = ctx.createImageData(n, n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = ((x + 0.5) / n) * 2 - 1
      const dy = ((y + 0.5) / n) * 2 - 1
      const r2 = dx * dx + dy * dy
      const pull = r2 < 1 ? r2 : 0
      const i = (y * n + x) * 4
      image.data[i] = 128 - dx * pull * 127
      image.data[i + 1] = 128 - dy * pull * 127
      image.data[i + 2] = 128
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

/** Only Chromium runs an SVG filter as a backdrop; elsewhere the bubble falls back to a plain one. */
function bendsBackdrop(): boolean {
  const brands = (navigator as { userAgentData?: { brands?: { brand: string }[] } }).userAgentData
    ?.brands
  return !!brands?.some((b) => b.brand === 'Chromium')
}

export function startLiquidCursor({ root, bubble, dot, field, lens }: Parts): () => void {
  const ctx = field.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  field.width = FIELD * dpr
  field.height = FIELD * dpr

  if (bendsBackdrop()) {
    lens.setAttribute('href', lensMap(BUBBLE))
    root.style.setProperty('--lens', 'url(#liquid-lens) saturate(1.5) brightness(1.06)')
  }

  const pointer = { x: 0, y: 0, down: false }
  const pos = { x: 0, y: 0, vx: 0, vy: 0 }
  const box = { w: BUBBLE, h: BUBBLE, r: BUBBLE / 2, scale: 1, body: 1 }
  const drops: Drop[] = []

  let mode: Mode = 'free'
  let held: HTMLElement | null = null
  let heldRadius = 0
  let lit: HTMLElement | null = null
  let shown = false
  /** What the pointer was last over, and whether that still needs acting on. */
  let over: Element | null = null
  let moved = false
  let scrolled = false
  let travelled = 0
  let frame = 0
  let last = 0
  let awakeUntil = 0

  const setMode = (next: Mode) => {
    if (next === mode) return
    mode = next
    root.dataset.mode = next
  }

  /** Decides what the pointer is over and how the bubble should treat it. */
  const pick = (el: Element | null) => {
    const surface = el?.closest<HTMLElement>(SURFACES) ?? null
    if (surface !== lit) {
      lit?.removeAttribute('data-lit')
      surface?.setAttribute('data-lit', '')
      lit = surface
    }

    const control = el?.closest<HTMLElement>(CONTROLS) ?? null
    if (control) {
      const rect = control.getBoundingClientRect()
      if (rect.width <= WRAP_MAX_WIDTH && rect.height <= WRAP_MAX_HEIGHT) {
        if (control !== held) {
          held = control
          heldRadius = parseFloat(getComputedStyle(control).borderTopLeftRadius) || 0
        }
        setMode('wrap')
        return
      }
    }
    held = null
    setMode(surface || control ? 'card' : 'free')
  }

  const shed = (x: number, y: number, vx: number, vy: number, radius: number) => {
    if (drops.length >= MAX_DROPS) drops.shift()
    drops.push({ x, y, vx, vy, radius, age: 0, life: 0.5 + Math.random() * 0.5 })
  }

  const tick = (now: number) => {
    frame = 0
    const dt = Math.min((now - last) / 1000, 0.04)
    last = now

    // Choosing what the pointer is over measures the page, so it waits for the
    // frame instead of running on every pointer event. The page can also move
    // under a still pointer, in which case what is there has to be looked up.
    if (scrolled) over = document.elementFromPoint(pointer.x, pointer.y)
    if (moved || scrolled || (held && !held.isConnected)) pick(over?.isConnected ? over : null)
    moved = false
    scrolled = false

    /* ── Read ── */
    let tx = pointer.x
    let ty = pointer.y
    let tw = BUBBLE
    let th = BUBBLE
    let tr = BUBBLE / 2
    let scale = mode === 'card' ? 1.3 : 1

    if (mode === 'wrap' && held) {
      const rect = held.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      tw = rect.width + WRAP_PAD * 2
      th = rect.height + WRAP_PAD * 2
      tr = Math.min(heldRadius + WRAP_PAD, th / 2)
      // Held by the control, but leaning a little toward the pointer.
      tx = cx + (pointer.x - cx) * 0.1
      ty = cy + (pointer.y - cy) * 0.1
    }
    if (pointer.down) scale *= 0.86

    const litRect = lit?.getBoundingClientRect()

    /* ── Move ── */
    // A real spring for position, so the bubble overshoots and settles like
    // something with weight; a plain ease for size, which should never wobble.
    const stiffness = mode === 'wrap' ? 360 : 250
    const damping = mode === 'wrap' ? 32 : 23
    pos.vx += ((tx - pos.x) * stiffness - pos.vx * damping) * dt
    pos.vy += ((ty - pos.y) * stiffness - pos.vy * damping) * dt
    pos.x += pos.vx * dt
    pos.y += pos.vy * dt

    const ease = 1 - Math.exp(-17 * dt)
    box.w += (tw - box.w) * ease
    box.h += (th - box.h) * ease
    box.r += (tr - box.r) * ease
    box.scale += (scale - box.scale) * ease
    box.body += ((mode === 'wrap' ? 0 : 1) - box.body) * ease

    const speed = Math.hypot(pos.vx, pos.vy)

    // Stretched along its direction of travel and thinned across it, without
    // being turned: R(θ)·S·R(−θ), so the highlight stays where the light is.
    const stretch = mode === 'wrap' ? 0 : Math.min(speed / 2600, 0.34)
    const sx = 1 + stretch
    const sy = 1 - stretch * 0.55
    const cos = speed > 1 ? pos.vx / speed : 1
    const sin = speed > 1 ? pos.vy / speed : 0
    const a = (cos * cos * sx + sin * sin * sy) * box.scale
    const b = cos * sin * (sx - sy) * box.scale
    const d = (sin * sin * sx + cos * cos * sy) * box.scale

    if (mode !== 'wrap' && shown) {
      travelled += speed * dt
      while (travelled > DROP_SPACING) {
        travelled -= DROP_SPACING
        if (speed < DROP_MIN_SPEED) continue
        // Left behind at the trailing edge, carrying a little of the motion
        // and a nudge to one side so a trail is never a straight line.
        const side = (Math.random() - 0.5) * 90
        shed(
          pos.x - cos * BUBBLE * 0.3 + (Math.random() - 0.5) * 8,
          pos.y - sin * BUBBLE * 0.3 + (Math.random() - 0.5) * 8,
          pos.vx * 0.22 - sin * side,
          pos.vy * 0.22 + cos * side,
          2.5 + Math.random() * 3 + Math.min(speed / 900, 3),
        )
      }
    }

    const drag = Math.exp(-4.5 * dt)
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i]
      drop.age += dt
      if (drop.age >= drop.life) {
        drops.splice(i, 1)
        continue
      }
      drop.vx *= drag
      drop.vy *= drag
      drop.x += drop.vx * dt
      drop.y += drop.vy * dt
    }

    /* ── Write ── */
    bubble.style.width = `${box.w.toFixed(2)}px`
    bubble.style.height = `${box.h.toFixed(2)}px`
    bubble.style.borderRadius = `${box.r.toFixed(2)}px`
    bubble.style.transform =
      `translate3d(${(pos.x - box.w / 2).toFixed(2)}px, ${(pos.y - box.h / 2).toFixed(2)}px, 0) ` +
      `matrix(${a.toFixed(4)}, ${b.toFixed(4)}, ${b.toFixed(4)}, ${d.toFixed(4)}, 0, 0)`
    // Where the pointer is inside the bubble: the highlight on a wrapped
    // control follows it.
    bubble.style.setProperty('--sx', `${(((pointer.x - pos.x) / box.w + 0.5) * 100).toFixed(1)}%`)
    bubble.style.setProperty('--sy', `${(((pointer.y - pos.y) / box.h + 0.5) * 100).toFixed(1)}%`)

    dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`
    field.style.transform = `translate3d(${(pos.x - FIELD / 2).toFixed(2)}px, ${(pos.y - FIELD / 2).toFixed(2)}px, 0)`

    if (lit && litRect) {
      lit.style.setProperty('--gx', `${(pointer.x - litRect.left).toFixed(1)}px`)
      lit.style.setProperty('--gy', `${(pointer.y - litRect.top).toFixed(1)}px`)
    }

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, FIELD, FIELD)
      // Only coverage matters: the filter over the canvas supplies the colour.
      ctx.fillStyle = '#fff'
      const half = FIELD / 2

      const body = (BUBBLE / 2) * box.scale * box.body
      if (body > 0.5) {
        ctx.beginPath()
        ctx.ellipse(half, half, body * sx, body * sy, Math.atan2(sin, cos), 0, Math.PI * 2)
        ctx.fill()
      }
      for (const drop of drops) {
        const t = drop.age / drop.life
        ctx.beginPath()
        ctx.arc(drop.x - pos.x + half, drop.y - pos.y + half, drop.radius * (1 - t * t), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const settled =
      drops.length === 0 &&
      speed < 2 &&
      Math.abs(tx - pos.x) + Math.abs(ty - pos.y) < 0.2 &&
      Math.abs(tw - box.w) + Math.abs(th - box.h) + Math.abs(scale - box.scale) * 40 < 0.3
    if (!settled || now < awakeUntil) frame = requestAnimationFrame(tick)
  }

  const wake = () => {
    awakeUntil = performance.now() + LINGER
    if (frame) return
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }

  const show = (visible: boolean) => {
    if (visible === shown) return
    shown = visible
    root.toggleAttribute('data-visible', visible)
    // The system cursor goes only once the bubble is actually on screen.
    document.documentElement.classList.toggle('liquid-cursor', visible)
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    pointer.x = e.clientX
    pointer.y = e.clientY
    if (!shown) {
      // First sight of the pointer: start there rather than flying in from a corner.
      pos.x = e.clientX
      pos.y = e.clientY
      show(true)
    }
    over = e.target as Element | null
    moved = true
    wake()
  }

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    pointer.down = true
    // A press squeezes the bubble and throws a ring of drops off it.
    if (mode !== 'wrap') {
      const count = 7
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6
        const speed = 190 + Math.random() * 150
        shed(pos.x, pos.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 3 + Math.random() * 3)
      }
    }
    wake()
  }

  const onUp = () => {
    pointer.down = false
    wake()
  }

  const onScroll = () => {
    scrolled = true
    wake()
  }

  const onLeave = () => show(false)

  const page = document.documentElement
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  window.addEventListener('pointercancel', onUp, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('blur', onLeave)
  page.addEventListener('pointerleave', onLeave)

  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('blur', onLeave)
    page.removeEventListener('pointerleave', onLeave)
    cancelAnimationFrame(frame)
    lit?.removeAttribute('data-lit')
    show(false)
  }
}
