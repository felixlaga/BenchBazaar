import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react'

import { formatCompactNumber } from '#/lib/format'

import type { BenchmarkSummary } from '../domain/catalog'

type MarketCardProps = {
  benchmark: BenchmarkSummary
  featured?: boolean
}

export function MarketCard({ benchmark, featured = false }: MarketCardProps) {
  return (
    <article
      className={`market-card${featured ? ' market-card--featured' : ''}`}
    >
      <div
        aria-hidden="true"
        className={`awning awning--${benchmark.aisle.id}`}
      />
      {benchmark.coverImageUrl && (
        <img
          alt=""
          className="market-card__cover"
          loading="lazy"
          src={benchmark.coverImageUrl}
        />
      )}
      <div className="market-card__body">
        <div className="market-card__overline">
          <span>{benchmark.aisle.label}</span>
          {benchmark.curatorPick && (
            <span className="inspector-stamp inspector-stamp--small">
              <Sparkles aria-hidden="true" size={12} /> Curator pick
            </span>
          )}
        </div>
        <h3>
          <Link params={{ slug: benchmark.slug }} to="/b/$slug">
            {benchmark.title}
            <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </h3>
        <p>{benchmark.summary}</p>
        <div aria-label="Benchmark facts" className="price-tags">
          <span className="price-tag">
            {benchmark.sealedItemCount} sealed items
          </span>
          <span className="price-tag">{benchmark.scorer}</span>
          {benchmark.runnerAvailable && (
            <span className="price-tag price-tag--positive">
              <ShieldCheck aria-hidden="true" size={13} /> Runner available
            </span>
          )}
        </div>
        <footer className="market-card__footer">
          <span>
            by <strong>@{benchmark.vendor.handle}</strong>
          </span>
          <span>
            <ReceiptText aria-hidden="true" size={15} />
            {formatCompactNumber(benchmark.receiptCount)} receipts
          </span>
        </footer>
      </div>
    </article>
  )
}
