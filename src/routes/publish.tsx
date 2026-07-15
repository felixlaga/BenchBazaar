import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Check, Github, LockKeyhole, Store } from 'lucide-react'

export const Route = createFileRoute('/publish')({
  head: () => ({ meta: [{ title: 'Publish a benchmark · BenchBazaar' }] }),
  component: PublishPage,
})

function PublishPage() {
  return (
    <div className="page-shell publish-page">
      <header className="page-header">
        <p className="eyebrow">Set up your stall</p>
        <h1>Turn a useful question into an inspectable benchmark.</h1>
        <p>
          The authenticated editor is the next vertical slice. This scaffold
          already establishes the public contract it must publish into.
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
            Drafts, ownership, and publishing will be server-authorized through
            WorkOS identity and Convex. No browser-supplied user ID will be
            trusted.
          </p>
          <button
            className="button button--ink button--large"
            disabled
            type="button"
          >
            <Github aria-hidden="true" size={18} /> Sign in · setup required
          </button>
          <small>
            Configure the documented WorkOS environment before enabling this
            action.
          </small>
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
