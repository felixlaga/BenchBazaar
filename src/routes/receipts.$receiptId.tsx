import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, CircleAlert, ExternalLink } from 'lucide-react'

import { CopyButton } from '#/components/ui/copy-button'
import { StatusBanner } from '#/components/ui/status-banner'
import { ReceiptPaper } from '#/features/catalog/components/receipt-paper'
import { ReportForm } from '#/features/moderation/components/report-form'
import { ReceiptActions } from '#/features/receipts/components/receipt-actions'
import { createSeoMetadata } from '#/lib/seo/metadata'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/receipts/$receiptId')({
  loader: async ({ context, params }) => {
    const receipt = await context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(api.catalog.receiptByPublicId, {
        receiptId: params.receiptId,
      }),
    )
    if (!receipt) throw notFound()
    return receipt
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? createSeoMetadata({
          siteOrigin: match.context.siteOrigin,
          pathname: `/receipts/${loaderData.id}`,
          title: `${loaderData.id} · BenchBazaar receipt`,
          description: `Result receipt for ${loaderData.model.displayName} on ${loaderData.benchmark.title} version ${loaderData.benchmark.version}.`,
          imageAlt: `Result receipt for ${loaderData.model.displayName} on ${loaderData.benchmark.title}`,
        })
      : {},
  component: ReceiptPage,
})

function ReceiptPage() {
  const { receiptId } = Route.useParams()
  const { data: receipt } = useSuspenseQuery(
    convexQuery(api.catalog.receiptByPublicId, { receiptId }),
  )

  if (!receipt) throw notFound()

  return (
    <div className="page-shell receipt-page">
      <Link
        className="back-link"
        params={{
          slug: receipt.benchmark.slug,
          version: receipt.benchmark.version,
        }}
        to="/b/$slug/v/$version"
      >
        <ArrowLeft aria-hidden="true" size={15} /> Back to exact benchmark
        version
      </Link>
      <header className="page-header page-header--compact">
        <p className="eyebrow">Result provenance</p>
        <h1>A claim with a paper trail.</h1>
        <p>
          This receipt binds one model result to one exact benchmark version and
          track.
        </p>
      </header>

      {receipt.synthetic && (
        <StatusBanner title="Synthetic preview receipt">
          This record demonstrates the receipt format. It is not a real
          performance claim and was not produced by a live model evaluation.
        </StatusBanner>
      )}

      {receipt.state.status !== 'valid' && (
        <StatusBanner variant="warning" title={receipt.state.label}>
          <p>{receipt.state.explanation}</p>
          {receipt.state.reason && <p>{receipt.state.reason}</p>}
          {receipt.supersededBy && (
            <Link
              params={{ receiptId: receipt.supersededBy }}
              to="/receipts/$receiptId"
            >
              View successor receipt {receipt.supersededBy}
            </Link>
          )}
        </StatusBanner>
      )}

      {!receipt.compatibility.compatible && (
        <StatusBanner variant="warning" title="Incompatible receipt">
          {receipt.compatibility.explanation}
        </StatusBanner>
      )}

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
            <li>
              Benchmark version{' '}
              <Link
                params={{
                  slug: receipt.benchmark.slug,
                  version: receipt.benchmark.version,
                }}
                to="/b/$slug/v/$version"
              >
                {receipt.benchmark.version}
              </Link>
            </li>
            <li>
              Track <code>{receipt.trackId}</code>
            </li>
            <li>
              Exact model ID{' '}
              <Link
                params={{ modelSlug: receipt.model.slug }}
                to="/models/$modelSlug"
              >
                <code>{receipt.model.exactId}</code>
              </Link>
            </li>
            <li>{receipt.itemCount} evaluated items</li>
            <li>
              Manifest <code>{receipt.manifestDigest}</code>
            </li>
          </ul>
          {receipt.modelIdentityWarning && (
            <StatusBanner variant="warning" title="Model identity warning">
              {receipt.modelIdentityWarning}
            </StatusBanner>
          )}
          <h3>Public run configuration</h3>
          <p>{receipt.configurationSummary}</p>
          <ul>
            <li>Completed {receipt.completedAt}</li>
            <li>
              Endpoint exposure: {receipt.endpointExposure.replaceAll('_', ' ')}
            </li>
            <li>
              Submitted model ID <code>{receipt.submittedModelId}</code>
            </li>
          </ul>
          {receipt.signatureFingerprint && (
            <>
              <h3>Signature fingerprint</h3>
              <code>{receipt.signatureFingerprint}</code>
            </>
          )}
          {receipt.artifacts.length > 0 && (
            <>
              <h3>Public evidence</h3>
              <ul>
                {receipt.artifacts.map((artifact) => (
                  <li key={artifact.url}>
                    <a href={artifact.url} rel="noreferrer" target="_blank">
                      {artifact.label}{' '}
                      <ExternalLink aria-hidden="true" size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {receipt.notes && (
            <>
              <h3>Submitter notes</h3>
              <p>{receipt.notes}</p>
            </>
          )}
        </aside>
      </div>

      <ReceiptActions receiptId={receipt.id} />
      <ReportForm targetId={receipt.id} targetType="receipt" />

      <section className="receipt-share" aria-labelledby="receipt-share-title">
        <div>
          <p className="eyebrow">Share the exact claim</p>
          <h2 id="receipt-share-title">URL, badge, or public JSON</h2>
          <p>
            Every share target names this immutable public receipt. It contains
            no hidden prompts, answers, or private identity fields.
          </p>
        </div>
        <div className="receipt-share__actions">
          <CopyButton value={`{{origin}}/receipts/${receipt.id}`}>
            Copy public URL
          </CopyButton>
          <CopyButton
            value={`[![BenchBazaar receipt ${receipt.id}]({{origin}}/api/social/receipt/${receipt.id})]({{origin}}/receipts/${receipt.id})`}
          >
            Copy Markdown badge
          </CopyButton>
          <a
            className="button button--paper"
            href={`/api/receipts/${receipt.id}`}
          >
            Public JSON <ExternalLink aria-hidden="true" size={15} />
          </a>
        </div>
      </section>
    </div>
  )
}
