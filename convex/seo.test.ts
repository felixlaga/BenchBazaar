// @vitest-environment edge-runtime

import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

describe('SEO sitemap entries', () => {
  it('returns only published non-synthetic public resources', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })

    await expect(t.query(api.seo.sitemapEntries, {})).resolves.toEqual({
      benchmarks: [],
      versions: [],
      collections: [],
    })

    const benchmark = await t.run(async (ctx) =>
      ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique(),
    )
    if (!benchmark) throw new Error('Missing seeded benchmark')

    await t.run(async (ctx) => {
      await ctx.db.patch(benchmark._id, { synthetic: false })
      await ctx.db.insert('curatorCollections', {
        ownerId: benchmark.ownerId,
        slug: 'careful-reasoning',
        title: 'Careful reasoning',
        description: 'Published tests for careful reasoning.',
        status: 'published',
        createdAt: 1,
        updatedAt: 2,
      })
      await ctx.db.insert('curatorCollections', {
        ownerId: benchmark.ownerId,
        slug: 'draft-list',
        title: 'Draft list',
        description: 'Not public.',
        status: 'draft',
        createdAt: 1,
        updatedAt: 2,
      })
    })

    const entries = await t.query(api.seo.sitemapEntries, {})
    expect(entries.benchmarks).toEqual([
      { slug: benchmark.slug, updatedAt: benchmark.updatedAt },
    ])
    expect(entries.versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: benchmark.slug,
          version: benchmark.currentVersion,
        }),
      ]),
    )
    expect(entries.collections).toEqual([
      { slug: 'careful-reasoning', updatedAt: 2 },
    ])
  })
})
