import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight, Github, Store } from 'lucide-react'
import { z } from 'zod'

import { SectionHeading } from '#/components/ui/section-heading'
import { MarketCard } from '#/features/catalog/components/market-card'
import { ReceiptPreview } from '#/features/catalog/components/receipt-preview'

import { api } from '../../convex/_generated/api'

const stallSearchSchema = z.object({
  cursor: z.string().max(2_000).optional().catch(undefined),
})

function stallArgs(handle: string, cursor?: string) {
  return {
    handle,
    paginationOpts: { cursor: cursor ?? null, numItems: 6 },
  }
}

export const Route = createFileRoute('/stalls/$handle')({
  validateSearch: (search) => stallSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const result = await context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(
        api.catalog.stallByHandle,
        stallArgs(params.handle, deps.cursor),
      ),
    )
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.stall.displayName} · BenchBazaar stall` },
          {
            name: 'description',
            content:
              loaderData.stall.bio ??
              `Public benchmarks and receipts from @${loaderData.stall.handle}.`,
          },
        ]
      : [],
  }),
  component: StallPage,
})

function StallPage() {
  const { handle } = Route.useParams()
  const { cursor } = Route.useSearch()
  const { data } = useSuspenseQuery(
    convexQuery(api.catalog.stallByHandle, stallArgs(handle, cursor)),
  )
  if (!data) throw notFound()

  return (
    <div className="page-shell stall-page">
      <header className="stall-hero">
        <div aria-hidden="true" className="stall-avatar">
          {data.stall.displayName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">Public stall</p>
          <h1>{data.stall.displayName}</h1>
          <code>@{data.stall.handle}</code>
          <p>
            {data.stall.bio ??
              'This maintainer has not added a public stall description yet.'}
          </p>
          {data.stall.githubUsername && (
            <a
              href={`https://github.com/${data.stall.githubUsername}`}
              rel="noreferrer"
              target="_blank"
            >
              <Github aria-hidden="true" size={16} /> GitHub profile
            </a>
          )}
        </div>
        <Store aria-hidden="true" className="stall-hero__mark" size={48} />
      </header>

      <section className="page-section">
        <SectionHeading
          description="Published listings owned by this public handle. Private identity fields never enter this view."
          eyebrow="Authored benchmarks"
          title="Wares on the counter"
        />
        {data.benchmarks.items.length ? (
          <div className="card-grid">
            {data.benchmarks.items.map((benchmark) => (
              <MarketCard benchmark={benchmark} key={benchmark.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No authored benchmarks on this shelf.</strong>
            <p>The stall exists, but no public listing is available.</p>
          </div>
        )}
        {!data.benchmarks.isDone && (
          <div className="load-more">
            <Link
              className="button button--paper"
              params={{ handle: data.stall.handle }}
              search={{ cursor: data.benchmarks.continueCursor }}
              to="/stalls/$handle"
            >
              Load more wares <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        )}
      </section>

      <section className="page-section">
        <SectionHeading
          eyebrow="Receipts submitted"
          title="Recent paper trail"
        />
        {data.recentReceipts.length ? (
          <div className="receipt-strip">
            {data.recentReceipts.map((receipt) => (
              <ReceiptPreview key={receipt.id} receipt={receipt} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No public receipts submitted yet.</strong>
          </div>
        )}
      </section>

      <section className="page-section">
        <SectionHeading
          description="Compatible results independently reproduced by this submitter."
          eyebrow="Independent reproductions"
          title="Second looks"
        />
        {data.reproductions.length ? (
          <div className="receipt-strip">
            {data.reproductions.map((receipt) => (
              <ReceiptPreview key={receipt.id} receipt={receipt} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No independent reproductions yet.</strong>
            <p>Sparse evidence stays sparse; BenchBazaar does not invent it.</p>
          </div>
        )}
      </section>

      <section className="page-section">
        <SectionHeading eyebrow="Public runners" title="Runner registrations" />
        <div className="empty-state">
          <strong>No public runner registered for this preview stall.</strong>
          <p>Runner keys arrive with the signed-receipt protocol phase.</p>
        </div>
      </section>
    </div>
  )
}
