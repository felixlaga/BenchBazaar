import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/requests')({
  head: () => ({
    meta: [
      { title: 'Run requests · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: RunRequestsPage,
})

function RunRequestsPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Run coordination</p>
        <h1>Requests and owner queue.</h1>
        <p>
          Execution remains operator-controlled and provider credentials stay
          outside BenchBazaar.
        </p>
        <Link className="button button--ink" to="/requests/new">
          Request a run
        </Link>
      </header>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a href="/api/auth/sign-in?returnPathname=%2Frequests">
            Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <RunRequestWorkspace />
      </Authenticated>
    </div>
  )
}

function RunRequestWorkspace() {
  const mine = useQuery(api.runRequests.mine, {})
  const ownerQueue = useQuery(api.runRequests.ownerQueue, {})
  const transition = useMutation(api.runRequests.transition)
  const [message, setMessage] = useState('')

  async function act(
    publicId: string,
    action:
      | 'approve'
      | 'decline'
      | 'assign'
      | 'start'
      | 'succeed'
      | 'fail'
      | 'cancel',
    form?: HTMLFormElement,
  ) {
    const data = form ? new FormData(form) : new FormData()
    try {
      await transition({
        publicId,
        action,
        ...(String(data.get('runnerPublicId') ?? '').trim()
          ? { runnerPublicId: String(data.get('runnerPublicId')) }
          : {}),
        ...(String(data.get('receiptPublicId') ?? '').trim()
          ? { receiptPublicId: String(data.get('receiptPublicId')) }
          : {}),
        ...(String(data.get('errorCode') ?? '').trim()
          ? { errorCode: String(data.get('errorCode')) }
          : {}),
        ...(String(data.get('note') ?? '').trim()
          ? { note: String(data.get('note')) }
          : {}),
      })
      setMessage(`Recorded ${action} for ${publicId}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed.')
    }
  }

  return (
    <>
      {message && <p role="status">{message}</p>}
      <RequestList
        empty="You have not requested a run."
        requests={mine ?? []}
        title="My requests"
      />
      <section className="content-section">
        <h2>Owner queue</h2>
        {(ownerQueue ?? []).length === 0 ? (
          <p>No requests target benchmarks you own.</p>
        ) : (
          (ownerQueue ?? []).map((request) => (
            <article className="version-card" key={request.publicId}>
              <div>
                <Link
                  params={{ requestId: request.publicId }}
                  to="/requests/$requestId"
                >
                  <strong>{request.benchmark.title}</strong>
                </Link>
                <p>
                  {request.status} · {request.requestedModelId} ·{' '}
                  {request.trackId}
                </p>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                }}
              >
                <label>
                  Public-safe note
                  <input maxLength={1000} name="note" />
                </label>
                {request.status === 'requested' && (
                  <>
                    <button
                      className="button button--paper"
                      onClick={(event) =>
                        void act(
                          request.publicId,
                          'approve',
                          event.currentTarget.form ?? undefined,
                        )
                      }
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="button button--paper"
                      onClick={(event) =>
                        void act(
                          request.publicId,
                          'decline',
                          event.currentTarget.form ?? undefined,
                        )
                      }
                      type="button"
                    >
                      Decline
                    </button>
                  </>
                )}
                {(request.status === 'approved' ||
                  request.status === 'failed') && (
                  <>
                    <label>
                      Runner public ID
                      <input name="runnerPublicId" required />
                    </label>
                    <button
                      className="button button--paper"
                      onClick={(event) =>
                        void act(
                          request.publicId,
                          'assign',
                          event.currentTarget.form ?? undefined,
                        )
                      }
                      type="button"
                    >
                      Assign runner
                    </button>
                  </>
                )}
                {request.status === 'assigned' && (
                  <button
                    className="button button--paper"
                    onClick={(event) =>
                      void act(
                        request.publicId,
                        'start',
                        event.currentTarget.form ?? undefined,
                      )
                    }
                    type="button"
                  >
                    Mark running
                  </button>
                )}
                {request.status === 'running' && (
                  <>
                    <label>
                      Closing receipt ID
                      <input name="receiptPublicId" />
                    </label>
                    <button
                      className="button button--paper"
                      onClick={(event) =>
                        void act(
                          request.publicId,
                          'succeed',
                          event.currentTarget.form ?? undefined,
                        )
                      }
                      type="button"
                    >
                      Link receipt and complete
                    </button>
                    <label>
                      Safe failure code
                      <input name="errorCode" />
                    </label>
                    <button
                      className="button button--paper"
                      onClick={(event) =>
                        void act(
                          request.publicId,
                          'fail',
                          event.currentTarget.form ?? undefined,
                        )
                      }
                      type="button"
                    >
                      Mark failed
                    </button>
                  </>
                )}
              </form>
            </article>
          ))
        )}
      </section>
    </>
  )
}

function RequestList({
  title,
  empty,
  requests,
}: {
  title: string
  empty: string
  requests: Array<{
    publicId: string
    benchmark: { title: string; version: string }
    status: string
    requestedModelId: string
  }>
}) {
  return (
    <section className="content-section">
      <h2>{title}</h2>
      {requests.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul className="plain-list">
          {requests.map((request) => (
            <li key={request.publicId}>
              <Link
                params={{ requestId: request.publicId }}
                to="/requests/$requestId"
              >
                {request.benchmark.title} v{request.benchmark.version}
              </Link>{' '}
              · {request.status} · <code>{request.requestedModelId}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
