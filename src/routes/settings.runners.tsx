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

export const Route = createFileRoute('/settings/runners')({
  head: () => ({
    meta: [
      { title: 'Runner keys · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: RunnerSettingsPage,
})

function RunnerSettingsPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Signed runners</p>
        <h1>Register public signing keys.</h1>
        <p>
          Generate keys locally with <code>pnpm bb-runner keygen</code>. Only
          the public key belongs here; private keys never leave the runner.
        </p>
      </header>
      <AuthLoading>
        <p className="save-state">Checking your session…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a
            className="button button--ink"
            href="/api/auth/sign-in?returnPathname=%2Fsettings%2Frunners"
          >
            Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <RunnerKeyWorkspace />
      </Authenticated>
    </div>
  )
}

function RunnerKeyWorkspace() {
  const keys = useQuery(api.runners.mine, {})
  const benchmarks = useQuery(api.runners.registrationOptions, {})
  const register = useMutation(api.runners.register)
  const revoke = useMutation(api.runners.revoke)
  const [scope, setScope] = useState<'all_owner_benchmarks' | 'benchmark'>(
    'all_owner_benchmarks',
  )
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setMessage('Registering public key…')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const result = await register({
        label: String(form.get('label') ?? ''),
        publicKeySpki: String(form.get('publicKeySpki') ?? ''),
        scope,
        ...(scope === 'benchmark'
          ? {
              benchmarkId: String(
                form.get('benchmarkId') ?? '',
              ) as Id<'benchmarks'>,
            }
          : {}),
      })
      setMessage(`Registered ${result.fingerprint}`)
      formElement.reset()
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Registration failed.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="dashboard-grid">
      <form className="profile-form" onSubmit={(event) => void submit(event)}>
        <StatusBanner variant="warning" title="Private-key boundary">
          Never paste a private key, seed phrase, provider credential, hidden
          benchmark item, or scored fixture into this form.
        </StatusBanner>
        <label>
          Runner label
          <input maxLength={80} minLength={2} name="label" required />
        </label>
        <label>
          Public key (SPKI, base64url)
          <textarea
            autoComplete="off"
            maxLength={200}
            minLength={40}
            name="publicKeySpki"
            required
          />
        </label>
        <label>
          Scope
          <select
            onChange={(event) =>
              setScope(
                event.target.value as 'all_owner_benchmarks' | 'benchmark',
              )
            }
            value={scope}
          >
            <option value="all_owner_benchmarks">All benchmarks I own</option>
            <option value="benchmark">One exact benchmark</option>
          </select>
        </label>
        {scope === 'benchmark' && (
          <label>
            Benchmark
            <select name="benchmarkId" required>
              {(benchmarks ?? []).map((benchmark) => (
                <option key={benchmark.id} value={benchmark.id}>
                  {benchmark.title} · v{benchmark.version}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="button button--ink" disabled={pending} type="submit">
          {pending ? 'Registering…' : 'Register public key'}
        </button>
        {message && <p role="status">{message}</p>}
      </form>

      <section>
        <h2>Registered keys</h2>
        {!keys ? (
          <p>Loading runner keys…</p>
        ) : keys.length === 0 ? (
          <p>No runner keys registered.</p>
        ) : (
          <ul className="plain-list">
            {keys.map((key) => (
              <li key={key.publicId}>
                <strong>{key.label}</strong>
                <br />
                <code>{key.fingerprint}</code>
                <br />
                <span>
                  {key.status} ·{' '}
                  {key.benchmark?.title ?? 'all owner benchmarks'}
                </span>
                {key.status !== 'revoked' && (
                  <>
                    {' '}
                    <button
                      className="button button--paper"
                      onClick={() =>
                        void revoke({ publicId: key.publicId }).catch((error) =>
                          setMessage(
                            error instanceof Error
                              ? error.message
                              : 'Revocation failed.',
                          ),
                        )
                      }
                      type="button"
                    >
                      Revoke
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
