import { useEffect, useRef, useState } from 'react'
import { startJourneyLoader, type JourneyLoaderHandle } from '@/lib/journeyLoader'
import { usePageLoading } from '@/lib/pageLoad'
import styles from './JourneyLoader.module.css'

/** Matches the fade in the stylesheet, with a little to spare. */
const EXIT_MS = 1100

/**
 * Covers the page until the 3D scene has drawn, so the two arrive together.
 * What it shows is the scene's own material: the same stars, gathering into a
 * bubble of dots. See `lib/journeyLoader.ts` and `lib/loaderField.ts` for the
 * drawing, and `lib/pageLoad.ts` for when it starts and ends.
 *
 * It only hides the page from sight. The content underneath is in the document
 * the whole time, so a screen reader is never kept waiting on decoration.
 */
export function JourneyLoader() {
  const loading = usePageLoading()
  // Mounted while there is anything of it to see: through the wait, and then
  // through its own exit.
  const [mounted, setMounted] = useState(loading)
  const host = useRef<HTMLDivElement>(null)
  const field = useRef<JourneyLoaderHandle | null>(null)

  useEffect(() => {
    if (!host.current) return
    const started = startJourneyLoader(host.current, styles.field)
    field.current = started
    return () => {
      started.stop()
      field.current = null
    }
  }, [])

  useEffect(() => {
    if (loading || !mounted) return
    field.current?.release()
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => clearTimeout(timer)
  }, [loading, mounted])

  if (!mounted) return null

  return (
    <div
      ref={host}
      className={`${styles.loader} ${loading ? '' : styles.done}`}
      aria-hidden="true"
    />
  )
}
