import { Link } from '@tanstack/react-router'
import { Authenticated, useMutation, useQuery } from 'convex/react'
import { BadgeCheck, CircleAlert, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../../convex/_generated/api'

export function ReceiptActions({ receiptId }: { receiptId: string }) {
  return (
    <Authenticated>
      <AuthorizedReceiptActions receiptId={receiptId} />
    </Authenticated>
  )
}

function AuthorizedReceiptActions({ receiptId }: { receiptId: string }) {
  const actions = useQuery(api.receipts.viewerActions, { receiptId })
  const markOfficial = useMutation(api.receipts.markMaintainerOfficial)
  const dispute = useMutation(api.receipts.dispute)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!actions || !Object.values(actions).some(Boolean)) return null

  async function designateOfficial() {
    setPending('official')
    setMessage(null)
    try {
      await markOfficial({ receiptId })
      setMessage('This exact receipt is now designated maintainer official.')
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'Could not update designation.',
      )
    } finally {
      setPending(null)
    }
  }

  async function openDispute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending('dispute')
    setMessage(null)
    try {
      await dispute({ receiptId, reason })
      setReason('')
      setMessage('The receipt is disputed and removed from ranking.')
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : 'Could not open dispute.',
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <section
      className="receipt-actions"
      aria-labelledby="receipt-actions-title"
    >
      <div>
        <p className="eyebrow">Authorized actions</p>
        <h2 id="receipt-actions-title">Preserve the paper trail.</h2>
        <p>
          Corrections create successors. Official designation does not alter
          signature facts. Disputes remain public and auditable.
        </p>
      </div>
      <div className="receipt-actions__controls">
        {actions.canSupersede && (
          <Link
            className="button button--paper"
            search={{ supersedes: receiptId }}
            to="/receipts/new"
          >
            <RefreshCw aria-hidden="true" size={16} /> Correct with successor
          </Link>
        )}
        {actions.canMarkOfficial && (
          <button
            className="button button--paper"
            disabled={pending !== null}
            onClick={() => void designateOfficial()}
            type="button"
          >
            <BadgeCheck aria-hidden="true" size={16} />
            {pending === 'official'
              ? 'Designating…'
              : 'Mark maintainer official'}
          </button>
        )}
        {actions.canDispute && (
          <form className="receipt-dispute-form" onSubmit={openDispute}>
            <label>
              Public dispute reason
              <textarea
                maxLength={1000}
                minLength={20}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain the exact provenance, configuration, or compatibility concern."
                required
                value={reason}
              />
            </label>
            <button
              className="button button--paper"
              disabled={pending !== null}
              type="submit"
            >
              <CircleAlert aria-hidden="true" size={16} />
              {pending === 'dispute' ? 'Opening dispute…' : 'Open dispute'}
            </button>
          </form>
        )}
        {message && <p className="save-state">{message}</p>}
      </div>
    </section>
  )
}
