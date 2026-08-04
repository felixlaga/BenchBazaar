import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'

import { BenchmarkPage } from '#/features/catalog/components/benchmark-page'
import { createSeoMetadata } from '#/lib/seo/metadata'

import { api } from '../../convex/_generated/api'

const benchmarkSearchSchema = z.object({
  track: z.string().trim().min(1).max(60).optional().catch(undefined),
})

export const Route = createFileRoute('/b/$slug')({
  validateSearch: (search) => benchmarkSearchSchema.parse(search),
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(api.catalog.benchmarkBySlug, {
        slug: params.slug,
      }),
    )
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? createSeoMetadata({
          siteOrigin: match.context.siteOrigin,
          pathname: `/b/${loaderData.benchmark.slug}`,
          title: `${loaderData.benchmark.title} · BenchBazaar`,
          description: loaderData.benchmark.summary,
          imageAlt: `${loaderData.benchmark.title} on BenchBazaar`,
          indexable: !match.search.track,
        })
      : {},
  component: CurrentBenchmarkRoute,
})

function CurrentBenchmarkRoute() {
  const { slug } = Route.useParams()
  const { track } = Route.useSearch()
  const { data } = useSuspenseQuery(
    convexQuery(api.catalog.benchmarkBySlug, { slug }),
  )
  if (!data) throw notFound()
  return <BenchmarkPage data={data} selectedTrackId={track} />
}
