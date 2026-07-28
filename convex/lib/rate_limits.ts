import { ConvexError } from 'convex/values'

import type { MutationCtx } from '../_generated/server'

export async function enforceRateLimit(
  ctx: MutationCtx,
  args: {
    key: string
    operation: string
    limit: number
    windowMs: number
    now?: number
  },
) {
  const now = args.now ?? Date.now()
  const windowStart = Math.floor(now / args.windowMs) * args.windowMs
  const record = await ctx.db
    .query('rateLimits')
    .withIndex('by_key_operation_windowStart', (query) =>
      query
        .eq('key', args.key)
        .eq('operation', args.operation)
        .eq('windowStart', windowStart),
    )
    .unique()

  if (record && record.count >= args.limit) {
    throw new ConvexError({
      code: 'RATE_LIMITED',
      retryAfterMs: windowStart + args.windowMs - now,
    })
  }

  if (record) {
    await ctx.db.patch(record._id, {
      count: record.count + 1,
      updatedAt: now,
    })
  } else {
    await ctx.db.insert('rateLimits', {
      key: args.key,
      operation: args.operation,
      windowStart,
      count: 1,
      updatedAt: now,
    })
  }
}
