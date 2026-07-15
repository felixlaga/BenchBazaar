import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, PackageOpen } from 'lucide-react'

export function NotFoundPage() {
  return (
    <section className="page-state page-shell">
      <PackageOpen aria-hidden="true" size={42} strokeWidth={1.5} />
      <p className="eyebrow">404 · shelf not found</p>
      <h1>This stall has packed up.</h1>
      <p>The page may have moved, been archived, or never existed.</p>
      <Link className="button button--ink" to="/browse">
        <ArrowLeft aria-hidden="true" size={17} />
        Back to the bazaar
      </Link>
    </section>
  )
}

export function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="page-state page-shell">
      <AlertTriangle aria-hidden="true" size={42} strokeWidth={1.5} />
      <p className="eyebrow">Something went wrong</p>
      <h1>The market bell jammed.</h1>
      <p>
        Try again. If the problem continues, the request log can help us
        investigate.
      </p>
      <button className="button button--ink" onClick={reset} type="button">
        Try again
      </button>
    </section>
  )
}
