import { createFileRoute } from '@tanstack/react-router'

import { createPublicConvexClient } from '#/lib/convex/public-server'
import { socialCardSvg, svgResponse } from '#/lib/social-card'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/api/social/benchmark/$slug')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const result = await createPublicConvexClient().query(
          api.catalog.benchmarkBySlug,
          { slug: params.slug },
        )
        if (!result) return svgResponse('', 404)
        const benchmark = result.benchmark
        return svgResponse(
          socialCardSvg({
            eyebrow: `${benchmark.aisle.label} · @${benchmark.vendor.handle}`,
            title: benchmark.title,
            summary: benchmark.summary,
            facts: [
              `version ${benchmark.version}`,
              `${benchmark.tracks.length} track${benchmark.tracks.length === 1 ? '' : 's'}`,
              `${benchmark.publicSampleCount} public samples`,
              `${benchmark.receiptCount} receipts`,
            ],
          }),
        )
      },
    },
  },
})
