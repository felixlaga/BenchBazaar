import { createFileRoute } from '@tanstack/react-router'
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

export const Route = createFileRoute('/settings/collections')({
  head: () => ({
    meta: [
      { title: 'Curator collections · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: CollectionSettingsPage,
})

function CollectionSettingsPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Curator tools</p>
        <h1>Manage transparent collections.</h1>
        <p>
          Ordering is explicitly editorial. Pageviews are never treated as a
          quality score.
        </p>
      </header>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a href="/api/auth/sign-in?returnPathname=%2Fsettings%2Fcollections">
            Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <CollectionRoleGate />
      </Authenticated>
    </div>
  )
}

function CollectionRoleGate() {
  const viewer = useQuery(api.users.viewer, {})
  if (!viewer) return <p>Loading profile…</p>
  if (viewer.role === 'member') {
    return (
      <StatusBanner variant="warning" title="Curator access required">
        Your account cannot manage editorial collections.
      </StatusBanner>
    )
  }
  return <CollectionWorkspace />
}

function CollectionWorkspace() {
  const workspace = useQuery(api.moderation.collectionWorkspace, {})
  const save = useMutation(api.moderation.saveCollection)
  const [selectedId, setSelectedId] = useState<string>('new')
  const [message, setMessage] = useState('')
  if (!workspace) return <p>Loading collections…</p>
  const readyWorkspace = workspace
  const selected = workspace.collections.find(
    (collection) => collection.id === selectedId,
  )

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const requestedSlugs = String(data.get('benchmarkSlugs') ?? '')
      .split(/\r?\n|,/)
      .map((slug) => slug.trim())
      .filter(Boolean)
    const bySlug = new Map(
      readyWorkspace.benchmarks.map((benchmark) => [benchmark.slug, benchmark]),
    )
    const missing = requestedSlugs.filter((slug) => !bySlug.has(slug))
    if (missing.length) {
      setMessage(`Unknown or non-public benchmark: ${missing.join(', ')}`)
      return
    }
    try {
      const result = await save({
        ...(selected ? { collectionId: selected.id } : {}),
        slug: String(data.get('slug') ?? ''),
        title: String(data.get('title') ?? ''),
        description: String(data.get('description') ?? ''),
        status: data.get('status') === 'published' ? 'published' : 'draft',
        entries: requestedSlugs.map((slug) => ({
          benchmarkId: bySlug.get(slug)?.id as Id<'benchmarks'>,
        })),
      })
      setSelectedId(result.collectionId)
      setMessage(`Saved collection ${result.slug}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.')
    }
  }

  return (
    <>
      <label>
        Edit collection
        <select
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
        >
          <option value="new">New collection</option>
          {workspace.collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.title} · {collection.status}
            </option>
          ))}
        </select>
      </label>
      <form
        className="profile-form"
        key={selected?.id ?? 'new'}
        onSubmit={(event) => void submit(event)}
      >
        <label>
          Slug
          <input defaultValue={selected?.slug} name="slug" required />
        </label>
        <label>
          Title
          <input defaultValue={selected?.title} name="title" required />
        </label>
        <label>
          Description
          <textarea
            defaultValue={selected?.description}
            name="description"
            required
          />
        </label>
        <label>
          Status
          <select defaultValue={selected?.status ?? 'draft'} name="status">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label>
          Benchmark slugs, one per line, in display order
          <textarea
            defaultValue={selected?.entries
              .map(
                (entry) =>
                  workspace.benchmarks.find(
                    (benchmark) => benchmark.id === entry.benchmarkId,
                  )?.slug ?? '',
              )
              .filter(Boolean)
              .join('\n')}
            name="benchmarkSlugs"
          />
        </label>
        <button className="button button--ink" type="submit">
          Save collection
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </>
  )
}
