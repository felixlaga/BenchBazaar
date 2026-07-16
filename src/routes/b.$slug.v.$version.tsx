import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'

import { BenchmarkPage } from '#/features/catalog/components/benchmark-page'

import { api } from '../../convex/_generated/api'

const exactBenchmarkSearchSchema = z.object({
  track: z.string().trim().min(1).max(60).optional().catch(undefined),
})

export const Route = createFileRoute('/b/$slug/v/$version')({
  validateSearch: (search) => exactBenchmarkSearchSchema.parse(search),
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(api.catalog.benchmarkByVersion, {
        slug: params.slug,
        version: params.version,
      }),
    )
    if (!result) throw notFound()
    return result
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `${loaderData.benchmark.title} v${loaderData.benchmark.version} · BenchBazaar`,
          },
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
            href: `/b/${loaderData.benchmark.slug}/v/${loaderData.benchmark.version}`,
          },
        ]
      : [],
  }),
  component: ExactBenchmarkRoute,
})

function ExactBenchmarkRoute() {
  const { slug, version } = Route.useParams()
  const { track } = Route.useSearch()
  const { data } = useSuspenseQuery(
    convexQuery(api.catalog.benchmarkByVersion, { slug, version }),
  )
  if (!data) throw notFound()
  return <BenchmarkPage data={data} exactRoute selectedTrackId={track} />
}
