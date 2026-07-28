import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/collections/$slug')({
  loader: async ({ context, params }) => {
    const collection = await context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(api.moderation.publicCollection, {
        slug: params.slug,
      }),
    )
    if (!collection) throw notFound()
    return collection
  },
  component: PublicCollectionPage,
})

function PublicCollectionPage() {
  const { slug } = Route.useParams()
  const { data: collection } = useSuspenseQuery(
    convexQuery(api.moderation.publicCollection, { slug }),
  )
  if (!collection) throw notFound()
  return (
    <div className="page-shell content-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Curator collection</p>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
        <small>{collection.rankingRule}</small>
      </header>
      <ol className="version-list">
        {collection.entries.map((entry) => (
          <li key={entry.slug}>
            <Link params={{ slug: entry.slug }} to="/b/$slug">
              <strong>{entry.title}</strong>
            </Link>
            <p>{entry.summary}</p>
            {entry.note && <p>{entry.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}
