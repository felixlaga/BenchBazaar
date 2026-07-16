import { createFileRoute } from '@tanstack/react-router'
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react'
import { Github } from 'lucide-react'
import { z } from 'zod'

import { StatusBanner } from '#/components/ui/status-banner'
import { ReceiptSubmissionForm } from '#/features/receipts/components/receipt-submission-form'

const receiptSearchSchema = z.object({
  slug: z.string().trim().max(120).optional().catch(undefined),
  version: z.string().trim().max(40).optional().catch(undefined),
  track: z.string().trim().max(60).optional().catch(undefined),
  supersedes: z.string().trim().max(80).optional().catch(undefined),
})

export const Route = createFileRoute('/receipts/new')({
  validateSearch: (search) => receiptSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: 'Submit a result receipt · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: NewReceiptRoute,
})

function NewReceiptRoute() {
  const search = Route.useSearch()
  return (
    <div className="page-shell receipt-submit-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Manual result receipt</p>
        <h1>Attach an aggregate result to one exact contract.</h1>
        <p>
          BenchBazaar validates version, track, scorer, digests, item count, and
          model identity. Public artifact links strengthen provenance but do not
          certify correctness.
        </p>
      </header>
      <AuthLoading>
        <p className="save-state">Checking your receipt book…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a
            className="button button--ink"
            href="/api/auth/sign-in?returnPathname=%2Freceipts%2Fnew"
          >
            <Github aria-hidden="true" size={17} /> Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <ReceiptSubmissionForm
          initialSlug={search.slug}
          initialTrack={search.track}
          initialVersion={search.version}
          supersedesReceiptId={search.supersedes}
        />
      </Authenticated>
    </div>
  )
}
