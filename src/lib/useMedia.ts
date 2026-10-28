import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether a media query matches, kept in sync as the window changes. False
 * where matchMedia is missing, which keeps server and test renders on the
 * simplest layout.
 */
export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', onChange)
      return () => list?.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  )
}
