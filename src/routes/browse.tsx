import { Link, createFileRoute } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { z } from 'zod'

import { MarketCard } from '#/features/catalog/components/market-card'
import { aisles } from '#/features/catalog/domain/aisles'
import { aisleIds } from '#/features/catalog/domain/catalog'
import type { BrowseSort } from '#/features/catalog/server/catalog.repository'

import { api } from '../../convex/_generated/api'

const browseSearchSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  aisle: z.enum(aisleIds).optional().catch(undefined),
  sort: z.enum(['newest', 'most-run', 'curated']).optional().catch(undefined),
  cursor: z.string().max(2_000).optional().catch(undefined),
  modality: z.enum(['text', 'text-image']).optional().catch(undefined),
  scorer: z
    .enum(['exact', 'code', 'human', 'llm-judge', 'hybrid'])
    .optional()
    .catch(undefined),
  sealed: z.enum(['sealed', 'open']).optional().catch(undefined),
  hasReceipts: z.enum(['yes', 'no']).optional().catch(undefined),
  curated: z.enum(['yes']).optional().catch(undefined),
})

function toBrowseArgs(filters: z.infer<typeof browseSearchSchema>) {
  return {
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.aisle ? { aisle: filters.aisle } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(filters.cursor ? { cursor: filters.cursor } : {}),
    ...(filters.modality
      ? {
          modality:
            filters.modality === 'text-image'
              ? ('text + image' as const)
              : ('text' as const),
        }
      : {}),
    ...(filters.scorer ? { scorer: filters.scorer } : {}),
    ...(filters.sealed ? { sealed: filters.sealed === 'sealed' } : {}),
    ...(filters.hasReceipts
      ? { hasReceipts: filters.hasReceipts === 'yes' }
      : {}),
    ...(filters.curated ? { curated: true } : {}),
  }
}

export const Route = createFileRoute('/browse')({
  validateSearch: (search) => browseSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(
        api.catalog.browse,
        toBrowseArgs(deps),
      ),
    ),
  head: () => ({
    meta: [
      { title: 'Browse LLM benchmarks · BenchBazaar' },
      {
        name: 'description',
        content:
          'Search community-made LLM benchmarks by title, method, aisle, and tag.',
      },
    ],
  }),
  component: BrowsePage,
})

const sortOptions: Array<{ value: BrowseSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'most-run', label: 'Most model runs' },
  { value: 'curated', label: 'Curator picks' },
]

function BrowsePage() {
  const filters = Route.useSearch()
  const { data: result } = useSuspenseQuery(
    convexQuery(api.catalog.browse, toBrowseArgs(filters)),
  )

  return (
    <div className="page-shell browse-page">
      <header className="page-header">
        <p className="eyebrow">Browse the bazaar</p>
        <h1>Find a useful reality check.</h1>
        <p>
          Search unusual LLM evaluations by what they test—not by one opaque
          global model score.
        </p>
      </header>

      <form
        action="/browse"
        className="browse-toolbar"
        id="browse-filter-form"
        role="search"
      >
        <div className="browse-toolbar__search">
          <Search aria-hidden="true" size={20} />
          <label className="sr-only" htmlFor="browse-query">
            Search benchmarks
          </label>
          <input
            defaultValue={filters.q ?? ''}
            id="browse-query"
            name="q"
            placeholder="Search title, summary, tags, aisle, or author…"
            type="search"
          />
        </div>
        {filters.aisle && (
          <input name="aisle" type="hidden" value={filters.aisle} />
        )}
        <select
          aria-label="Sort benchmarks"
          defaultValue={filters.sort ?? 'newest'}
          name="sort"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="button button--ink" type="submit">
          Search
        </button>
      </form>

      <div className="browse-layout">
        <aside className="filter-rail">
          <h2>
            <SlidersHorizontal aria-hidden="true" size={18} /> Aisles
          </h2>
          <Link
            className={
              !filters.aisle ? 'filter-link filter-link--active' : 'filter-link'
            }
            search={{ ...filters, aisle: undefined, cursor: undefined }}
            to="/browse"
          >
            All aisles
          </Link>
          {aisles.map((aisle) => (
            <Link
              className={
                filters.aisle === aisle.id
                  ? 'filter-link filter-link--active'
                  : 'filter-link'
              }
              key={aisle.id}
              search={{ ...filters, aisle: aisle.id, cursor: undefined }}
              to="/browse"
            >
              {aisle.label}
            </Link>
          ))}
          <h2>Details</h2>
          <label>
            Modality
            <select
              defaultValue={filters.modality ?? ''}
              form="browse-filter-form"
              name="modality"
            >
              <option value="">Any modality</option>
              <option value="text">Text</option>
              <option value="text-image">Text + image</option>
            </select>
          </label>
          <label>
            Scorer
            <select
              defaultValue={filters.scorer ?? ''}
              form="browse-filter-form"
              name="scorer"
            >
              <option value="">Any scorer</option>
              <option value="exact">Exact or deterministic</option>
              <option value="code">Code execution</option>
              <option value="human">Human rubric</option>
              <option value="llm-judge">LLM judge</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label>
            Official set
            <select
              defaultValue={filters.sealed ?? ''}
              form="browse-filter-form"
              name="sealed"
            >
              <option value="">Any policy</option>
              <option value="sealed">Sealed</option>
              <option value="open">Fully open</option>
            </select>
          </label>
          <label>
            Receipts
            <select
              defaultValue={filters.hasReceipts ?? ''}
              form="browse-filter-form"
              name="hasReceipts"
            >
              <option value="">Any</option>
              <option value="yes">Has receipts</option>
              <option value="no">No receipts yet</option>
            </select>
          </label>
          <label className="filter-check">
            <input
              defaultChecked={filters.curated === 'yes'}
              form="browse-filter-form"
              name="curated"
              type="checkbox"
              value="yes"
            />
            Curator picks only
          </label>
          <button
            className="button button--paper"
            form="browse-filter-form"
            type="submit"
          >
            Apply filters
          </button>
        </aside>

        <section aria-labelledby="browse-results" className="browse-results">
          <div className="browse-results__header">
            <div>
              <p className="eyebrow">
                {result.items.length} listings on this shelf
              </p>
              <h2 id="browse-results">
                {filters.q
                  ? `Results for “${filters.q}”`
                  : 'Everything on the shelves'}
              </h2>
            </div>
            {(filters.q ||
              filters.aisle ||
              filters.modality ||
              filters.scorer ||
              filters.sealed ||
              filters.hasReceipts ||
              filters.curated) && (
              <Link className="clear-filters" search={{}} to="/browse">
                <X aria-hidden="true" size={15} /> Clear filters
              </Link>
            )}
          </div>

          {result.items.length > 0 ? (
            <>
              <div className="card-grid card-grid--browse">
                {result.items.map((benchmark) => (
                  <MarketCard benchmark={benchmark} key={benchmark.id} />
                ))}
              </div>
              {!result.isDone && (
                <div className="load-more">
                  <Link
                    className="button button--paper"
                    search={{ ...filters, cursor: result.continueCursor }}
                    to="/browse"
                  >
                    Load the next shelf
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state empty-state--large">
              <strong>Nothing on this shelf.</strong>
              <p>
                Try another phrase, clear a filter, or publish the benchmark you
                expected to find.
              </p>
              <Link className="button button--paper" search={{}} to="/browse">
                Clear the shelf filters
              </Link>
              {!result.isDone && (
                <Link
                  className="text-link"
                  search={{ ...filters, cursor: result.continueCursor }}
                  to="/browse"
                >
                  Check the next shelf
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
