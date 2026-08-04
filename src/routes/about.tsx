import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  EyeOff,
  FileCheck2,
  Scale,
  ShieldCheck,
} from 'lucide-react'

import { createSeoMetadata } from '#/lib/seo/metadata'

export const Route = createFileRoute('/about')({
  head: ({ match }) =>
    createSeoMetadata({
      siteOrigin: match.context.siteOrigin,
      pathname: '/about',
      title: 'How BenchBazaar works',
      description:
        'Learn how BenchBazaar separates public benchmark methods from sealed scored sets and provenance-rich result receipts.',
    }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="page-shell prose-page">
      <header className="page-header">
        <p className="eyebrow">How the bazaar works</p>
        <h1>Open enough to inspect. Careful enough to stay useful.</h1>
        <p>
          BenchBazaar is an open registry for versioned LLM evaluations—not a
          single ranking of “intelligence” and not a hosted arbitrary-code
          execution cloud.
        </p>
      </header>

      <section className="principle-grid">
        <article>
          <Scale aria-hidden="true" />
          <span>01</span>
          <h2>Explain the claim</h2>
          <p>
            Publish purpose, method, public samples, scoring rules, and
            limitations.
          </p>
        </article>
        <article>
          <EyeOff aria-hidden="true" />
          <span>02</span>
          <h2>Separate the scored set</h2>
          <p>
            Public free samples never belong to the official hidden scoring
            pool.
          </p>
        </article>
        <article>
          <FileCheck2 aria-hidden="true" />
          <span>03</span>
          <h2>Attach provenance</h2>
          <p>
            Every result points to an immutable receipt with exact compatibility
            facts.
          </p>
        </article>
      </section>

      <section className="prose-section">
        <div>
          <p className="eyebrow">The trust boundary</p>
          <h2>“Sealed” is a useful limit, not magic.</h2>
        </div>
        <div>
          <p>
            Official scored prompts and expected answers stay out of public
            pages, browser queries, source maps, analytics, and result receipts.
            In the MVP, they remain in an author-controlled runner rather than
            the web application.
          </p>
          <p>
            The model endpoint must still receive each evaluation prompt. A
            malicious or compromised provider can retain it. BenchBazaar
            therefore says “sealed” or “hidden from public download,” never
            “impossible to leak.”
          </p>
        </div>
      </section>

      <section className="prose-section prose-section--dark">
        <ShieldCheck aria-hidden="true" size={38} />
        <div>
          <p className="eyebrow">Serious substrate</p>
          <h2>Published versions stay put.</h2>
          <p>
            Corrections create successor versions. Receipts are append-only.
            Scoreboards compare only compatible runs from one exact version and
            track. Evidence labels say what was actually checked.
          </p>
          <Link className="button button--paper" to="/browse">
            Inspect the preview catalog{' '}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>
    </div>
  )
}
