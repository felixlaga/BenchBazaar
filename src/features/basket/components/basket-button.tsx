import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { Check, ShoppingBasket } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../../convex/_generated/api'

export function BasketButton({ slug }: { slug: string }) {
  return (
    <>
      <AuthLoading>
        <button className="button button--paper" disabled type="button">
          Basket…
        </button>
      </AuthLoading>
      <Unauthenticated>
        <a
          className="button button--paper"
          href={`/api/auth/sign-in?returnPathname=${encodeURIComponent(`/b/${slug}`)}`}
        >
          <ShoppingBasket aria-hidden="true" size={16} /> Sign in to save
        </a>
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedBasketButton slug={slug} />
      </Authenticated>
    </>
  )
}

function AuthenticatedBasketButton({ slug }: { slug: string }) {
  const status = useQuery(api.basket.status, { slug })
  const toggle = useMutation(api.basket.toggle)
  const [pending, setPending] = useState(false)

  return (
    <button
      className="button button--paper"
      disabled={!status || pending}
      onClick={async () => {
        setPending(true)
        try {
          await toggle({ slug })
        } finally {
          setPending(false)
        }
      }}
      type="button"
    >
      {status?.saved ? (
        <Check aria-hidden="true" size={16} />
      ) : (
        <ShoppingBasket aria-hidden="true" size={16} />
      )}
      {pending
        ? 'Updating…'
        : status?.saved
          ? 'Saved to basket'
          : 'Save to basket'}
    </button>
  )
}
