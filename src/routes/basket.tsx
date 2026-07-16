import { createFileRoute } from '@tanstack/react-router'
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { Github, ShoppingBasket, Trash2 } from 'lucide-react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/basket')({
  head: () => ({
    meta: [
      { title: 'Saved benchmark basket · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: BasketPage,
})

function BasketPage() {
  return (
    <div className="page-shell basket-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Your basket</p>
        <h1>Benchmarks worth another look.</h1>
        <p>
          Saves are private to your account; public listing counts update
          atomically.
        </p>
      </header>
      <AuthLoading>
        <p className="save-state">Checking your basket…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a
            className="button button--ink"
            href="/api/auth/sign-in?returnPathname=%2Fbasket"
          >
            <Github aria-hidden="true" size={17} /> Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <BasketContents />
      </Authenticated>
    </div>
  )
}

function BasketContents() {
  const items = useQuery(api.basket.mine, {})
  const toggle = useMutation(api.basket.toggle)
  if (!items) return <p className="save-state">Unpacking your basket…</p>
  if (!items.length) {
    return (
      <div className="empty-state empty-state--large">
        <ShoppingBasket aria-hidden="true" size={32} />
        <strong>Your basket is empty.</strong>
        <p>Save a listing from any benchmark page.</p>
      </div>
    )
  }
  return (
    <div className="basket-list">
      {items.map((item) => (
        <article key={item.slug}>
          <div>
            <p className="eyebrow">{item.aisle}</p>
            <h2>
              <a href={`/b/${item.slug}`}>{item.title}</a>
            </h2>
            <p>{item.summary}</p>
            <code>v{item.version}</code>
          </div>
          <button
            className="button button--paper"
            onClick={() => void toggle({ slug: item.slug })}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} /> Remove
          </button>
        </article>
      ))}
    </div>
  )
}
