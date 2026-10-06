/**
 * The loader's particles: the same soft stars the 3D scene is made of, drawn
 * on a 2D canvas because three.js is the thing being waited for.
 *
 * Stars arrive from all around and settle on the surface of a slowly turning
 * sphere, which reads as a bubble made of dots. A few never settle and keep
 * falling in to a bright knot at the centre, so there is always something
 * still on its way. On release the bubble bursts outward, which is where the
 * scene's own stars start from before they gather into the first constellation.
 *
 * Nothing in here touches the document. It runs in a worker (see
 * `journeyLoader.ts` for why) and has to run the same on the main thread where
 * a worker cannot have the canvas.
 */

export type RGB = [number, number, number]

export type FieldSetup = {
  width: number
  height: number
  dpr: number
  count: number
  /** Additive light vanishes on a pale page, so the light theme draws in ink. */
  light: boolean
  /** The three star colours, most common first. */
  tones: [RGB, RGB, RGB]
  /** The white-hot centre of a star on the dark theme. */
  core: RGB
}

export type LoaderField = {
  resize: (width: number, height: number, dpr: number) => void
  /** Let the bubble go. The field keeps drawing until it is stopped. */
  release: () => void
  stop: () => void
}

const GATHER_SECONDS = 1.3
const RELEASE_SECONDS = 0.9
/** Share of stars left loose around the bubble, as the scene leaves around a figure. */
const DUST = 0.1
/** Share that keeps streaming in to the centre. */
const STREAM = 0.12
/** Share packed into the bright knot at the centre, where the streamers land. */
const CORE = 0.08
/** Values per star: direction x, y, z, then four random numbers and a kind. */
const STRIDE = 8
const SPRITE = 48

const ease = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** A scratch canvas, whichever kind this thread can make. */
function blank(size: number): OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  // The two share every member used here; only their constructors differ.
  return canvas as unknown as OffscreenCanvas
}

/** One soft dot. A white-hot centre on the dark theme; on the light one, plain ink. */
function sprite([r, g, b]: RGB, [cr, cg, cb]: RGB, light: boolean): OffscreenCanvas {
  const canvas = blank(SPRITE)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const half = SPRITE / 2
  const glow = ctx.createRadialGradient(half, half, 0, half, half, half)
  if (light) {
    glow.addColorStop(0, `rgb(${r} ${g} ${b} / 0.9)`)
    glow.addColorStop(0.45, `rgb(${r} ${g} ${b} / 0.5)`)
  } else {
    glow.addColorStop(0, `rgb(${cr} ${cg} ${cb} / 1)`)
    glow.addColorStop(0.3, `rgb(${r} ${g} ${b} / 0.85)`)
    glow.addColorStop(0.6, `rgb(${r} ${g} ${b} / 0.22)`)
  }
  glow.addColorStop(1, `rgb(${r} ${g} ${b} / 0)`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SPRITE, SPRITE)
  return canvas
}

export function runLoaderField(
  surface: HTMLCanvasElement | OffscreenCanvas,
  setup: FieldSetup,
): LoaderField {
  const canvas = surface as OffscreenCanvas
  const ctx = canvas.getContext('2d')
  if (!ctx) return { resize: () => {}, release: () => {}, stop: () => {} }

  const { count, light } = setup
  const sprites = setup.tones.map((tone) => sprite(tone, setup.core, light))

  const stars = new Float32Array(count * STRIDE)
  for (let i = 0; i < count; i++) {
    // A point picked evenly over a sphere. Seen flat, such points crowd toward
    // the rim, and that crowding is what draws the bubble's outline.
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 2 - 1)
    const kind = Math.random()
    const radius =
      kind < DUST
        ? 1.35 + Math.random() * 1.1
        : kind > 1 - CORE
          ? 0.04 + Math.random() ** 2 * 0.24
          : 1
    const o = i * STRIDE
    stars[o] = Math.sin(phi) * Math.cos(theta) * radius
    stars[o + 1] = Math.cos(phi) * radius
    stars[o + 2] = Math.sin(phi) * Math.sin(theta) * radius
    for (let k = 3; k < 7; k++) stars[o + k] = Math.random()
    stars[o + 7] = kind >= DUST && kind < DUST + STREAM ? 1 : 0
  }

  let width = 0
  let height = 0
  const resize = (w: number, h: number, dpr: number) => {
    width = w
    height = h
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize(setup.width, setup.height, setup.dpr)

  // The globe leans a little, so its turning shows as more than a sideways slide.
  const tiltCos = Math.cos(0.42)
  const tiltSin = Math.sin(0.42)

  let frame = 0
  let last = performance.now()
  let time = 0
  let intro = 0
  let releasing = false
  let released = 0

  const draw = (now: number) => {
    frame = requestAnimationFrame(draw)
    // Capped: after a stall the field picks up where it was instead of jumping.
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    time += dt
    intro = Math.min(1, intro + dt / GATHER_SECONDS)
    if (releasing) released = Math.min(1, released + dt / RELEASE_SECONDS)

    const radius = Math.min(Math.max(Math.min(width, height) * 0.17, 84), 170)
    const reach = Math.hypot(width, height) * 0.5
    const burst = released * released
    const spin = time * 0.4
    const spinCos = Math.cos(spin)
    const spinSin = Math.sin(spin)

    ctx.clearRect(0, 0, width, height)
    ctx.globalCompositeOperation = light ? 'source-over' : 'lighter'

    for (let i = 0; i < count; i++) {
      const o = i * STRIDE
      const a = stars[o + 3]
      const b = stars[o + 4]
      const c = stars[o + 5]
      const d = stars[o + 6]

      // The figure breathes, each star on its own beat.
      const swell = 1 + Math.sin(time * (0.5 + a) + d * 6.2832) * 0.035
      const sx = stars[o] * swell
      const sy = stars[o + 1] * swell
      const sz = stars[o + 2] * swell
      // Turn about the vertical axis, then lean the whole thing toward the viewer.
      const rx = sx * spinCos + sz * spinSin
      const rz = -sx * spinSin + sz * spinCos
      const ry = sy * tiltCos - rz * tiltSin
      const depth = sy * tiltSin + rz * tiltCos

      let x = rx * radius
      let y = ry * radius
      let alpha = 0.45 + 0.55 * (depth * 0.5 + 0.5)
      let size = (4.5 + d * d * 8) * (0.8 + 0.25 * depth)

      // Where a star comes from: straight in from past the edge of the screen.
      const away = Math.atan2(sy, sx) + (b - 0.5) * 1.4
      const far = reach * (0.75 + a * 0.6)
      const fromX = Math.cos(away) * far
      const fromY = Math.sin(away) * far

      if (stars[o + 7] === 1) {
        // A streamer: falls from the edge to the centre, over and over.
        const fall = (time / (1.6 + b * 1.4) + c) % 1
        const near = 1 - ease(fall)
        x = fromX * near * 0.7
        y = fromY * near * 0.7
        alpha = Math.sin(fall * Math.PI) * 0.9 * intro
        size *= 0.5 + 0.5 * near
      } else {
        // Staggered, as in the scene: each star sets off a little after the last.
        const formed = ease(clamp01((intro - d * 0.45) / 0.55))
        x = fromX + (x - fromX) * formed
        y = fromY + (y - fromY) * formed
        alpha *= 0.5 + 0.5 * formed
      }

      if (burst > 0) {
        // Outward from wherever it is now, so nothing cuts back across the middle.
        const out = Math.atan2(y, x)
        x += Math.cos(out) * far * burst
        y += Math.sin(out) * far * burst
        alpha *= 1 - released
      }

      alpha *= 0.76 + 0.24 * Math.sin(time * (1 + c * 2.5) + a * 40)
      if (alpha <= 0.01) continue

      ctx.globalAlpha = Math.min(alpha, 1)
      ctx.drawImage(
        sprites[c > 0.7 ? (i & 1) + 1 : 0],
        width / 2 + x - size / 2,
        height / 2 + y - size / 2,
        size,
        size,
      )
    }
  }
  frame = requestAnimationFrame(draw)

  return {
    resize,
    release: () => {
      releasing = true
    },
    stop: () => cancelAnimationFrame(frame),
  }
}
