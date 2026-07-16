import { createFileRoute, redirect } from '@tanstack/react-router'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/mystery')({
  loader: async ({ context }) => {
    const benchmark = await context.queryClient.ensureQueryData(
      context.convexQueryClient.queryOptions(api.catalog.mystery, {
        seed: Date.now(),
      }),
    )
    if (!benchmark) throw redirect({ to: '/browse' })
    throw redirect({ params: { slug: benchmark.slug }, to: '/b/$slug' })
  },
})
