import { Link, createFileRoute } from '@tanstack/react-router'
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react'
import { ArrowRight, Check, Github, LockKeyhole, Store } from 'lucide-react'

import { OwnerWorkspace } from '#/features/publishing/components/owner-workspace'
import { createSeoMetadata } from '#/lib/seo/metadata'

export const Route = createFileRoute('/publish')({
  head: ({ match }) =>
    createSeoMetadata({
      siteOrigin: match.context.siteOrigin,
      pathname: '/publish',
      title: 'Publish a benchmark · BenchBazaar',
      description:
        'Create a versioned LLM benchmark listing with public methods, sample items, scoring rules, limitations, and a sealed-set policy.',
    }),
  component: PublishPage,
})

function PublishPage() {
  return (
    <div className="page-shell publish-page">
      <header className="page-header">
        <p className="eyebrow">Set up your stall</p>
        <h1>Turn a useful question into an inspectable benchmark.</h1>
        <p>
          Build the listing, public samples, tracks, sealed-set policy, and
          limitations in the browser. Convex owns autosave, validation,
          ownership, and the atomic immutable publish.
        </p>
      </header>

      <div className="publish-preview">
        <section>
          <Store aria-hidden="true" size={29} />
          <h2>What authors will provide</h2>
          <ul>
            {[
              'A clear purpose and short listing summary',
              'At least three intentionally public free samples',
              'One versioned track and primary metric',
              'A scorer recipe and honest limitations',
              'A sealed-set policy with no hidden content upload',
            ].map((item) => (
              <li key={item}>
                <Check aria-hidden="true" size={16} /> {item}
              </li>
            ))}
          </ul>
        </section>
        <aside>
          <LockKeyhole aria-hidden="true" size={28} />
          <p className="eyebrow">Authentication boundary</p>
          <h2>GitHub sign-in through WorkOS</h2>
          <p>
            Drafts, ownership, and publishing are server-authorized through
            WorkOS identity and Convex. No browser-supplied user ID will be
            trusted.
          </p>
          <PublishAuthState />
        </aside>
      </div>

      <div className="next-listing">
        <Link to="/about">
          Read the publishing and trust model{' '}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </div>
  )
}

function PublishAuthState() {
  return (
    <>
      <AuthLoading>
        <button
          className="button button--ink button--large"
          disabled
          type="button"
        >
          Checking session…
        </button>
      </AuthLoading>
      <Unauthenticated>
        <a
          className="button button--ink button--large"
          href="/api/auth/sign-in?returnPathname=%2Fpublish"
        >
          <Github aria-hidden="true" size={18} /> Sign in with GitHub
        </a>
        <small>Authentication is handled by WorkOS AuthKit.</small>
      </Unauthenticated>
      <Authenticated>
        <OwnerWorkspace compact />
      </Authenticated>
    </>
  )
}
