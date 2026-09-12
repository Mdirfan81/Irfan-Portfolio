import { Suspense, lazy, useCallback, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { AuroraBackground } from './AuroraBackground'

const JourneyCanvas = lazy(() => import('@/three/JourneyCanvas'))

type Support = 'none' | 'low' | 'high'

function detect(): Support {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'none'

  // Respect an explicit request to save data before spending 200KB on three.js.
  const connection = (navigator as { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return 'none'

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

/**
 * Chooses what sits behind the page.
 *
 * The CSS aurora always renders: it is cheap, it is the whole backdrop where
 * WebGL is unavailable, and it is what shows while three.js is still loading.
 * The 3D corridor layers on top when the device can carry it.
 */
export function Backdrop() {
  const reduced = useReducedMotion() ?? false
  // Probed once in a lazy initialiser: it is a read of the environment, it
  // costs about a millisecond, and test environments simply report 'none'.
  const [support, setSupport] = useState<Support>(detect)

  // The scene measures itself and hands the page back if it cannot keep up.
  const handleGiveUp = useCallback(() => setSupport('none'), [])

  return (
    <>
      <AuroraBackground />
      {support !== 'none' && (
        <Suspense fallback={null}>
          <JourneyCanvas quality={support} still={reduced} onGiveUp={handleGiveUp} />
        </Suspense>
      )}
    </>
  )
}
