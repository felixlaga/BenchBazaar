import { createFileRoute } from '@tanstack/react-router'

import { createPublicConvexClient } from '#/lib/convex/public-server'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/api/receipts/$receiptId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const receipt = await createPublicConvexClient().query(
          api.catalog.receiptByPublicId,
          { receiptId: params.receiptId },
        )
        if (!receipt) {
          return Response.json({ error: 'Receipt not found.' }, { status: 404 })
        }
        return Response.json(receipt, {
          headers: {
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
  },
})
