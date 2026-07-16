import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ArrowRight, FilePenLine, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'
import { formatDate } from '#/lib/format'

import { api } from '../../../../convex/_generated/api'

export function OwnerWorkspace({ compact = false }: { compact?: boolean }) {
  const workspace = useQuery(api.drafts.mine, {})
  const createDraft = useMutation(api.drafts.create)
  const createSuccessor = useMutation(api.drafts.createSuccessor)
  const navigate = useNavigate()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!workspace) {
    return <p className="save-state">Opening your stall workspace…</p>
  }

  async function startDraft() {
    setPending('new')
    setError(null)
    try {
      const result = await createDraft({})
      await navigate({
        to: '/drafts/$draftId',
        params: { draftId: result.draftId },
      })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not create draft.',
      )
      setPending(null)
    }
  }

  async function startSuccessor(slug: string) {
    setPending(slug)
    setError(null)
    try {
      const result = await createSuccessor({ slug })
      await navigate({
        to: '/drafts/$draftId',
        params: { draftId: result.draftId },
      })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not create successor.',
      )
      setPending(null)
    }
  }

  if (!workspace.profile.profileComplete) {
    return (
      <StatusBanner variant="warning" title="Choose your public stall handle">
        Publishing needs a stable, unique public handle first. Private WorkOS
        identity fields are never shown on the stall.
        <div>
          <Link className="button button--ink" to="/settings/profile">
            Complete profile <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </StatusBanner>
    )
  }

  return (
    <section
      className={
        compact ? 'owner-workspace owner-workspace--compact' : 'owner-workspace'
      }
    >
      <div className="owner-workspace__heading">
        <div>
          <p className="eyebrow">@{workspace.profile.handle}</p>
          <h2>{compact ? 'Start publishing' : 'Your stall workspace'}</h2>
        </div>
        <button
          className="button button--ink"
          disabled={pending !== null}
          onClick={() => void startDraft()}
          type="button"
        >
          <Plus aria-hidden="true" size={17} />
          {pending === 'new' ? 'Opening draft…' : 'Create benchmark draft'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {!compact && (
        <>
          <div className="workspace-stats">
            <div>
              <strong>{workspace.drafts.length}</strong>
              <span>active drafts</span>
            </div>
            <div>
              <strong>{workspace.published.length}</strong>
              <span>published benchmarks</span>
            </div>
            <div>
              <strong>{workspace.basketCount}</strong>
              <span>basket saves</span>
            </div>
          </div>

          <section className="workspace-section">
            <h3>Drafts</h3>
            {workspace.drafts.length ? (
              <div className="workspace-list">
                {workspace.drafts.map((draft) => (
                  <article key={draft.id}>
                    <FilePenLine aria-hidden="true" size={20} />
                    <div>
                      <strong>{draft.title}</strong>
                      <small>
                        v{draft.proposedVersion} · {draft.status} · saved{' '}
                        {formatDate(new Date(draft.updatedAt).toISOString())}
                      </small>
                    </div>
                    <Link params={{ draftId: draft.id }} to="/drafts/$draftId">
                      Continue editing
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No drafts in the stockroom.</strong>
                <p>Create one only when you are ready to start editing.</p>
              </div>
            )}
          </section>

          <section className="workspace-section">
            <h3>Published</h3>
            {workspace.published.length ? (
              <div className="workspace-list">
                {workspace.published.map((benchmark) => (
                  <article key={benchmark.slug}>
                    <div>
                      <strong>{benchmark.title}</strong>
                      <small>
                        v{benchmark.version} · {benchmark.receiptCount} receipts
                        · {benchmark.saveCount} saves
                      </small>
                    </div>
                    <Link params={{ slug: benchmark.slug }} to="/b/$slug">
                      View listing
                    </Link>
                    <button
                      className="text-button"
                      disabled={pending !== null}
                      onClick={() => void startSuccessor(benchmark.slug)}
                      type="button"
                    >
                      <RefreshCw aria-hidden="true" size={15} />
                      {pending === benchmark.slug
                        ? 'Opening successor…'
                        : 'Create successor'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No published wares yet.</strong>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
