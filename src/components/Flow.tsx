import { createElement, type ReactNode } from 'react'
import { useFlow } from '@/lib/flow'

type FlowProps = {
  children: ReactNode
  className?: string
  as?: 'div' | 'li' | 'article'
  /**
   * How the element moves as it flows:
   * `rise` tilts up from below, `left` slides in from the side, `zoom` grows
   * into place, `step` is a small nudge for a line inside a larger block, and
   * `none` only publishes the flow properties for its own CSS to use.
   */
  kind?: 'rise' | 'left' | 'zoom' | 'step' | 'none'
}

/**
 * Content that arrives and leaves with the scroll rather than playing once.
 * See `lib/flow.ts` for the engine and `global.css` for the movement.
 */
export function Flow({ children, className = '', as = 'div', kind = 'rise' }: FlowProps) {
  const ref = useFlow<HTMLElement>()
  const classes = kind === 'none' ? className : `flow flow--${kind} ${className}`.trim()

  return createElement(as, { ref, className: classes || undefined }, children)
}
