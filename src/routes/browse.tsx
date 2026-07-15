import { Link, createFileRoute } from '@tanstack/react-router'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { z } from 'zod'

import { MarketCard } from '#/features/catalog/components/market-card'
import { aisles } from '#/features/catalog/domain/aisles'
import { aisleIds } from '#/features/catalog/domain/catalog'
import { loadBrowseCatalog } from '#/features/catalog/server/catalog.functions'
import type { BrowseSort } from '#/features/catalog/server/catalog.repository'

const browseSearchSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  aisle: z.enum(aisleIds).optional().catch(undefined),
  sort: z.enum(['newest', 'most-run', 'curated']).optional().catch(undefined),
})

export const Route = createFileRoute('/browse')({
  validateSearch: (search) => browseSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadBrowseCatalog({ data: deps }),
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
  const result = Route.useLoaderData()

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

      <form action="/browse" className="browse-toolbar" role="search">
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
            search={{ ...filters, aisle: undefined }}
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
              search={{ ...filters, aisle: aisle.id }}
              to="/browse"
            >
              {aisle.label}
            </Link>
          ))}
        </aside>

        <section aria-labelledby="browse-results" className="browse-results">
          <div className="browse-results__header">
            <div>
              <p className="eyebrow">{result.total} listings</p>
              <h2 id="browse-results">
                {filters.q
                  ? `Results for “${filters.q}”`
                  : 'Everything on the shelves'}
              </h2>
            </div>
            {(filters.q || filters.aisle) && (
              <Link className="clear-filters" search={{}} to="/browse">
                <X aria-hidden="true" size={15} /> Clear filters
              </Link>
            )}
          </div>

          {result.items.length > 0 ? (
            <div className="card-grid card-grid--browse">
              {result.items.map((benchmark) => (
                <MarketCard benchmark={benchmark} key={benchmark.id} />
              ))}
            </div>
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
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
