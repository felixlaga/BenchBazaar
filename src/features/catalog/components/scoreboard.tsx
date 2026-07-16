import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'

import { formatScore } from '#/lib/format'

import type { Receipt, Track } from '../domain/catalog'

export function Scoreboard({
  receipts,
  track,
}: {
  receipts: Array<Receipt>
  track: Track
}) {
  if (receipts.length === 0) {
    return (
      <div className="empty-state">
        <strong>No receipts yet.</strong>
        <p>The method is here; the models have not made it to the checkout.</p>
      </div>
    )
  }

  return (
    <div className="scoreboard-wrap">
      <table className="scoreboard">
        <caption className="sr-only">
          Model results for {track.label}, exact track ID {track.id}
        </caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Exact model</th>
            <th scope="col">
              {track.primaryMetric.label}{' '}
              {track.primaryMetric.direction === 'higher' ? '↑' : '↓'}
            </th>
            <th scope="col">Evidence</th>
            <th scope="col">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((receipt, index) => (
            <tr key={receipt.id}>
              <td data-label="Rank">{index + 1}</td>
              <td data-label="Exact model">
                <Link
                  params={{ modelSlug: receipt.model.slug }}
                  to="/models/$modelSlug"
                >
                  <strong>{receipt.model.displayName}</strong>
                </Link>
                <code>{receipt.model.exactId}</code>
              </td>
              <td data-label="Score">
                <strong className="scoreboard__score">
                  {formatScore(
                    receipt.primaryMetric.value,
                    receipt.primaryMetric.unit,
                  )}
                </strong>
              </td>
              <td data-label="Evidence">
                <span className="verification-label">
                  {receipt.verification.label}
                </span>
              </td>
              <td data-label="Receipt">
                <Link
                  aria-label={`Open receipt ${receipt.id}`}
                  params={{ receiptId: receipt.id }}
                  to="/receipts/$receiptId"
                >
                  {receipt.id} <ExternalLink aria-hidden="true" size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
