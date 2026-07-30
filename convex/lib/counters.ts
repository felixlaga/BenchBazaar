import type { MutationCtx, QueryCtx } from '../_generated/server'

// Named marketplace counters maintained incrementally so the home query can
// read O(1) instead of scanning every benchmark/receipt/model row.
export type CounterName = 'publishedBenchmarks' | 'receipts' | 'models'

export async function bumpCounter(
  ctx: MutationCtx,
  name: CounterName,
  delta: number,
) {
  if (delta === 0) return
  const row = await ctx.db
    .query('counters')
    .withIndex('by_name', (query) => query.eq('name', name))
    .unique()
  if (row) {
    await ctx.db.patch(row._id, { value: Math.max(0, row.value + delta) })
  } else {
    await ctx.db.insert('counters', { name, value: Math.max(0, delta) })
  }
}

export async function readCounter(
  ctx: QueryCtx,
  name: CounterName,
): Promise<number> {
  const row = await ctx.db
    .query('counters')
    .withIndex('by_name', (query) => query.eq('name', name))
    .unique()
  return row?.value ?? 0
}

// Full recompute used by seed and the ops reconcile mutation. Bounded scans are
// acceptable here because this runs off the request hot path.
export async function reconcileCounters(ctx: MutationCtx) {
  const [published, receipts, models] = await Promise.all([
    ctx.db
      .query('benchmarks')
      .withIndex('by_status_publishedAt', (query) =>
        query.eq('status', 'published'),
      )
      .collect(),
    ctx.db.query('receipts').collect(),
    ctx.db.query('models').collect(),
  ])
  const next: Record<CounterName, number> = {
    publishedBenchmarks: published.length,
    receipts: receipts.length,
    models: models.length,
  }
  for (const name of Object.keys(next) as Array<CounterName>) {
    const row = await ctx.db
      .query('counters')
      .withIndex('by_name', (query) => query.eq('name', name))
      .unique()
    if (row) {
      if (row.value !== next[name])
        await ctx.db.patch(row._id, { value: next[name] })
    } else {
      await ctx.db.insert('counters', { name, value: next[name] })
    }
  }
  return next
}
