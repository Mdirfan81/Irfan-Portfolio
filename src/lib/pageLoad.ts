import { useSyncExternalStore } from 'react'
import { sceneSupport } from './sceneSupport'

/**
 * Whether the page is still held behind the loader.
 *
 * The loader covers everything until the 3D scene has drawn, so that the page
 * and its backdrop arrive together instead of the stars turning up late. It is
 * a module-level store, not context, because the things that care are far
 * apart: the backdrop ends it, the loader draws it, and the hero and the nav
 * hold their entrances until it is over.
 */

/** Long enough for the stars to gather into the bubble before it lets go. */
const MIN_MS = 1500
/** The page is never held longer than this, whatever the scene is doing. */
const MAX_MS = 6000

let loading: boolean | undefined
let startedAt = 0
const listeners = new Set<() => void>()

/** Only a device that is going to get the scene has anything to wait for. */
function begin(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  if (sceneSupport() === 'none') return false

  startedAt = performance.now()
  window.setTimeout(finish, MAX_MS)
  return true
}

function read(): boolean {
  return (loading ??= begin())
}

function finish() {
  if (!loading) return
  loading = false
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * The scene has drawn its first frame, or is never going to. Lifts the loader,
 * once it has been up for its minimum time. Safe to call more than once.
 */
export function releasePage() {
  if (!read()) return
  window.setTimeout(finish, Math.max(0, MIN_MS - (performance.now() - startedAt)))
}

export function usePageLoading(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
