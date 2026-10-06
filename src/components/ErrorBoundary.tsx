import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
  /** Shown in place of the subtree that failed. `null` for decoration the page can do without. */
  fallback: ReactNode | ((error: Error) => ReactNode)
  onError?: (error: Error, info: ErrorInfo) => void
}

type ErrorBoundaryState = { error: Error | null }

/**
 * Stops an error thrown while rendering at the edge of the subtree it came
 * from, so one broken part costs that part and not the whole page. Without a
 * boundary React unmounts everything and leaves a blank screen.
 *
 * A class because catching a render error is still something only a class
 * component can do.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(thrown: unknown): ErrorBoundaryState {
    return { error: thrown instanceof Error ? thrown : new Error(String(thrown)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const { fallback } = this.props
    return typeof fallback === 'function' ? fallback(error) : fallback
  }
}
