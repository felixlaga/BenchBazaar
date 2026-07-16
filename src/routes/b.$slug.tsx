import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'

import { BenchmarkPage } from '#/features/catalog/components/benchmark-page'

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
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.benchmark.title} · BenchBazaar` },
          { name: 'description', content: loaderData.benchmark.summary },
          { property: 'og:type', content: 'website' },
          {
            property: 'og:image',
            content: `/api/social/benchmark/${loaderData.benchmark.slug}`,
          },
          { name: 'twitter:card', content: 'summary_large_image' },
        ]
      : [],
    links: loaderData
      ? [
          {
            rel: 'canonical',
            href: `/b/${loaderData.benchmark.slug}`,
          },
        ]
      : [],
  }),
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
