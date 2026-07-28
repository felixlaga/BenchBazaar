import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Authenticated, Unauthenticated, useQuery } from 'convex/react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/requests/$requestId')({
  head: () => ({
    meta: [
      { title: 'Run request · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: RunRequestPage,
})

function RunRequestPage() {
  const { requestId } = Route.useParams()
  return (
    <div className="page-shell settings-page">
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a href="/api/auth/sign-in">Continue with GitHub</a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <RunRequestDetail publicId={requestId} />
      </Authenticated>
    </div>
  )
}

function RunRequestDetail({ publicId }: { publicId: string }) {
  const request = useQuery(api.runRequests.get, { publicId })
  if (request === undefined) return <p>Loading run request…</p>
  if (request === null) throw notFound()
  return (
    <>
      <header className="page-header page-header--compact">
        <p className="eyebrow">{request.publicId}</p>
        <h1>{request.benchmark.title}</h1>
        <p>
          v{request.benchmark.version} · <code>{request.trackId}</code> ·{' '}
          <code>{request.requestedModelId}</code>
        </p>
      </header>
      <StatusBanner title={`Status: ${request.status}`}>
        Last updated {new Date(request.updatedAt).toLocaleString()}.
      </StatusBanner>
      <dl>
        <dt>Requester</dt>
        <dd>@{request.requesterHandle}</dd>
        <dt>Assigned runner</dt>
        <dd>
          {request.runner
            ? `${request.runner.label} · ${request.runner.fingerprint}`
            : 'Not assigned'}
        </dd>
        <dt>Endpoint exposure acknowledged</dt>
        <dd>{request.endpointExposureAcknowledged ? 'Yes' : 'No'}</dd>
      </dl>
      {request.ownerNote && <p>{request.ownerNote}</p>}
      {request.errorCode && (
        <p>
          Failure code: <code>{request.errorCode}</code>
        </p>
      )}
      {request.receiptPublicId && (
        <Link
          params={{ receiptId: request.receiptPublicId }}
          to="/receipts/$receiptId"
        >
          Open closing receipt
        </Link>
      )}
      <p>
        <Link to="/requests">Open request workspace</Link>
      </p>
    </>
  )
}
