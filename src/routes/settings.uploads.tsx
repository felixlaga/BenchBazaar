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

export const Route = createFileRoute('/settings/uploads')({
  head: () => ({
    meta: [
      { title: 'Public image uploads · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: UploadSettingsPage,
})

function UploadSettingsPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Public media</p>
        <h1>Upload a benchmark cover image.</h1>
        <p>
          Only JPEG, PNG, and WebP images up to 5 MB are accepted. SVG, HTML,
          scripts, packages, and sealed benchmark files are rejected.
        </p>
      </header>
      <AuthLoading>
        <p className="save-state">Checking your stall key…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a href="/api/auth/sign-in?returnPathname=%2Fsettings%2Fuploads">
            Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <UploadForm />
      </Authenticated>
    </div>
  )
}

function UploadForm() {
  const benchmarks = useQuery(api.uploads.options, {})
  const createIntent = useMutation(api.uploads.createIntent)
  const finalize = useMutation(api.uploads.finalize)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  if (!benchmarks) return <p>Loading owned benchmarks…</p>

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const file = data.get('image')
    if (!(file instanceof File)) {
      setMessage('Choose an image file.')
      return
    }
    const benchmarkId = String(
      data.get('benchmarkId') ?? '',
    ) as Id<'benchmarks'>
    setPending(true)
    setMessage('Validating and uploading image…')
    try {
      const intent = await createIntent({})
      if (
        file.size > intent.maxBytes ||
        !intent.allowedContentTypes.includes(file.type)
      ) {
        setMessage('The selected file does not meet the upload contract.')
        return
      }
      const response = await fetch(intent.uploadUrl, {
        method: 'POST',
        headers: { 'content-type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('Storage upload failed.')
      const result = (await response.json()) as { storageId: Id<'_storage'> }
      const finalized = await finalize({
        intentId: intent.intentId,
        storageId: result.storageId,
        benchmarkId,
      })
      setMessage(
        finalized.accepted
          ? 'Public cover image saved.'
          : `Upload rejected: ${finalized.code}`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="profile-form" onSubmit={(event) => void submit(event)}>
      <label>
        Benchmark
        <select name="benchmarkId" required>
          {benchmarks.map((benchmark) => (
            <option key={benchmark.id} value={benchmark.id}>
              {benchmark.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Public image
        <input
          accept="image/jpeg,image/png,image/webp"
          name="image"
          required
          type="file"
        />
      </label>
      <button className="button button--ink" disabled={pending} type="submit">
        {pending ? 'Uploading…' : 'Upload public image'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
