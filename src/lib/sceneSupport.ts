export type SceneSupport = 'none' | 'low' | 'high'

/** Phones keep the CSS aurora: the scene costs them the most and shows the least. */
const MIN_SCENE_WIDTH = 768

function detect(): SceneSupport {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'none'

  // Respect an explicit request to save data before spending 200KB on three.js.
  const connection = (navigator as { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return 'none'
  if (window.innerWidth < MIN_SCENE_WIDTH) return 'none'

  const gl = (() => {
    try {
      const probe = document.createElement('canvas')
      return probe.getContext('webgl2') ?? probe.getContext('webgl')
    } catch {
      // Some privacy modes throw rather than returning null.
      return null
    }
  })()
  if (!gl) return 'none'

  const cores = navigator.hardwareConcurrency ?? 4
  const roomy = window.innerWidth >= 900 && window.innerHeight >= 600
  return cores >= 8 && roomy ? 'high' : 'low'
}

let probed: SceneSupport | undefined

/**
 * Whether this device gets the 3D scene, and how much of it. Probed once and
 * remembered: it is a fact about the environment, opening a GL context is not
 * free, and both the backdrop and the page loader need the answer.
 */
export function sceneSupport(): SceneSupport {
  return (probed ??= detect())
}
