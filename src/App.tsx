import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router'
import { Backdrop } from '@/components/Backdrop'
import { LiquidCursor } from '@/components/LiquidCursor'
import { ScrollProgress } from '@/components/ScrollProgress'
import { Nav } from '@/components/Nav'
import { StationRail } from '@/components/StationRail'
import { useHashScroll } from '@/lib/useHashScroll'
import Home from '@/routes/Home'
import NotFound from '@/routes/NotFound'

/**
 * The standalone single-file build has no server to resolve paths against, so
 * it runs on MemoryRouter. Everything else uses real URLs.
 */
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  useHashScroll()

  return (
    <Router basename={import.meta.env.VITE_ROUTER === 'memory' ? undefined : import.meta.env.BASE_URL}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Backdrop />
      <ScrollProgress />
      <Nav />
      <StationRail />
      <main id="main">
        <AppRoutes />
      </main>
      <LiquidCursor />
    </Router>
  )
}
