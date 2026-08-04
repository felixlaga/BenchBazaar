import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, Bot } from 'lucide-react'
import { z } from 'zod'

import { SectionHeading } from '#/components/ui/section-heading'
import { StatusBanner } from '#/components/ui/status-banner'
import { ReceiptPreview } from '#/features/catalog/components/receipt-preview'
import {
  receiptStates,
  verificationStatuses,
} from '#/features/catalog/domain/catalog'
import { createSeoMetadata } from '#/lib/seo/metadata'

import { api } from '../../convex/_generated/api'

const modelSearchSchema = z.object({
  cursor: z.string().max(2_000).optional().catch(undefined),
  status: z.enum(receiptStates).optional().catch(undefined),
  verification: z.enum(verificationStatuses).optional().catch(undefined),
  track: z.string().trim().max(60).optional().catch(undefined),
})

function modelArgs(
  modelSlug: string,
  search: z.infer<typeof modelSearchSchema>,
) {
  return {
    modelSlug,
    paginationOpts: { cursor: search.cursor ?? null, numItems: 8 },
    ...(search.status ? { status: search.status } : {}),
    ...(search.verification ? { verification: search.verification } : {}),
    ...(search.track ? { trackId: search.track } : {}),
  }
}

export const Route = createFileRoute('/models/$modelSlug')({
  validateSearch: (search) => modelSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const result = await context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(
        api.catalog.modelBySlug,
        modelArgs(params.modelSlug, deps),
      ),
    )
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData, match, params }) =>
    loaderData
      ? createSeoMetadata({
          siteOrigin: match.context.siteOrigin,
          pathname: `/models/${params.modelSlug}`,
          title: `${loaderData.model.displayName} · BenchBazaar model`,
          description: `Exact, version-scoped receipts for ${loaderData.model.canonicalId}. No global aggregate score.`,
          imageAlt: `${loaderData.model.displayName} result receipts on BenchBazaar`,
          indexable: !Object.values(match.search).some(
            (value) => value !== undefined,
          ),
        })
      : {},
  component: ModelPage,
})

function ModelPage() {
  const { modelSlug } = Route.useParams()
  const filters = Route.useSearch()
  const { data } = useSuspenseQuery(
    convexQuery(api.catalog.modelBySlug, modelArgs(modelSlug, filters)),
  )
  if (!data) throw notFound()

  const groups = new Map<string, typeof data.receipts.items>()
  for (const receipt of data.receipts.items) {
    const label = `${receipt.benchmark.title} · v${receipt.benchmark.version}`
    groups.set(label, [...(groups.get(label) ?? []), receipt])
  }

  return (
    <div className="page-shell model-page">
      <header className="model-hero">
        <Bot aria-hidden="true" size={42} />
        <div>
          <p className="eyebrow">Canonical model registry</p>
          <h1>{data.model.displayName}</h1>
          <p>{data.model.provider}</p>
          <code>{data.model.canonicalId}</code>
        </div>
      </header>

      {data.model.aliases.length > 0 && (
        <StatusBanner variant="warning" title="Aliases are not exact IDs">
          <AlertTriangle aria-hidden="true" size={18} /> Submitted aliases{' '}
          {data.model.aliases.map((alias) => `“${alias}”`).join(', ')} may be
          mutable or ambiguous. Scoreboards use the canonical ID above.
        </StatusBanner>
      )}

      <section className="page-section">
        <SectionHeading
          description="Receipts stay grouped by exact benchmark version and track. BenchBazaar does not turn unrelated tests into one model score."
          eyebrow="Evidence by benchmark"
          title="Scoped results, not an IQ number"
        />

        <form action={`/models/${data.model.slug}`} className="model-filters">
          <label>
            Receipt state
            <select defaultValue={filters.status ?? ''} name="status">
              <option value="">Any state</option>
              {receiptStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence
            <select
              defaultValue={filters.verification ?? ''}
              name="verification"
            >
              <option value="">Any evidence</option>
              {verificationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Exact track ID
            <input
              defaultValue={filters.track ?? ''}
              maxLength={60}
              name="track"
              placeholder="standard"
            />
          </label>
          <button className="button button--ink" type="submit">
            Apply filters
          </button>
          <Link params={{ modelSlug: data.model.slug }} to="/models/$modelSlug">
            Clear
          </Link>
        </form>

        {groups.size ? (
          <div className="model-receipt-groups">
            {[...groups.entries()].map(([label, receipts]) => (
              <section key={label}>
                <h2>{label}</h2>
                <div className="receipt-strip">
                  {receipts.map((receipt) => (
                    <ReceiptPreview key={receipt.id} receipt={receipt} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No receipts match these exact filters.</strong>
            <p>Sparse data remains visible as sparse data.</p>
          </div>
        )}

        {!data.receipts.isDone && (
          <div className="load-more">
            <Link
              className="button button--paper"
              params={{ modelSlug: data.model.slug }}
              search={{ ...filters, cursor: data.receipts.continueCursor }}
              to="/models/$modelSlug"
            >
              Load more receipts <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
