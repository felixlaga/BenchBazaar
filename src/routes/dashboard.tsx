import { Link, createFileRoute } from '@tanstack/react-router'
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useQuery,
} from 'convex/react'
import { Github } from 'lucide-react'

import { StatusBanner } from '#/components/ui/status-banner'
import { OwnerWorkspace } from '#/features/publishing/components/owner-workspace'
import { ReceiptWorkspace } from '#/features/receipts/components/receipt-workspace'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Stall dashboard · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="page-shell dashboard-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Owner dashboard</p>
        <h1>Stockroom, shelf, and basket.</h1>
        <p>
          Drafts autosave here. Published versions stay immutable; corrections
          start as successor drafts.
        </p>
      </header>
      <AuthLoading>
        <p className="save-state">Checking your stall key…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a
            className="button button--ink"
            href="/api/auth/sign-in?returnPathname=%2Fdashboard"
          >
            <Github aria-hidden="true" size={17} /> Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <DashboardLinks />
        <OwnerWorkspace />
        <ReceiptWorkspace />
      </Authenticated>
    </div>
  )
}

function DashboardLinks() {
  const viewer = useQuery(api.users.viewer, {})
  return (
    <p>
      <Link to="/requests">Run requests</Link> ·{' '}
      <Link to="/settings/runners">Runner keys</Link>
      {viewer?.role === 'admin' ? (
        <>
          {' · '}
          <Link to="/settings/launch">Launch content review</Link>
        </>
      ) : null}
    </p>
  )
}
