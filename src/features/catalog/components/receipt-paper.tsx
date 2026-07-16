import { Link } from '@tanstack/react-router'
import { BadgeCheck, ExternalLink } from 'lucide-react'

import { formatDate, formatScore } from '#/lib/format'

import type { Receipt } from '../domain/catalog'

export function ReceiptPaper({ receipt }: { receipt: Receipt }) {
  return (
    <article className="receipt-paper">
      <header>
        <span className="receipt-paper__mark">BB</span>
        <div>
          <p>BenchBazaar result receipt</p>
          <strong>{receipt.id}</strong>
        </div>
      </header>
      <div className="receipt-paper__divider">• • • • • • • • • • • •</div>
      <dl>
        <div>
          <dt>Benchmark</dt>
          <dd>
            <Link
              params={{
                slug: receipt.benchmark.slug,
                version: receipt.benchmark.version,
              }}
              to="/b/$slug/v/$version"
            >
              {receipt.benchmark.title}{' '}
              <ExternalLink aria-hidden="true" size={13} />
            </Link>
          </dd>
        </div>
        <div>
          <dt>Version / track</dt>
          <dd>
            {receipt.benchmark.version} / {receipt.trackId}
          </dd>
        </div>
        <div>
          <dt>Exact model ID</dt>
          <dd>
            <Link
              params={{ modelSlug: receipt.model.slug }}
              to="/models/$modelSlug"
            >
              {receipt.model.exactId}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Run completed</dt>
          <dd>{formatDate(receipt.completedAt)}</dd>
        </div>
        <div>
          <dt>Scorer version</dt>
          <dd>{receipt.scorerVersion}</dd>
        </div>
        <div>
          <dt>Evaluated items</dt>
          <dd>{receipt.itemCount}</dd>
        </div>
      </dl>
      <div className="receipt-paper__divider">— — — — — — — — — — —</div>
      <div className="receipt-paper__primary-score">
        <span>{receipt.primaryMetric.label}</span>
        <strong>
          {formatScore(receipt.primaryMetric.value, receipt.primaryMetric.unit)}
        </strong>
      </div>
      <dl>
        {receipt.metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="receipt-paper__divider">— — — — — — — — — — —</div>
      <dl className="receipt-paper__digests">
        <div>
          <dt>Configuration digest</dt>
          <dd>{receipt.configurationDigest}</dd>
        </div>
        <div>
          <dt>Dataset digest</dt>
          <dd>{receipt.datasetDigest}</dd>
        </div>
      </dl>
      <div className="inspector-stamp">
        <BadgeCheck aria-hidden="true" size={18} />
        {receipt.verification.label}
      </div>
      <div className="inspector-stamp">
        {receipt.state.label} ·{' '}
        {receipt.compatibility.compatible ? 'compatible' : 'incompatible'}
      </div>
      {receipt.synthetic && (
        <footer>Synthetic preview data · not a real model claim</footer>
      )}
    </article>
  )
}
