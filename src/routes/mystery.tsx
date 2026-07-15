import { createFileRoute, redirect } from '@tanstack/react-router'

import { loadMysteryBenchmark } from '#/features/catalog/server/catalog.functions'

export const Route = createFileRoute('/mystery')({
  loader: async () => {
    const benchmark = await loadMysteryBenchmark()
    throw redirect({ params: { slug: benchmark.slug }, to: '/b/$slug' })
  },
})
