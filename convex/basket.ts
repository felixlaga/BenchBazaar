import { ConvexError, v } from 'convex/values'

import type { QueryCtx } from './_generated/server'
import { mutation, query as defineQuery } from './_generated/server'
import { requireUser } from './lib/authorization'

async function publishedBenchmarkBySlug(ctx: QueryCtx, slug: string) {
  const benchmark = await ctx.db
    .query('benchmarks')
    .withIndex('by_slug', (query) => query.eq('slug', slug))
    .unique()
  return benchmark?.status === 'published' ? benchmark : null
}

export const status = defineQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const benchmark = await publishedBenchmarkBySlug(ctx, args.slug)
    if (!benchmark) return { saved: false }
    const save = await ctx.db
      .query('basketSaves')
      .withIndex('by_userId_benchmarkId', (query) =>
        query.eq('userId', user._id).eq('benchmarkId', benchmark._id),
      )
      .unique()
    return { saved: Boolean(save) }
  },
})

export const toggle = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const benchmark = await ctx.db
      .query('benchmarks')
      .withIndex('by_slug', (query) => query.eq('slug', args.slug))
      .unique()
    if (!benchmark || benchmark.status !== 'published') {
      throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
    }
    const existing = await ctx.db
      .query('basketSaves')
      .withIndex('by_userId_benchmarkId', (query) =>
        query.eq('userId', user._id).eq('benchmarkId', benchmark._id),
      )
      .unique()
    if (existing) {
      await ctx.db.delete(existing._id)
      await ctx.db.patch(benchmark._id, {
        saveCount: Math.max(0, benchmark.saveCount - 1),
      })
      return { saved: false }
    }
    await ctx.db.insert('basketSaves', {
      userId: user._id,
      benchmarkId: benchmark._id,
      createdAt: Date.now(),
    })
    await ctx.db.patch(benchmark._id, {
      saveCount: benchmark.saveCount + 1,
    })
    return { saved: true }
  },
})

export const mine = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const saves = await ctx.db
      .query('basketSaves')
      .withIndex('by_userId_createdAt', (query) => query.eq('userId', user._id))
      .order('desc')
      .take(100)
    const items = await Promise.all(
      saves.map(async (save) => {
        const benchmark = await ctx.db.get('benchmarks', save.benchmarkId)
        if (
          !benchmark ||
          benchmark.status !== 'published' ||
          !benchmark.currentVersion
        ) {
          return null
        }
        return {
          slug: benchmark.slug,
          title: benchmark.title,
          summary: benchmark.summary,
          version: benchmark.currentVersion,
          aisle: benchmark.aisle,
          savedAt: save.createdAt,
        }
      }),
    )
    return items.filter((item) => item !== null)
  },
})
