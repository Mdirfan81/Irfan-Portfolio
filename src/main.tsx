// Global styles are imported first on purpose: base and utility classes must
// land in the bundle ahead of the CSS modules that override them, otherwise
// module rules of equal specificity lose to `.btn`, `.chip` and friends.
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorScreen } from './components/ErrorScreen'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    {/* The last resort, for whatever the boundaries inside App do not cover:
        the nav, the router, the app shell itself. */}
    <ErrorBoundary
      fallback={(error) => (
        <main>
          <ErrorScreen error={error} />
        </main>
      )}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
