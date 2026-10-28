import type { CSSProperties } from 'react'

// A space inside an inline-block collapses to nothing; this one holds its width.
const NBSP = String.fromCharCode(0xa0)

/**
 * A label whose letters roll up and are replaced from below, one after
 * another, when the nearest `.roll-host` ancestor is hovered or focused. The
 * styles live in global.css. Assistive tech reads the plain label; the
 * letters are decoration.
 */
export function RollText({ text }: { text: string }) {
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span className="roll" aria-hidden="true">
        {[...text].map((letter, i) => {
          const shown = letter === ' ' ? NBSP : letter
          return (
            <span key={i} className="roll-letter" style={{ '--i': i } as CSSProperties}>
              <span data-letter={shown}>{shown}</span>
            </span>
          )
        })}
      </span>
    </>
  )
}
