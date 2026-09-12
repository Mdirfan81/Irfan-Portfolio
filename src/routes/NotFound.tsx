import { Link } from 'react-router'
import { profile } from '@/data/profile'

export default function NotFound() {
  return (
    <section className="section" style={{ minHeight: '80svh', display: 'grid', placeItems: 'center' }}>
      <div className="shell" style={{ textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center' }}>
          404
        </p>
        <h1 className="section-title gradient-text" style={{ fontSize: 'var(--t-h1)' }}>
          This page does not exist
        </h1>
        <p className="section-lede" style={{ marginInline: 'auto' }}>
          The link may be out of date. Everything about {profile.firstName} lives on the home page.
        </p>
        <p style={{ marginTop: 'var(--sp-6)' }}>
          <Link className="btn btn--primary" to="/">
            Back to the portfolio
          </Link>
        </p>
      </div>
    </section>
  )
}
