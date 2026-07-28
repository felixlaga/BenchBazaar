import { ConvexError, v } from 'convex/values'

import {
  internalQuery,
  mutation,
  query as defineQuery,
} from './_generated/server'
import { requireRole } from './lib/authorization'

const consentStatement =
  'The benchmark owner consents to this public listing and confirms that its public claims, samples, and limitations are accurate to the best of their knowledge.'

function httpsUrl(value: string) {
  const normalized = value.trim()
  if (normalized.length > 2_000) {
    throw new ConvexError({ code: 'CONSENT_EVIDENCE_URL_INVALID' })
  }
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new ConvexError({ code: 'CONSENT_EVIDENCE_URL_INVALID' })
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.hostname === 'localhost'
  ) {
    throw new ConvexError({ code: 'CONSENT_EVIDENCE_URL_INVALID' })
  }
  return parsed.toString()
}

export const consentText = defineQuery({
  args: {},
  handler: async () => ({ statement: consentStatement }),
})

export const workspace = defineQuery({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin')
    const [published, consents] = await Promise.all([
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'published'),
        )
        .order('desc')
        .take(10_000),
      ctx.db.query('launchContentConsents').take(10_000),
    ])
    const consentByBenchmark = new Map(
      consents.map((consent) => [String(consent.benchmarkId), consent]),
    )

    return {
      statement: consentStatement,
      benchmarks: published
        .filter((benchmark) => !benchmark.synthetic)
        .map((benchmark) => {
          const consent = consentByBenchmark.get(String(benchmark._id))
          return {
            id: benchmark._id,
            slug: benchmark.slug,
            title: benchmark.title,
            publicRef: benchmark.publicRef,
            currentVersion: benchmark.currentVersion,
            consent: consent
              ? {
                  source: consent.source,
                  evidenceUrl: consent.evidenceUrl,
                  recordedAt: consent.recordedAt,
                }
              : null,
          }
        }),
    }
  },
})

export const recordConsent = mutation({
  args: {
    benchmarkId: v.id('benchmarks'),
    source: v.union(
      v.literal('owner_submission'),
      v.literal('written_release'),
    ),
    statement: v.string(),
    evidenceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, 'admin')
    const benchmark = await ctx.db.get('benchmarks', args.benchmarkId)
    if (!benchmark || benchmark.status === 'draft') {
      throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
    }
    if (benchmark.synthetic) {
      throw new ConvexError({
        code: 'SYNTHETIC_CONTENT_NOT_CONSENTABLE',
      })
    }
    if (args.statement !== consentStatement) {
      throw new ConvexError({ code: 'CONSENT_STATEMENT_MISMATCH' })
    }
    const existing = await ctx.db
      .query('launchContentConsents')
      .withIndex('by_benchmarkId', (query) =>
        query.eq('benchmarkId', benchmark._id),
      )
      .unique()
    if (existing) throw new ConvexError({ code: 'CONSENT_ALREADY_RECORDED' })
    const recordedAt = Date.now()
    const consentId = await ctx.db.insert('launchContentConsents', {
      benchmarkId: benchmark._id,
      ownerId: benchmark.ownerId,
      recordedByUserId: admin._id,
      source: args.source,
      statement: consentStatement,
      ...(args.evidenceUrl ? { evidenceUrl: httpsUrl(args.evidenceUrl) } : {}),
      recordedAt,
    })
    await ctx.db.insert('auditEvents', {
      actorId: admin._id,
      action: 'launch_content.consent_recorded',
      targetType: 'benchmark',
      targetId: benchmark.slug,
      createdAt: recordedAt,
    })
    return { consentId }
  },
})

export const readiness = internalQuery({
  args: { confirmProductionReview: v.literal(true) },
  handler: async (ctx) => {
    const published = await ctx.db
      .query('benchmarks')
      .withIndex('by_status_publishedAt', (query) =>
        query.eq('status', 'published'),
      )
      .take(10_000)
    const receipts = await ctx.db.query('receipts').take(10_000)
    const consents = await ctx.db.query('launchContentConsents').take(10_000)
    const consented = new Set(
      consents.map((consent) => String(consent.benchmarkId)),
    )
    const missingConsent = published
      .filter((benchmark) => !consented.has(String(benchmark._id)))
      .map((benchmark) => benchmark.slug)
    const syntheticBenchmarks = published
      .filter((benchmark) => benchmark.synthetic)
      .map((benchmark) => benchmark.slug)
    const syntheticReceiptCount = receipts.filter(
      (receipt) => receipt.synthetic,
    ).length
    const ready =
      published.length >= 12 &&
      syntheticBenchmarks.length === 0 &&
      syntheticReceiptCount === 0 &&
      missingConsent.length === 0
    return {
      ready,
      publishedBenchmarkCount: published.length,
      syntheticBenchmarkCount: syntheticBenchmarks.length,
      syntheticReceiptCount,
      missingConsentCount: missingConsent.length,
      issues: [
        ...(published.length < 12 ? ['NEEDS_TWELVE_BENCHMARKS'] : []),
        ...(syntheticBenchmarks.length > 0
          ? ['SYNTHETIC_BENCHMARKS_PRESENT']
          : []),
        ...(syntheticReceiptCount > 0 ? ['SYNTHETIC_RECEIPTS_PRESENT'] : []),
        ...(missingConsent.length > 0 ? ['CONSENT_RECORDS_MISSING'] : []),
      ],
    }
  },
})
