import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Box,
  Check,
  Github,
  History,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react'

import { SectionHeading } from '#/components/ui/section-heading'
import { StatusBanner } from '#/components/ui/status-banner'
import { BasketButton } from '#/features/basket/components/basket-button'
import { formatDate } from '#/lib/format'

import type { BenchmarkPageData } from '../domain/catalog'
import { FreeSampleCard } from './free-sample-card'
import { MarketCard } from './market-card'
import { Scoreboard } from './scoreboard'

type BenchmarkPageProps = {
  data: BenchmarkPageData
  selectedTrackId?: string | undefined
  exactRoute?: boolean
}

export function BenchmarkPage({
  data,
  selectedTrackId,
  exactRoute = false,
}: BenchmarkPageProps) {
  const { benchmark, scoreboards } = data
  const scoreboard =
    scoreboards.find((candidate) => candidate.track.id === selectedTrackId) ??
    scoreboards[0]
  const track = scoreboard.track

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
                <Link
                  params={{ aisle: benchmark.aisle.id }}
                  to="/aisles/$aisle"
                >
                  {benchmark.aisle.label}
                </Link>{' '}
                · exact version
              </p>
              <h1>{benchmark.title}</h1>
              <p className="benchmark-hero__summary">{benchmark.summary}</p>
              <p className="benchmark-hero__byline">
                by{' '}
                <Link
                  params={{ handle: benchmark.vendor.handle }}
                  to="/stalls/$handle"
                >
                  <strong>@{benchmark.vendor.handle}</strong>
                </Link>{' '}
                · published {formatDate(benchmark.publishedAt)}
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
                {exactRoute ? (
                  <Link
                    className="button button--paper"
                    params={{ slug: benchmark.slug }}
                    to="/b/$slug"
                  >
                    View current version
                  </Link>
                ) : (
                  <Link
                    className="button button--paper"
                    params={{
                      slug: benchmark.slug,
                      version: benchmark.version,
                    }}
                    to="/b/$slug/v/$version"
                  >
                    Stable v{benchmark.version} URL
                  </Link>
                )}
                <BasketButton slug={benchmark.slug} />
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
          <a href="#versions">Versions</a>
        </nav>

        {!benchmark.isCurrent && (
          <StatusBanner
            variant="warning"
            title={`Historical version ${benchmark.version}`}
          >
            You are viewing an immutable earlier version. The current version is{' '}
            <Link params={{ slug: benchmark.slug }} to="/b/$slug">
              {benchmark.currentVersion}
            </Link>
            . Existing receipts remain scoped to this exact history.
          </StatusBanner>
        )}
        {benchmark.versionStatus === 'deprecated' && (
          <StatusBanner variant="warning" title="Retired from official runs">
            Existing receipts remain visible, but new official runs should use
            the current version.
          </StatusBanner>
        )}
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
            description="Every tab is one exact version and track. Incompatible, disputed, invalid, and superseded receipts never enter these rankings."
            eyebrow={`Version ${benchmark.version} · compatibility scoped`}
            title="Scoped scoreboard"
          />
          <div
            aria-label="Scoreboard track"
            className="track-tabs"
            role="tablist"
          >
            {benchmark.tracks.map((candidate) =>
              exactRoute ? (
                <Link
                  aria-selected={candidate.id === track.id}
                  className={
                    candidate.id === track.id
                      ? 'track-tab track-tab--active'
                      : 'track-tab'
                  }
                  key={candidate.id}
                  params={{ slug: benchmark.slug, version: benchmark.version }}
                  role="tab"
                  search={{ track: candidate.id }}
                  to="/b/$slug/v/$version"
                >
                  {candidate.label}
                  <code>{candidate.id}</code>
                </Link>
              ) : (
                <Link
                  aria-selected={candidate.id === track.id}
                  className={
                    candidate.id === track.id
                      ? 'track-tab track-tab--active'
                      : 'track-tab'
                  }
                  key={candidate.id}
                  params={{ slug: benchmark.slug }}
                  role="tab"
                  search={{ track: candidate.id }}
                  to="/b/$slug"
                >
                  {candidate.label}
                  <code>{candidate.id}</code>
                </Link>
              ),
            )}
          </div>
          <p className="track-description">{track.description}</p>
          <Scoreboard receipts={scoreboard.receipts} track={track} />
          <p className="scoreboard-note">
            Best valid compatible receipt per exact model. No result is averaged
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
                <dt>Track ID</dt>
                <dd>
                  <code>{track.id}</code>
                </dd>
              </div>
              <div>
                <dt>Primary metric</dt>
                <dd>
                  {track.primaryMetric.label} · {track.primaryMetric.direction}{' '}
                  is better
                </dd>
              </div>
              <div>
                <dt>Comparability</dt>
                <dd>{benchmark.comparability.replace('_', ' ')}</dd>
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

        <section className="content-section" id="versions">
          <SectionHeading
            description="Published snapshots do not change. Corrections create a successor and keep old receipts inspectable."
            eyebrow="Immutable history"
            title="Version shelf"
          />
          <div className="version-list">
            {benchmark.versions.map((version) => (
              <article
                className={
                  version.version === benchmark.version
                    ? 'version-card version-card--active'
                    : 'version-card'
                }
                key={version.version}
              >
                <History aria-hidden="true" size={20} />
                <div>
                  <h3>Version {version.version}</h3>
                  <p>{version.changelog}</p>
                  <small>
                    {version.status} · {version.comparability.replace('_', ' ')}
                  </small>
                </div>
                <Link
                  params={{ slug: benchmark.slug, version: version.version }}
                  to="/b/$slug/v/$version"
                >
                  Open exact version
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="source-card">
          <Box aria-hidden="true" size={24} />
          <div>
            <p className="eyebrow">Source & reproducibility</p>
            <h2>Open method, synthetic preview</h2>
            <p>
              This preview contains public samples and aggregate synthetic
              results only. Hidden scored content remains outside Convex and the
              web application.
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

        {data.relatedBenchmarks.length > 0 && (
          <section className="content-section">
            <SectionHeading
              eyebrow="Related wares"
              title={`More from ${benchmark.aisle.label}`}
            />
            <div className="card-grid">
              {data.relatedBenchmarks.map((related) => (
                <MarketCard benchmark={related} key={related.id} />
              ))}
            </div>
          </section>
        )}

        <div className="next-listing">
          <Link params={{ aisle: benchmark.aisle.id }} to="/aisles/$aisle">
            Visit {benchmark.aisle.label}{' '}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
