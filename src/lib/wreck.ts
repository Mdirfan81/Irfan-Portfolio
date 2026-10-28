/**
 * A button the contact droid has hit with a rocket: it is knocked askew with a
 * chunk blown out of its top edge, then rebuilds itself a few seconds later.
 * The look lives in CSS on `[data-wreck]` (see `.perch` in Contact.module.css);
 * this only steps the attribute through its states. The button keeps working
 * throughout, since the damage is only paint.
 */

/** How long a button stays broken after its last hit. */
const BROKEN_MS = 4200
/** How long the rebuild takes; matches the transition on `[data-wreck='mend']`. */
const MEND_MS = 1100

const timers = new Map<HTMLElement, number>()

/** Puts the button back as it was, at once. */
function clear(el: HTMLElement) {
  window.clearTimeout(timers.get(el))
  timers.delete(el)
  delete el.dataset.wreck
  el.style.removeProperty('--hit-x')
  el.style.removeProperty('--wreck-tilt')
}

/**
 * Breaks `el` where the rocket struck, `share` of the way across it. A second
 * hit while it is still broken jolts it again and starts the wait over.
 */
export function wreck(el: HTMLElement, share: number) {
  window.clearTimeout(timers.get(el))
  // A button already in pieces keeps the bite it has; moving it would make the
  // edge jump.
  if (el.dataset.wreck !== 'broken') {
    const across = Math.min(Math.max(share, 0.25), 0.75)
    const tilt = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3)
    el.style.setProperty('--hit-x', `${(across * 100).toFixed(1)}%`)
    el.style.setProperty('--wreck-tilt', `${tilt.toFixed(1)}deg`)
    el.dataset.wreck = 'broken'
  }
  // The jolt of the blast, through the Web Animations API so it can restart
  // on every hit; keyframes on the attribute would play only on the first.
  el.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(-5px, 3px) rotate(-2deg)' },
      { transform: 'translate(4px, -2px) rotate(1.5deg)' },
      { transform: 'translate(-2px, 1px)' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 380, easing: 'ease-out' },
  )
  timers.set(
    el,
    window.setTimeout(() => {
      el.dataset.wreck = 'mend'
      timers.set(el, window.setTimeout(() => clear(el), MEND_MS))
    }, BROKEN_MS),
  )
}

/** Mends every button at once, for when the droid goes away mid-repair. */
export function mendAll() {
  for (const el of [...timers.keys()]) clear(el)
}
