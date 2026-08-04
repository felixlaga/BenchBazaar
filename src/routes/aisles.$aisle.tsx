import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

import { SectionHeading } from '#/components/ui/section-heading'
import { MarketCard } from '#/features/catalog/components/market-card'
import { aisleIds } from '#/features/catalog/domain/catalog'
import { createSeoMetadata } from '#/lib/seo/metadata'

import { api } from '../../convex/_generated/api'

function isAisle(value: string): value is (typeof aisleIds)[number] {
  return aisleIds.some((aisle) => aisle === value)
}

export const Route = createFileRoute('/aisles/$aisle')({
  loader: async ({ context, params }) => {
    if (!isAisle(params.aisle)) throw notFound()
    return context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(api.catalog.aisle, {
        aisle: params.aisle,
      }),
    )
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? createSeoMetadata({
          siteOrigin: match.context.siteOrigin,
          pathname: `/aisles/${loaderData.aisle.id}`,
          title: `${loaderData.aisle.label} · BenchBazaar`,
          description: loaderData.aisle.description,
        })
      : {},
  component: AislePage,
})

function AislePage() {
  const { aisle } = Route.useParams()
  if (!isAisle(aisle)) throw notFound()
  const { data } = useSuspenseQuery(convexQuery(api.catalog.aisle, { aisle }))

  return (
    <div className="page-shell aisle-page">
      <Link className="back-link" to="/browse">
        <ArrowLeft aria-hidden="true" size={15} /> Browse every aisle
      </Link>
      <header className={`aisle-hero aisle-hero--${data.aisle.id}`}>
        <span aria-hidden="true" className="aisle-hero__number">
          {data.aisle.motif.split(' / ')[0]}
        </span>
        <div>
          <p className="eyebrow">Market aisle</p>
          <h1>{data.aisle.label}</h1>
          <p>{data.aisle.description}</p>
          <small>{data.aisle.motif.split(' / ')[1]}</small>
        </div>
      </header>

      {data.curatorPick && (
        <section className="page-section aisle-feature">
          <SectionHeading
            description="One listing the bazaar team thinks deserves a careful look."
            eyebrow="Curator pick"
            title="Start at this stall"
          />
          <div className="aisle-feature__card">
            <Sparkles aria-hidden="true" size={28} />
            <MarketCard benchmark={data.curatorPick} featured />
          </div>
        </section>
      )}

      <section className="page-section">
        <SectionHeading
          description="Recently published exact versions in this editorial category."
          eyebrow="Newest listings"
          title="Fresh on this shelf"
        />
        <div className="card-grid">
          {data.newest.map((benchmark) => (
            <MarketCard benchmark={benchmark} key={benchmark.id} />
          ))}
        </div>
      </section>

      <section className="page-section">
        <SectionHeading
          description="Listings with independently reproduced compatible receipts."
          eyebrow="Most reproduced"
          title="Signals checked twice"
        />
        {data.mostReproduced.length ? (
          <div className="card-grid">
            {data.mostReproduced.map((benchmark) => (
              <MarketCard benchmark={benchmark} key={benchmark.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No independent reproductions in this aisle yet.</strong>
            <p>
              The listings are public; compatible second runs are still due.
            </p>
          </div>
        )}
      </section>

      <div className="next-listing">
        <Link search={{ aisle: data.aisle.id }} to="/browse">
          Browse every {data.aisle.label} listing{' '}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </div>
  )
}
