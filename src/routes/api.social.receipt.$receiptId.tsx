import { createFileRoute } from '@tanstack/react-router'

import { createPublicConvexClient } from '#/lib/convex/public-server'
import { socialCardSvg, svgResponse } from '#/lib/social-card'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/api/social/receipt/$receiptId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const receipt = await createPublicConvexClient().query(
          api.catalog.receiptByPublicId,
          { receiptId: params.receiptId },
        )
        if (!receipt) return svgResponse('', 404)
        return svgResponse(
          socialCardSvg({
            eyebrow: `${receipt.id} · ${receipt.state.label}`,
            title: receipt.model.displayName,
            summary: `${receipt.benchmark.title} v${receipt.benchmark.version} · ${receipt.trackId}`,
            facts: [
              `${receipt.primaryMetric.label} ${receipt.primaryMetric.value}${receipt.primaryMetric.unit === '%' ? '%' : ''}`,
              receipt.verification.label,
              receipt.compatibility.compatible ? 'compatible' : 'incompatible',
              'synthetic preview',
            ],
          }),
        )
      },
    },
  },
})
