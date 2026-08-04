import { query as defineQuery } from './_generated/server'

const SITEMAP_ENTRY_LIMIT = 10_000

export const sitemapEntries = defineQuery({
  args: {},
  handler: async (ctx) => {
    const [
      benchmarkDocuments,
      currentVersions,
      historicalVersions,
      deprecatedVersions,
      collections,
    ] = await Promise.all([
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'published'),
        )
        .take(SITEMAP_ENTRY_LIMIT),
      ctx.db
        .query('benchmarkVersions')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'current'),
        )
        .take(SITEMAP_ENTRY_LIMIT),
      ctx.db
        .query('benchmarkVersions')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'historical'),
        )
        .take(SITEMAP_ENTRY_LIMIT),
      ctx.db
        .query('benchmarkVersions')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'deprecated'),
        )
        .take(SITEMAP_ENTRY_LIMIT),
      ctx.db
        .query('curatorCollections')
        .withIndex('by_status_updatedAt', (query) =>
          query.eq('status', 'published'),
        )
        .take(SITEMAP_ENTRY_LIMIT),
    ])

    const benchmarks = benchmarkDocuments.filter(
      (benchmark) => !benchmark.synthetic,
    )
    const slugByBenchmarkId = new Map(
      benchmarks.map((benchmark) => [String(benchmark._id), benchmark.slug]),
    )

    return {
      benchmarks: benchmarks.map((benchmark) => ({
        slug: benchmark.slug,
        updatedAt: benchmark.updatedAt,
      })),
      versions: [
        ...currentVersions,
        ...historicalVersions,
        ...deprecatedVersions,
      ].flatMap((version) => {
        const slug = slugByBenchmarkId.get(String(version.benchmarkId))
        return slug
          ? [
              {
                slug,
                version: version.version,
                publishedAt: version.publishedAt,
              },
            ]
          : []
      }),
      collections: collections.map((collection) => ({
        slug: collection.slug,
        updatedAt: collection.updatedAt,
      })),
    }
  },
})
