import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { AuroraBackground } from './AuroraBackground'
import { ErrorBoundary } from './ErrorBoundary'
import { JourneyLoader } from './JourneyLoader'

const JourneyCanvas = lazy(() => import('@/three/JourneyCanvas'))

type Support = 'none' | 'low' | 'high'

function detect(): Support {
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

/** Phones keep the CSS aurora: the scene costs them the most and shows the least. */
const MIN_SCENE_WIDTH = 768

/**
 * True once the page has finished loading and the main thread has gone quiet.
 * The scene is decoration, so it must never compete with the content for the
 * network or the CPU during first paint.
 */
function useAfterLoadIdle(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let idle = 0
    let timer = 0

    const whenIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(() => setReady(true), { timeout: 2000 })
      } else {
        // Safari has no requestIdleCallback.
        timer = window.setTimeout(() => setReady(true), 200)
      }
    }

    if (document.readyState === 'complete') whenIdle()
    else window.addEventListener('load', whenIdle, { once: true })

    return () => {
      window.removeEventListener('load', whenIdle)
      if (idle) window.cancelIdleCallback(idle)
      clearTimeout(timer)
    }
  }, [])

  return ready
}

/**
 * Chooses what sits behind the page.
 *
 * The CSS aurora always renders: it is cheap, it is the whole backdrop where
 * WebGL is unavailable, and it is what shows while three.js is still loading.
 * The 3D star field layers on top when the device can carry it, with a small
 * loader standing in for it until it has drawn.
 */
export function Backdrop() {
  const reduced = useReducedMotion() ?? false
  // Probed once in a lazy initialiser: it is a read of the environment, it
  // costs about a millisecond, and test environments simply report 'none'.
  const [support, setSupport] = useState<Support>(detect)

  // The scene measures itself and hands the page back if it cannot keep up.
  const handleGiveUp = useCallback(() => setSupport('none'), [])
  const ready = useAfterLoadIdle()

  // Between first paint and the scene's first frame there is a wait for the
  // page to settle, a 240KB download and a shader compile. The loader holds the
  // constellation's place through all of it, and is only ever started for a
  // device that is going to get the scene.
  const [sceneDrawn, setSceneDrawn] = useState(false)
  const [loading, setLoading] = useState(() => support !== 'none')
  const handleFirstFrame = useCallback(() => setSceneDrawn(true), [])
  const handleLoaderGone = useCallback(() => setLoading(false), [])

  return (
    <>
      <AuroraBackground />
      {ready && support !== 'none' && (
        // The scene is decoration: if its chunk fails to arrive or it throws,
        // the page keeps the aurora and carries on.
        <ErrorBoundary fallback={null} onError={handleGiveUp}>
          <Suspense fallback={null}>
            <JourneyCanvas
              quality={support}
              still={reduced}
              onGiveUp={handleGiveUp}
              onFirstFrame={handleFirstFrame}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      {loading && !reduced && (
        <JourneyLoader done={sceneDrawn || support === 'none'} onGone={handleLoaderGone} />
      )}
    </>
  )
}
