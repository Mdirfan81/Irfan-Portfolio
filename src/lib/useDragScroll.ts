import { useEffect, type RefObject } from 'react'

/** How far the mouse must move before a press becomes a drag, in pixels. */
const SLOP = 5
/** How far ahead a fling carries the row, in milliseconds of its speed. */
const FLING_MS = 160

/**
 * Lets a mouse drag a sideways scroller, as a finger swipes it. A mouse
 * cannot otherwise move one: the wheel scrolls the page, and the row hides its
 * scrollbar. On release the row settles on the nearest child, carried on a
 * little by the speed it was let go at, the way the snap would place it under
 * a finger. A drag does not also click whatever it started on.
 *
 * Only a mouse is handled; touch and pen keep the browser's own scrolling.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const view = ref.current
    if (!view || !enabled) return

    let press: { id: number; x: number; left: number } | null = null
    let dragging = false
    let dragged = false
    // The last two positions, for the speed at release.
    let last = { x: 0, t: 0 }
    let speed = 0
    let restore = 0

    const settle = () => {
      const pad = parseFloat(getComputedStyle(view).scrollPaddingInlineStart) || 0
      const aim = view.scrollLeft - speed * FLING_MS
      const track = view.firstElementChild
      let left = view.scrollLeft
      let best = Infinity
      for (const slot of Array.from(track?.children ?? []) as HTMLElement[]) {
        const at = Math.min(Math.max(slot.offsetLeft - pad, 0), view.scrollWidth - view.clientWidth)
        if (Math.abs(at - aim) < best) {
          best = Math.abs(at - aim)
          left = at
        }
      }
      view.scrollTo({ left, behavior: 'smooth' })
      // The snap comes back once the row has arrived; back any sooner, it
      // would cut the glide short.
      const back = () => {
        window.clearTimeout(restore)
        view.style.removeProperty('scroll-snap-type')
        view.removeEventListener('scrollend', back)
      }
      view.addEventListener('scrollend', back)
      restore = window.setTimeout(back, 900)
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      press = { id: e.pointerId, x: e.clientX, left: view.scrollLeft }
      dragged = false
      last = { x: e.clientX, t: e.timeStamp }
      speed = 0
    }

    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return
      const dx = e.clientX - press.x
      if (!dragging && Math.abs(dx) < SLOP) return
      if (!dragging) {
        dragging = true
        dragged = true
        window.clearTimeout(restore)
        view.setPointerCapture(e.pointerId)
        // Snapping fights a row moved a pixel at a time, so it is off until
        // the row settles.
        view.style.scrollSnapType = 'none'
        view.dataset.dragging = ''
        window.getSelection()?.removeAllRanges()
      }
      view.scrollLeft = press.left - dx
      const dt = e.timeStamp - last.t
      if (dt > 0) speed = (e.clientX - last.x) / dt
      last = { x: e.clientX, t: e.timeStamp }
    }

    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return
      press = null
      if (!dragging) return
      dragging = false
      delete view.dataset.dragging
      if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId)
      // Let go after holding still, it does not fling.
      if (e.timeStamp - last.t > 80) speed = 0
      settle()
    }

    // The click that ends a drag is not a click on what it started over.
    const onClick = (e: MouseEvent) => {
      if (!dragged) return
      dragged = false
      e.preventDefault()
      e.stopPropagation()
    }
    // Nor does dragging pick up a link or select its text.
    const onDragStart = (e: DragEvent) => e.preventDefault()

    view.addEventListener('pointerdown', onDown)
    view.addEventListener('pointermove', onMove)
    view.addEventListener('pointerup', onUp)
    view.addEventListener('pointercancel', onUp)
    view.addEventListener('click', onClick, true)
    view.addEventListener('dragstart', onDragStart)
    return () => {
      window.clearTimeout(restore)
      view.removeEventListener('pointerdown', onDown)
      view.removeEventListener('pointermove', onMove)
      view.removeEventListener('pointerup', onUp)
      view.removeEventListener('pointercancel', onUp)
      view.removeEventListener('click', onClick, true)
      view.removeEventListener('dragstart', onDragStart)
      view.style.removeProperty('scroll-snap-type')
      delete view.dataset.dragging
    }
  }, [ref, enabled])
}
