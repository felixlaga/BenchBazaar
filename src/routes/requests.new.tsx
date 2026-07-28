import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/requests/new')({
  head: () => ({
    meta: [
      { title: 'Request a run · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: NewRunRequestPage,
})

function NewRunRequestPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Operator-controlled evaluation</p>
        <h1>Request one exact run.</h1>
        <p>
          BenchBazaar never asks for provider keys. The benchmark owner chooses
          whether and where to execute the request.
        </p>
      </header>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a href="/api/auth/sign-in?returnPathname=%2Frequests%2Fnew">
            Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <RunRequestForm />
      </Authenticated>
    </div>
  )
}

function RunRequestForm() {
  const options = useQuery(api.runRequests.options, {})
  const createRequest = useMutation(api.runRequests.create)
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  if (!options) return <p>Loading available versions and tracks…</p>
  const choices = options.flatMap((benchmark) =>
    benchmark.versions.flatMap((version) =>
      version.tracks.map((track) => ({
        value: `${version.id}|${track.id}`,
        label: `${benchmark.title} · v${version.version} · ${track.label}`,
      })),
    ),
  )

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const [benchmarkVersionId, trackId] = String(
      data.get('target') ?? '',
    ).split('|')
    if (!benchmarkVersionId || !trackId) {
      setMessage('Choose an exact benchmark version and track.')
      return
    }
    setMessage('Creating run request…')
    try {
      const result = await createRequest({
        benchmarkVersionId: benchmarkVersionId as Id<'benchmarkVersions'>,
        trackId,
        requestedModelId: String(data.get('requestedModelId') ?? ''),
        ...(String(data.get('endpointUrl') ?? '').trim()
          ? { endpointUrl: String(data.get('endpointUrl')) }
          : {}),
        endpointExposureAcknowledged: true,
      })
      await navigate({
        to: '/requests/$requestId',
        params: { requestId: result.publicId },
      })
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not create request.',
      )
    }
  }

  return (
    <form className="profile-form" onSubmit={(event) => void submit(event)}>
      <label>
        Exact version and track
        <select name="target" required>
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Exact requested model ID
        <input
          maxLength={240}
          minLength={2}
          name="requestedModelId"
          placeholder="provider/model-2026-07-28"
          required
        />
      </label>
      <label>
        Optional public HTTPS endpoint
        <input name="endpointUrl" type="url" />
        <small>
          Do not paste API keys, authorization headers, or embedded credentials.
        </small>
      </label>
      <label className="confirmation-check">
        <input name="acknowledgement" required type="checkbox" />I understand
        that a model endpoint may retain prompts it receives and that “sealed”
        means hidden from public download, not impossible to leak.
      </label>
      <button className="button button--ink" type="submit">
        Request run
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
