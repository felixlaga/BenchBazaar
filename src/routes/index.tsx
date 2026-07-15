import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  PackageOpen,
  Search,
  ShieldCheck,
  Store,
  TicketCheck,
} from 'lucide-react'

import { SectionHeading } from '#/components/ui/section-heading'
import { StatusBanner } from '#/components/ui/status-banner'
import { AisleSign } from '#/features/catalog/components/aisle-sign'
import { MarketCard } from '#/features/catalog/components/market-card'
import { ReceiptPreview } from '#/features/catalog/components/receipt-preview'
import { loadHomePage } from '#/features/catalog/server/catalog.functions'

export const Route = createFileRoute('/')({
  loader: () => loadHomePage(),
  head: () => ({
    meta: [
      { title: 'BenchBazaar · Odd tests. Useful signals.' },
      {
        name: 'description',
        content:
          'Discover unusual, useful LLM benchmarks with public methods, sealed scored sets, and receipts for every result.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()

  return (
    <>
      <section className="hero page-shell">
        <div className="hero__copy">
          <div className="hero__kicker">
            <span>Open methods</span>
            <span>Sealed scored sets</span>
            <span>Receipts included</span>
          </div>
          <h1>
            Odd tests.
            <br />
            <em>Useful signals.</em>
          </h1>
          <p>
            The open bazaar for community-made LLM benchmarks. Publish the
            method, keep the official test set sealed, and bring receipts.
          </p>
          <div className="hero__actions">
            <Link className="button button--ink button--large" to="/browse">
              Browse the bazaar <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className="button button--paper button--large" to="/publish">
              Publish a benchmark
            </Link>
          </div>
          <Link className="mystery-link" to="/mystery">
            <PackageOpen aria-hidden="true" size={18} />
            Open the mystery crate
          </Link>
        </div>

        <div aria-label="How BenchBazaar works" className="hero-market">
          <div className="hero-market__sun" />
          <div className="hero-market__sign">
            <span>THE OPEN</span>
            <strong>BENCH BAZAAR</strong>
            <small>fresh evaluations daily-ish</small>
          </div>
          <div className="hero-market__stalls" aria-hidden="true">
            <div className="mini-stall mini-stall--tomato">
              <span />
              <strong>ODD TESTS</strong>
            </div>
            <div className="mini-stall mini-stall--mustard">
              <span />
              <strong>OPEN METHOD</strong>
            </div>
            <div className="mini-stall mini-stall--leaf">
              <span />
              <strong>RECEIPTS</strong>
            </div>
          </div>
          <div className="hero-market__counter">
            <div>
              <strong>{data.marketStats.benchmarks}</strong>
              <span>benchmarks</span>
            </div>
            <div>
              <strong>{data.marketStats.receipts}</strong>
              <span>receipts</span>
            </div>
            <div>
              <strong>{data.marketStats.models}</strong>
              <span>exact models</span>
            </div>
          </div>
        </div>
      </section>

      <section className="search-ribbon">
        <form
          action="/browse"
          className="market-search page-shell"
          role="search"
        >
          <Search aria-hidden="true" size={24} />
          <label className="sr-only" htmlFor="market-search">
            Search community benchmarks
          </label>
          <input
            id="market-search"
            name="q"
            placeholder="What do you want to test? Try “calendar”, “tools”, or “tone”…"
            type="search"
          />
          <button className="button button--ink" type="submit">
            Search stalls
          </button>
        </form>
      </section>

      <div className="page-shell preview-notice">
        <StatusBanner title="Preview market · synthetic public data">
          These listings and receipts demonstrate the product shape. They are
          not real model performance claims, and no hidden benchmark content is
          stored in this scaffold.
        </StatusBanner>
      </div>

      <section className="page-section page-shell">
        <SectionHeading
          description="Editorial categories, with plain-language labels for every market sign."
          eyebrow="Pick an aisle"
          title="What deserves a reality check?"
        />
        <div className="aisle-grid">
          {data.featuredAisles.map((aisle) => (
            <AisleSign aisle={aisle} key={aisle.id} />
          ))}
        </div>
      </section>

      <section className="page-section page-shell">
        <SectionHeading
          action={
            <Link search={{ sort: 'newest' }} to="/browse">
              View all fresh stock <ArrowRight aria-hidden="true" size={16} />
            </Link>
          }
          description="Recently published benchmarks, ordered by publish date—not pageviews."
          eyebrow="Fresh stock"
          title="New on the shelves"
        />
        <div className="card-grid">
          {data.freshBenchmarks.map((benchmark, index) => (
            <MarketCard
              benchmark={benchmark}
              featured={index === 0}
              key={benchmark.id}
            />
          ))}
        </div>
      </section>

      <section className="paper-band">
        <div className="page-section page-shell">
          <SectionHeading
            action={
              <Link search={{ sort: 'curated' }} to="/browse">
                Browse the collection{' '}
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            }
            description="A small, hand-picked mix from across the bazaar."
            eyebrow="Curator’s cart"
            title="Worth a closer look"
          />
          <div className="card-grid">
            {data.curatorPicks.map((benchmark) => (
              <MarketCard benchmark={benchmark} key={benchmark.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section page-shell">
        <SectionHeading
          description="Fresh model results with exact versions and provenance attached."
          eyebrow="Receipts just in"
          title="Claims you can inspect"
        />
        <div className="receipt-strip">
          {data.recentReceipts.map((receipt) => (
            <ReceiptPreview key={receipt.id} receipt={receipt} />
          ))}
        </div>
      </section>

      <section className="page-section page-shell">
        <SectionHeading
          action={
            <Link search={{ sort: 'most-run' }} to="/browse">
              See all best sellers <ArrowRight aria-hidden="true" size={16} />
            </Link>
          }
          description="The most distinct valid model runs in this preview—not the most pageviews."
          eyebrow="Best sellers"
          title="Busy checkout counters"
        />
        <div className="card-grid">
          {data.bestSellers.map((benchmark) => (
            <MarketCard benchmark={benchmark} key={benchmark.id} />
          ))}
        </div>
      </section>

      <section className="sealed-explainer page-shell">
        <div className="sealed-explainer__seal" aria-hidden="true">
          <ShieldCheck size={48} strokeWidth={1.5} />
          <span>SEALED</span>
        </div>
        <div>
          <p className="eyebrow">Open method, sealed official set</p>
          <h2>Show your work without giving away the test.</h2>
          <p>
            Benchmark pages publish the purpose, public examples, scoring
            recipe, limitations, and result receipts. Official scored questions
            stay with a controlled runner instead of becoming an easy
            training-data download.
          </p>
          <p className="fine-print">
            A model service may still observe evaluation prompts sent to it.
            Sealed reduces casual exposure; it does not mean impossible to leak.
          </p>
          <Link className="text-link" to="/about">
            Read the trust model <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="sealed-explainer__steps">
          <div>
            <Store aria-hidden="true" />
            <span>1</span>
            <strong>Publish the method</strong>
            <p>Purpose, samples, scorer, limitations.</p>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <span>2</span>
            <strong>Run the sealed set</strong>
            <p>Author-controlled evaluation, away from the browser.</p>
          </div>
          <div>
            <TicketCheck aria-hidden="true" />
            <span>3</span>
            <strong>Bring a receipt</strong>
            <p>Exact version, model, track, metrics, and evidence.</p>
          </div>
        </div>
      </section>

      <section className="publish-cta">
        <div className="page-shell">
          <p className="eyebrow">Got a strangely useful test?</p>
          <h2>Set up your stall.</h2>
          <p>
            A benchmark idea does not need a paper, package, or giant test suite
            to be useful. Start with the question it answers and the limits it
            has.
          </p>
          <Link className="button button--paper button--large" to="/publish">
            Publish a benchmark <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>
    </>
  )
}
