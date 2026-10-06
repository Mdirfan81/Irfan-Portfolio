import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { releasePage, usePageLoading } from '@/lib/pageLoad'
import { sceneSupport, type SceneSupport } from '@/lib/sceneSupport'
import { AuroraBackground } from './AuroraBackground'
import { ErrorBoundary } from './ErrorBoundary'

const JourneyCanvas = lazy(() => import('@/three/JourneyCanvas'))

/**
 * True once the page has finished loading and the main thread has gone quiet.
 * Where the content is on show from the start, the scene is decoration and
 * must never compete with it for the network or the CPU during first paint.
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
 * The CSS aurora always renders: it is cheap, and it is the whole backdrop
 * where WebGL is unavailable. The 3D star field layers on top when the device
 * can carry it, and tells the page loader when it has drawn.
 */
export function Backdrop() {
  const reduced = useReducedMotion() ?? false
  const [support, setSupport] = useState<SceneSupport>(sceneSupport)

  // The scene measures itself and hands the page back if it cannot keep up.
  // Giving up also lifts the loader: there is nothing left to wait for.
  const handleGiveUp = useCallback(() => {
    setSupport('none')
    releasePage()
  }, [])

  // While the loader has the page covered there is no content for the scene to
  // get in the way of, and every moment it takes is a moment the visitor
  // waits, so it starts at once. Otherwise it waits its turn.
  const loading = usePageLoading()
  const [eager] = useState(loading)
  const idle = useAfterLoadIdle()

  return (
    <>
      <AuroraBackground />
      {(eager || idle) && support !== 'none' && (
        // The scene is decoration: if its chunk fails to arrive or it throws,
        // the page keeps the aurora and carries on.
        <ErrorBoundary fallback={null} onError={handleGiveUp}>
          <Suspense fallback={null}>
            <JourneyCanvas
              quality={support}
              still={reduced}
              onGiveUp={handleGiveUp}
              onFirstFrame={releasePage}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}
