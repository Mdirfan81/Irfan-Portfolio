import { runLoaderField, type FieldSetup, type RGB } from './loaderField'
// Inlined into the bundle: the single-file build has nowhere to fetch a
// separate worker script from.
import FieldWorker from './loaderField.worker?worker&inline'
import type { FieldMessage } from './loaderField.worker'

export type JourneyLoaderHandle = {
  /** Burst the bubble. Drawing carries on until `stop`. */
  release: () => void
  stop: () => void
}

/** Any CSS colour as r, g, b. Tokens are hex today, but nothing promises that. */
function channels(color: string): RGB {
  const probe = document.createElement('canvas')
  probe.width = probe.height = 1
  const ctx = probe.getContext('2d', { willReadFrequently: true })
  if (!ctx) return [255, 255, 255]
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

const viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
})

function readSetup(): FieldSetup {
  const tokens = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) =>
    channels(tokens.getPropertyValue(name).trim() || fallback)
  const [r, g, b] = token('--c-bg', '#070b14')

  return {
    ...viewport(),
    count: (navigator.hardwareConcurrency ?? 4) >= 8 ? 2600 : 1500,
    light: (r + g + b) / 3 > 128,
    tones: [
      token('--c-accent', '#6aa6ff'),
      token('--c-violet', '#a98bff'),
      token('--c-cyan', '#4fd8e8'),
    ],
    core: token('--c-text', '#e8edf7'),
  }
}

/** A worker to draw on `canvas`, where the browser can hand one a canvas at all. */
function spawn(canvas: HTMLCanvasElement): Worker | undefined {
  if (typeof canvas.transferControlToOffscreen !== 'function') return undefined
  try {
    return new FieldWorker()
  } catch {
    // Blocked by policy: draw on the main thread instead.
    return undefined
  }
}

/**
 * Puts the loader's star field into `host` and starts it.
 *
 * The field is drawn from a worker. While the loader is up the main thread is
 * busy with the very work being waited for: starting React, evaluating
 * three.js, compiling shaders. It stalls for hundreds of milliseconds at a
 * time, and anything animated from it freezes with it. A worker with its own
 * canvas keeps a steady frame through all of that. Browsers that cannot hand a
 * canvas to a worker draw it on the main thread instead.
 *
 * The canvas is made here, not rendered by React, because a canvas can only be
 * handed over once, and an effect that runs twice in development needs a fresh
 * one each time.
 */
export function startJourneyLoader(host: HTMLElement, className: string): JourneyLoaderHandle {
  const canvas = document.createElement('canvas')
  canvas.className = className
  host.append(canvas)

  const setup = readSetup()
  let onResize: () => void
  let handle: JourneyLoaderHandle

  const worker = spawn(canvas)

  if (worker) {
    const surface = canvas.transferControlToOffscreen()
    const post = (message: FieldMessage, transfer: Transferable[] = []) =>
      worker.postMessage(message, transfer)
    post({ type: 'start', canvas: surface, setup }, [surface])
    onResize = () => post({ type: 'resize', ...viewport() })
    handle = { release: () => post({ type: 'release' }), stop: () => worker.terminate() }
  } else {
    const field = runLoaderField(canvas, setup)
    onResize = () => {
      const { width, height, dpr } = viewport()
      field.resize(width, height, dpr)
    }
    handle = field
  }

  window.addEventListener('resize', onResize)

  return {
    release: handle.release,
    stop: () => {
      window.removeEventListener('resize', onResize)
      handle.stop()
      canvas.remove()
    },
  }
}
