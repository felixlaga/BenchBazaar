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

export const Route = createFileRoute('/settings/launch')({
  head: () => ({
    meta: [
      { title: 'Launch content review · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: LaunchSettingsPage,
})

function LaunchSettingsPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Launch gate</p>
        <h1>Record content-owner consent.</h1>
        <p>
          This administrative record covers public listing claims only. It does
          not make synthetic preview data launch-ready.
        </p>
      </header>
      <AuthLoading>
        <p>Checking administrator role…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a href="/api/auth/sign-in?returnPathname=%2Fsettings%2Flaunch">
            Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <LaunchRoleGate />
      </Authenticated>
    </div>
  )
}

function LaunchRoleGate() {
  const viewer = useQuery(api.users.viewer, {})
  if (!viewer) return <p>Loading profile…</p>
  if (viewer.role !== 'admin') {
    return (
      <StatusBanner variant="warning" title="Administrator access required">
        Your account cannot record launch content consent.
      </StatusBanner>
    )
  }
  return <LaunchWorkspace />
}

function LaunchWorkspace() {
  const workspace = useQuery(api.launch.workspace, {})
  const recordConsent = useMutation(api.launch.recordConsent)
  const [message, setMessage] = useState('')

  if (!workspace) return <p>Loading eligible benchmarks…</p>
  const readyWorkspace = workspace

  const pending = readyWorkspace.benchmarks.filter(
    (benchmark) => benchmark.consent === null,
  )
  const recorded = readyWorkspace.benchmarks.filter(
    (benchmark) => benchmark.consent !== null,
  )

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const evidenceUrl = String(data.get('evidenceUrl') ?? '').trim()
    setMessage('Recording consent…')
    try {
      await recordConsent({
        benchmarkId: String(data.get('benchmarkId')) as Id<'benchmarks'>,
        source:
          data.get('source') === 'written_release'
            ? 'written_release'
            : 'owner_submission',
        statement: readyWorkspace.statement,
        ...(evidenceUrl ? { evidenceUrl } : {}),
      })
      setMessage('Consent recorded in the audit log.')
      form.reset()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Consent failed.')
    }
  }

  return (
    <>
      <StatusBanner variant="warning" title="Verify before attesting">
        Record consent only after verifying the benchmark owner and the public
        evidence. Synthetic seed benchmarks are intentionally excluded.
      </StatusBanner>
      {pending.length === 0 ? (
        <p>No eligible published benchmark is awaiting consent.</p>
      ) : (
        <form className="profile-form" onSubmit={(event) => void submit(event)}>
          <label>
            Published benchmark
            <select name="benchmarkId" required>
              {pending.map((benchmark) => (
                <option key={benchmark.id} value={benchmark.id}>
                  {benchmark.title} ·{' '}
                  {benchmark.currentVersion ?? 'unversioned'} ·{' '}
                  {benchmark.publicRef}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence source
            <select name="source">
              <option value="owner_submission">Owner submission</option>
              <option value="written_release">Written release</option>
            </select>
          </label>
          <label>
            Evidence URL (HTTPS, optional)
            <input
              inputMode="url"
              name="evidenceUrl"
              placeholder="https://"
              type="url"
            />
          </label>
          <label>
            Exact attestation
            <textarea readOnly rows={5} value={readyWorkspace.statement} />
          </label>
          <button className="button button--ink" type="submit">
            Record verified consent
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      <section className="content-section">
        <h2>Recorded consents</h2>
        {recorded.length === 0 ? (
          <p>No consent has been recorded for real launch content.</p>
        ) : (
          <ul className="plain-list">
            {recorded.map((benchmark) => (
              <li key={benchmark.id}>
                <strong>{benchmark.title}</strong> ·{' '}
                {benchmark.consent?.source.replace('_', ' ')} ·{' '}
                {new Date(
                  benchmark.consent?.recordedAt ?? 0,
                ).toLocaleDateString()}
                {benchmark.consent?.evidenceUrl ? (
                  <>
                    {' · '}
                    <a href={benchmark.consent.evidenceUrl}>evidence</a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
