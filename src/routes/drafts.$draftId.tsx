import { createFileRoute } from '@tanstack/react-router'
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react'
import { Github } from 'lucide-react'

import { StatusBanner } from '#/components/ui/status-banner'
import { DraftEditor } from '#/features/publishing/components/draft-editor'

export const Route = createFileRoute('/drafts/$draftId')({
  head: () => ({
    meta: [
      { title: 'Edit benchmark draft · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: DraftRoute,
})

function DraftRoute() {
  const { draftId } = Route.useParams()

  return (
    <div className="page-shell draft-page">
      <AuthLoading>
        <p className="save-state">Opening the stockroom…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a className="button button--ink" href="/api/auth/sign-in">
            <Github aria-hidden="true" size={17} /> Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <DraftEditor draftId={draftId} />
      </Authenticated>
    </div>
  )
}
