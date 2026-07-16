import { createFileRoute } from '@tanstack/react-router'
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react'
import { Github } from 'lucide-react'

import { StatusBanner } from '#/components/ui/status-banner'
import { OwnerWorkspace } from '#/features/publishing/components/owner-workspace'

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
        <OwnerWorkspace />
      </Authenticated>
    </div>
  )
}
