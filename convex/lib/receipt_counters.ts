import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import {
  getReceiptCompatibilityIssues,
  hasCompatibleReceiptState,
} from './receipt_compatibility'

export async function reconcileBenchmarkReceiptCounters(
  ctx: MutationCtx,
  benchmarkId: Id<'benchmarks'>,
) {
  const benchmark = await ctx.db.get('benchmarks', benchmarkId)
  if (!benchmark) return false

  const receipts = await ctx.db
    .query('receipts')
    .withIndex('by_benchmarkId', (query) =>
      query.eq('benchmarkId', benchmarkId),
    )
    .take(10_000)
  const comparable = []
  for (const receipt of receipts) {
    if (!hasCompatibleReceiptState(receipt)) continue
    if (receipt.compatibilityStatus === 'compatible') {
      comparable.push(receipt)
      continue
    }
    const [version, model] = await Promise.all([
      ctx.db.get('benchmarkVersions', receipt.benchmarkVersionId),
      ctx.db.get('models', receipt.modelId),
    ])
    if (
      version &&
      model &&
      getReceiptCompatibilityIssues({
        version,
        model,
        trackId: receipt.trackId,
        primaryMetricKey: receipt.primaryMetricKey,
        scorerVersion: receipt.scorerVersion,
        manifestDigest: receipt.manifestDigest,
        datasetDigest: receipt.datasetDigest,
        generatorDigest: receipt.generatorDigest,
        itemCount: receipt.itemCount,
      }).length === 0
    ) {
      comparable.push(receipt)
    }
  }

  const next = {
    receiptCount: receipts.length,
    hasReceipts: receipts.length > 0,
    distinctModelCount: new Set(comparable.map((receipt) => receipt.modelId))
      .size,
    independentReproductionCount: comparable.filter(
      (receipt) => receipt.independentlyReproduced,
    ).length,
  }
  const changed =
    benchmark.receiptCount !== next.receiptCount ||
    benchmark.hasReceipts !== next.hasReceipts ||
    benchmark.distinctModelCount !== next.distinctModelCount ||
    benchmark.independentReproductionCount !== next.independentReproductionCount

  if (changed) await ctx.db.patch(benchmarkId, next)
  return changed
}
