import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowRight, ReceiptText } from 'lucide-react'

import { formatDate } from '#/lib/format'

import { api } from '../../../../convex/_generated/api'

export function ReceiptWorkspace() {
  const receipts = useQuery(api.receipts.mine, {})
  if (receipts === undefined) {
    return <p className="save-state">Opening your receipt book…</p>
  }

  return (
    <section className="workspace-section receipt-workspace">
      <div className="owner-workspace__heading">
        <div>
          <p className="eyebrow">Result provenance</p>
          <h2>Your submitted receipts</h2>
        </div>
        <Link className="button button--ink" to="/receipts/new">
          <ReceiptText aria-hidden="true" size={17} /> Submit a result
        </Link>
      </div>
      {receipts.length ? (
        <div className="workspace-list">
          {receipts.map((receipt) => (
            <article key={receipt.id}>
              <ReceiptText aria-hidden="true" size={20} />
              <div>
                <strong>{receipt.benchmarkTitle}</strong>
                <small>
                  v{receipt.version} / {receipt.trackId} · {receipt.model} ·{' '}
                  {receipt.state} ·{' '}
                  {receipt.compatible ? 'compatible' : 'incompatible'} ·{' '}
                  {formatDate(new Date(receipt.submittedAt).toISOString())}
                </small>
              </div>
              <Link
                params={{ receiptId: receipt.id }}
                to="/receipts/$receiptId"
              >
                Inspect <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No receipts submitted from this account.</strong>
          <p>
            Manual results are self-reported unless a validated public artifact
            is linked.
          </p>
        </div>
      )}
    </section>
  )
}
