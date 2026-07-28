import { createFileRoute } from '@tanstack/react-router'
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/moderation')({
  head: () => ({
    meta: [
      { title: 'Moderation queue · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ModerationPage,
})

function ModerationPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Trust operations</p>
        <h1>Moderation queue.</h1>
        <p>
          Actions preserve public history and write audit events. No moderation
          tool has a sealed-content path.
        </p>
      </header>
      <AuthLoading>
        <p>Checking moderator role…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a href="/api/auth/sign-in?returnPathname=%2Fmoderation">
            Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <RoleGate />
      </Authenticated>
    </div>
  )
}

function RoleGate() {
  const viewer = useQuery(api.users.viewer, {})
  if (!viewer) return <p>Loading profile…</p>
  if (viewer.role !== 'moderator' && viewer.role !== 'admin') {
    return (
      <StatusBanner variant="warning" title="Moderator access required">
        Your account cannot access the private moderation queue.
      </StatusBanner>
    )
  }
  return <ModerationWorkspace />
}

function ModerationWorkspace() {
  const queue = useQuery(api.moderation.queue, {})
  const runnerKeys = useQuery(api.runners.moderatorList, {})
  const resolveReport = useMutation(api.moderation.resolveReport)
  const setBenchmarkStatus = useMutation(api.moderation.setBenchmarkStatus)
  const setReceiptStatus = useMutation(api.moderation.setReceiptStatus)
  const setRunnerStatus = useMutation(api.runners.moderateStatus)
  const [message, setMessage] = useState('')

  async function actOnReport(
    event: React.FormEvent<HTMLFormElement>,
    report: {
      id: Id<'reports'>
      targetType: 'benchmark' | 'receipt'
      targetId: string
    },
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const intent = String(data.get('intent'))
    const reason = String(data.get('reason') ?? '')
    setMessage('Applying moderation action…')
    try {
      if (intent === 'dismiss') {
        await resolveReport({
          reportId: report.id,
          status: 'dismissed',
          resolution: reason,
        })
      } else {
        if (report.targetType === 'benchmark') {
          await setBenchmarkStatus({
            slug: report.targetId,
            status: intent === 'suspend' ? 'suspended' : 'hidden',
            reason,
          })
        } else {
          await setReceiptStatus({
            receiptPublicId: report.targetId,
            status: intent === 'dispute' ? 'disputed' : 'invalid',
            reason,
          })
        }
        await resolveReport({
          reportId: report.id,
          status: 'resolved',
          resolution: reason,
        })
      }
      setMessage('Moderation action recorded.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed.')
    }
  }

  return (
    <>
      {message && <p role="status">{message}</p>}
      <section className="content-section">
        <h2>Open reports</h2>
        {!queue ? (
          <p>Loading reports…</p>
        ) : queue.length === 0 ? (
          <p>No reports need review.</p>
        ) : (
          queue.map((report) => (
            <article className="version-card" key={report.id}>
              <div>
                <strong>
                  {report.targetType}: {report.targetLabel}
                </strong>
                <p>
                  {report.category} · reported by @{report.reporterHandle}
                </p>
                <p>{report.details}</p>
              </div>
              <form onSubmit={(event) => void actOnReport(event, report)}>
                <label>
                  Public-safe reason
                  <textarea
                    maxLength={1000}
                    minLength={10}
                    name="reason"
                    required
                  />
                </label>
                <button
                  className="button button--paper"
                  name="intent"
                  type="submit"
                  value="dismiss"
                >
                  Dismiss report
                </button>
                {report.targetType === 'benchmark' ? (
                  <>
                    <button
                      className="button button--paper"
                      name="intent"
                      type="submit"
                      value="hide"
                    >
                      Hide from discovery
                    </button>
                    <button
                      className="button button--paper"
                      name="intent"
                      type="submit"
                      value="suspend"
                    >
                      Suspend benchmark
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="button button--paper"
                      name="intent"
                      type="submit"
                      value="dispute"
                    >
                      Dispute receipt
                    </button>
                    <button
                      className="button button--paper"
                      name="intent"
                      type="submit"
                      value="invalidate"
                    >
                      Invalidate receipt
                    </button>
                  </>
                )}
              </form>
            </article>
          ))
        )}
      </section>

      <section className="content-section">
        <h2>Runner key lifecycle</h2>
        {(runnerKeys ?? []).map((key) => (
          <article className="version-card" key={key._id}>
            <div>
              <strong>{key.label}</strong>
              <p>
                {key.publicId} · {key.status}
              </p>
              <code>{key.fingerprint}</code>
            </div>
            {key.status !== 'revoked' && (
              <button
                className="button button--paper"
                onClick={() =>
                  void setRunnerStatus({
                    publicId: key.publicId,
                    status: key.status === 'suspended' ? 'active' : 'suspended',
                    reason:
                      key.status === 'suspended'
                        ? 'Moderator restored this runner after reviewing the suspension.'
                        : 'Moderator suspended this runner pending provenance review.',
                  }).catch((error) =>
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : 'Runner action failed.',
                    ),
                  )
                }
                type="button"
              >
                {key.status === 'suspended' ? 'Restore' : 'Suspend'}
              </button>
            )}
          </article>
        ))}
      </section>
    </>
  )
}
