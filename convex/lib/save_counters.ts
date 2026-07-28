import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export async function reconcileBenchmarkSaveCounter(
  ctx: MutationCtx,
  benchmarkId: Id<'benchmarks'>,
) {
  const benchmark = await ctx.db.get('benchmarks', benchmarkId)
  if (!benchmark) return false
  const saves = await ctx.db
    .query('basketSaves')
    .withIndex('by_benchmarkId', (query) =>
      query.eq('benchmarkId', benchmarkId),
    )
    .take(10_000)
  if (benchmark.saveCount === saves.length) return false
  await ctx.db.patch(benchmark._id, { saveCount: saves.length })
  return true
}
