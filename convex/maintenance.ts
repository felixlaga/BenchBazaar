import { v } from 'convex/values'

import { internalMutation } from './_generated/server'
import { reconcileCounters } from './lib/counters'

// Rate-limit rows are only meaningful within their window. Anything older than
// this cutoff can never gate a request again, so it is safe to delete and keeps
// the table from growing without bound.
const RATE_LIMIT_RETENTION_MS = 2 * 24 * 60 * 60 * 1_000
const PRUNE_BATCH = 2_000

export const pruneRateLimits = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now()
    const cutoff = now - RATE_LIMIT_RETENTION_MS
    const stale = await ctx.db
      .query('rateLimits')
      .withIndex('by_windowStart', (query) => query.lt('windowStart', cutoff))
      .take(PRUNE_BATCH)
    for (const row of stale) {
      await ctx.db.delete(row._id)
    }
    return {
      deleted: stale.length,
      hitBatchLimit: stale.length === PRUNE_BATCH,
    }
  },
})

export const reconcileMarketCounters = internalMutation({
  args: { confirm: v.literal(true) },
  handler: async (ctx) => {
    return reconcileCounters(ctx)
  },
})
