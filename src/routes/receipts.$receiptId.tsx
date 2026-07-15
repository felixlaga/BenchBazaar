import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, BadgeCheck, CircleAlert } from 'lucide-react'

import { StatusBanner } from '#/components/ui/status-banner'
import { ReceiptPaper } from '#/features/catalog/components/receipt-paper'
import { loadReceipt } from '#/features/catalog/server/catalog.functions'

export const Route = createFileRoute('/receipts/$receiptId')({
  loader: async ({ params }) => {
    const receipt = await loadReceipt({ data: { receiptId: params.receiptId } })
    if (!receipt) throw notFound()
    return receipt
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.id} · BenchBazaar receipt` },
          {
            name: 'description',
            content: `Result receipt for ${loaderData.model.displayName} on ${loaderData.benchmark.title} version ${loaderData.benchmark.version}.`,
          },
        ]
      : [],
  }),
  component: ReceiptPage,
})

function ReceiptPage() {
  const receipt = Route.useLoaderData()

  return (
    <div className="page-shell receipt-page">
      <Link
        className="back-link"
        params={{ slug: receipt.benchmark.slug }}
        to="/b/$slug"
      >
        <ArrowLeft aria-hidden="true" size={15} /> Back to benchmark
      </Link>
      <header className="page-header page-header--compact">
        <p className="eyebrow">Result provenance</p>
        <h1>A claim with a paper trail.</h1>
        <p>
          This receipt binds one model result to one exact benchmark version and
          track.
        </p>
      </header>

      <StatusBanner title="Synthetic preview receipt">
        This record demonstrates the receipt format. It is not a real
        performance claim and was not produced by a live model evaluation.
      </StatusBanner>

      <div className="receipt-page__layout">
        <ReceiptPaper receipt={receipt} />
        <aside className="receipt-interpretation">
          <div className="inspector-stamp inspector-stamp--large">
            <BadgeCheck aria-hidden="true" size={22} />
            {receipt.verification.label}
          </div>
          <h2>What this evidence means</h2>
          <p>{receipt.verification.explanation}</p>
          <div className="interpretation-card">
            <CircleAlert aria-hidden="true" size={21} />
            <div>
              <strong>Provenance is not universal truth.</strong>
              <p>
                A signature can prove which runner produced an unchanged
                payload. It cannot make the benchmark scientifically infallible.
              </p>
            </div>
          </div>
          <h3>Compatibility boundary</h3>
          <ul>
            <li>Benchmark version {receipt.benchmark.version}</li>
            <li>Track {receipt.trackId}</li>
            <li>Exact model ID {receipt.model.exactId}</li>
            <li>{receipt.itemCount} evaluated items</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
