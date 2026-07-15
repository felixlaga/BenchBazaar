import { Link } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck } from 'lucide-react'

import { formatDate, formatScore } from '#/lib/format'

import type { Receipt } from '../domain/catalog'

export function ReceiptPreview({ receipt }: { receipt: Receipt }) {
  return (
    <article className="receipt-preview">
      <div className="receipt-preview__topline">
        <span>{receipt.id}</span>
        <span>{formatDate(receipt.submittedAt)}</span>
      </div>
      <h3>{receipt.benchmark.title}</h3>
      <p className="receipt-preview__model">{receipt.model.displayName}</p>
      <div className="receipt-preview__score">
        <span>{receipt.primaryMetric.label}</span>
        <strong>
          {formatScore(receipt.primaryMetric.value, receipt.primaryMetric.unit)}
        </strong>
      </div>
      <div className="receipt-preview__status">
        <BadgeCheck aria-hidden="true" size={16} />
        {receipt.verification.label}
      </div>
      <Link params={{ receiptId: receipt.id }} to="/receipts/$receiptId">
        Inspect receipt <ArrowRight aria-hidden="true" size={15} />
      </Link>
    </article>
  )
}
