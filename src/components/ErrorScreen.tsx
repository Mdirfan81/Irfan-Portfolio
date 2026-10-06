import { Mail, RotateCw } from 'lucide-react'
import { profile } from '@/data/profile'

type ErrorScreenProps = {
  /** Printed under the message in development only. */
  error?: Error
}

/**
 * What a visitor sees when part of the page has failed to render. Plain
 * anchors and a reload rather than router links: it has to work even when the
 * thing that broke is the router.
 */
export function ErrorScreen({ error }: ErrorScreenProps) {
  return (
    <section
      className="section"
      role="alert"
      style={{ minHeight: '80svh', display: 'grid', placeItems: 'center' }}
    >
      <div className="shell" style={{ textAlign: 'center' }}>
        <p className="eyebrow" style={{ justifyContent: 'center' }}>
          Error
        </p>
        <h1 className="section-title gradient-text" style={{ fontSize: 'var(--t-h1)' }}>
          Something broke on this page
        </h1>
        <p className="section-lede" style={{ marginInline: 'auto' }}>
          That is a fault in the site, not anything you did. Reloading usually clears it, and email
          reaches {profile.firstName} either way.
        </p>
        {import.meta.env.DEV && error && (
          <p
            style={{
              marginTop: 'var(--sp-4)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-sm)',
              color: 'var(--c-text-muted)',
            }}
          >
            {error.message}
          </p>
        )}
        <p
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 'var(--sp-3)',
            marginTop: 'var(--sp-6)',
          }}
        >
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            <RotateCw size={16} aria-hidden />
            Reload the page
          </button>
          <a className="btn" href={`mailto:${profile.email}`}>
            <Mail size={16} aria-hidden />
            Email {profile.firstName}
          </a>
        </p>
      </div>
    </section>
  )
}
