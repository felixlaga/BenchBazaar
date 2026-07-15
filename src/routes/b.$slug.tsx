import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Box,
  Check,
  Github,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react'

import { SectionHeading } from '#/components/ui/section-heading'
import { StatusBanner } from '#/components/ui/status-banner'
import { FreeSampleCard } from '#/features/catalog/components/free-sample-card'
import { Scoreboard } from '#/features/catalog/components/scoreboard'
import { loadBenchmarkPage } from '#/features/catalog/server/catalog.functions'
import { formatDate } from '#/lib/format'

export const Route = createFileRoute('/b/$slug')({
  loader: async ({ params }) => {
    const result = await loadBenchmarkPage({ data: { slug: params.slug } })
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.benchmark.title} · BenchBazaar` },
          { name: 'description', content: loaderData.benchmark.summary },
        ]
      : [],
  }),
  component: BenchmarkPage,
})

function BenchmarkPage() {
  const { benchmark, receipts } = Route.useLoaderData()
  const track = benchmark.tracks[0]

  return (
    <div className="benchmark-page">
      <header className="benchmark-hero">
        <div className="page-shell">
          <Link className="back-link" to="/browse">
            <ArrowLeft aria-hidden="true" size={15} /> Back to browse
          </Link>
          <div className="benchmark-hero__layout">
            <div>
              <p className="eyebrow">
                {benchmark.aisle.label} · public listing
              </p>
              <h1>{benchmark.title}</h1>
              <p className="benchmark-hero__summary">{benchmark.summary}</p>
              <p className="benchmark-hero__byline">
                by <strong>@{benchmark.vendor.handle}</strong> · published{' '}
                {formatDate(benchmark.publishedAt)}
              </p>
              <div className="price-tags price-tags--large">
                <span className="price-tag">v{benchmark.version}</span>
                <span className="price-tag">{benchmark.modality}</span>
                <span className="price-tag">{benchmark.scorer}</span>
                <span className="price-tag">
                  {benchmark.sealedItemCount} sealed items
                </span>
              </div>
              <div className="benchmark-hero__actions">
                <a className="button button--ink" href="#scoreboard">
                  <ReceiptText aria-hidden="true" size={17} /> View results
                </a>
                <button className="button button--paper" disabled type="button">
                  Save to basket · soon
                </button>
              </div>
            </div>
            <aside className="listing-ticket">
              <div className="listing-ticket__awning" />
              <p>LISTING CARD</p>
              <strong>{benchmark.title}</strong>
              <span>VERSION {benchmark.version}</span>
              <span>{benchmark.publicSampleCount} FREE SAMPLES</span>
              <span>{benchmark.receiptCount} RECEIPTS</span>
              <div className="inspector-stamp">
                <ShieldCheck aria-hidden="true" size={18} /> OPEN METHOD
              </div>
            </aside>
          </div>
        </div>
      </header>

      <div className="page-shell benchmark-content">
        <nav aria-label="On this page" className="anchor-nav">
          <a href="#samples">Free samples</a>
          <a href="#scoreboard">Scoreboard</a>
          <a href="#method">Method</a>
          <a href="#limitations">Limitations</a>
        </nav>

        <StatusBanner variant="warning" title="Sealed set">
          <p>{benchmark.sealedSet.statement}</p>
          <p>{benchmark.sealedSet.endpointExposure}</p>
        </StatusBanner>

        <section className="content-section" id="samples">
          <SectionHeading
            description="These examples are intentionally public, have distinct IDs, and never count toward the official score."
            eyebrow="Try before you run"
            title="Free samples"
          />
          <div className="sample-grid">
            {benchmark.samples.map((sample, index) => (
              <FreeSampleCard
                key={sample.id}
                number={index + 1}
                sample={sample}
              />
            ))}
          </div>
        </section>

        <section className="content-section" id="scoreboard">
          <SectionHeading
            description={`One exact benchmark version and one compatible track: ${track.description}`}
            eyebrow={`${track.label} · version ${benchmark.version}`}
            title="Scoped scoreboard"
          />
          <Scoreboard receipts={receipts} />
          <p className="scoreboard-note">
            Every row links to a provenance receipt. No results are averaged
            into a global model intelligence score.
          </p>
        </section>

        <section className="content-section method-grid" id="method">
          <div>
            <p className="eyebrow">What it tests</p>
            <h2>{benchmark.purpose}</h2>
          </div>
          <div className="method-card">
            <BookOpenText aria-hidden="true" size={26} />
            <h3>Run recipe</h3>
            <p>{benchmark.method}</p>
            <dl>
              <div>
                <dt>Track</dt>
                <dd>{track.label}</dd>
              </div>
              <div>
                <dt>Primary metric</dt>
                <dd>
                  {track.primaryMetric.label} · {track.primaryMetric.direction}{' '}
                  is better
                </dd>
              </div>
              <div>
                <dt>Retries</dt>
                <dd>None</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="content-section limitations" id="limitations">
          <div>
            <p className="eyebrow">Fine print</p>
            <h2>What this score does not prove</h2>
          </div>
          <ul>
            {benchmark.limitations.map((limitation) => (
              <li key={limitation}>
                <Check aria-hidden="true" size={17} /> {limitation}
              </li>
            ))}
          </ul>
        </section>

        <section className="source-card">
          <Box aria-hidden="true" size={24} />
          <div>
            <p className="eyebrow">Source & reproducibility</p>
            <h2>Open method, synthetic preview</h2>
            <p>
              This scaffold contains only public sample records and aggregate
              synthetic results. The future runner integration owns hidden items
              and receipt signing.
            </p>
          </div>
          <a
            className="button button--paper"
            href="https://github.com/felixlaga/BenchBazaar"
            rel="noreferrer"
            target="_blank"
          >
            <Github aria-hidden="true" size={17} /> View source
          </a>
        </section>

        <div className="next-listing">
          <Link search={{ aisle: benchmark.aisle.id }} to="/browse">
            More from {benchmark.aisle.label}{' '}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
