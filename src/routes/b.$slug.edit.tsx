import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
} from 'convex/react'
import { Github, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/b/$slug/edit')({
  head: () => ({
    meta: [
      { title: 'Create successor draft · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: SuccessorPage,
})

function SuccessorPage() {
  const { slug } = Route.useParams()
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Immutable correction workflow</p>
        <h1>Create a successor for {slug}.</h1>
        <p>
          The current published version will remain unchanged. Its public fields
          and samples are copied into a new mutable draft.
        </p>
      </header>
      <AuthLoading>
        <p className="save-state">Checking ownership…</p>
      </AuthLoading>
      <Unauthenticated>
        <a className="button button--ink" href="/api/auth/sign-in">
          <Github aria-hidden="true" size={17} /> Continue with GitHub
        </a>
      </Unauthenticated>
      <Authenticated>
        <SuccessorAction slug={slug} />
      </Authenticated>
    </div>
  )
}

function SuccessorAction({ slug }: { slug: string }) {
  const createSuccessor = useMutation(api.drafts.createSuccessor)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <StatusBanner title="Published versions stay put">
      <p>
        Only the benchmark owner can create this draft. Convex derives ownership
        from the validated token.
      </p>
      <button
        className="button button--ink"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError(null)
          try {
            const result = await createSuccessor({ slug })
            await navigate({
              to: '/drafts/$draftId',
              params: { draftId: result.draftId },
            })
          } catch (cause) {
            setPending(false)
            setError(
              cause instanceof Error
                ? cause.message
                : 'Could not create successor.',
            )
          }
        }}
        type="button"
      >
        <RefreshCw aria-hidden="true" size={17} />
        {pending ? 'Opening successor…' : 'Create successor draft'}
      </button>
      {error && <p className="form-error">{error}</p>}
    </StatusBanner>
  )
}
