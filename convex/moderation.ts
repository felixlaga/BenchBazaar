import { ConvexError, v } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import { mutation, query as defineQuery } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireRole, requireUser } from './lib/authorization'
import { reconcileBenchmarkReceiptCounters } from './lib/receipt_counters'
import { enforceRateLimit } from './lib/rate_limits'

function bounded(value: string, min: number, max: number, code: string) {
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw new ConvexError({ code })
  }
  return normalized
}

function normalizedSlug(value: string) {
  const slug = value.trim().toLowerCase()
  if (
    slug.length < 3 ||
    slug.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new ConvexError({ code: 'INVALID_COLLECTION_SLUG' })
  }
  return slug
}

async function receiptByPublicId(
  ctx: QueryCtx | MutationCtx,
  publicId: string,
) {
  return ctx.db
    .query('receipts')
    .withIndex('by_publicId', (query) => query.eq('publicId', publicId))
    .unique()
}

export const report = mutation({
  args: {
    targetType: v.union(v.literal('benchmark'), v.literal('receipt')),
    targetId: v.string(),
    category: v.union(
      v.literal('spam'),
      v.literal('unsafe_content'),
      v.literal('misleading_claim'),
      v.literal('provenance'),
      v.literal('other'),
    ),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await enforceRateLimit(ctx, {
      key: String(user._id),
      operation: 'moderation.report',
      limit: 10,
      windowMs: 24 * 60 * 60 * 1_000,
    })
    const now = Date.now()
    let benchmarkId
    let receiptId
    if (args.targetType === 'benchmark') {
      const benchmark = await ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) => query.eq('slug', args.targetId.trim()))
        .unique()
      if (!benchmark || benchmark.status === 'draft') {
        throw new ConvexError({ code: 'REPORT_TARGET_NOT_FOUND' })
      }
      benchmarkId = benchmark._id
    } else {
      const receipt = await receiptByPublicId(ctx, args.targetId.trim())
      if (!receipt) {
        throw new ConvexError({ code: 'REPORT_TARGET_NOT_FOUND' })
      }
      receiptId = receipt._id
    }
    const reportId = await ctx.db.insert('reports', {
      reporterId: user._id,
      targetType: args.targetType,
      ...(benchmarkId ? { benchmarkId } : {}),
      ...(receiptId ? { receiptId } : {}),
      category: args.category,
      details: bounded(args.details, 20, 2_000, 'REPORT_DETAILS_REQUIRED'),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'report.created',
      targetType: args.targetType,
      targetId: args.targetId.trim(),
      createdAt: now,
    })
    return { reportId }
  },
})

async function reportView(ctx: QueryCtx, reportDocument: Doc<'reports'>) {
  const [reporter, benchmark, receipt] = await Promise.all([
    ctx.db.get('users', reportDocument.reporterId),
    reportDocument.benchmarkId
      ? ctx.db.get('benchmarks', reportDocument.benchmarkId)
      : null,
    reportDocument.receiptId
      ? ctx.db.get('receipts', reportDocument.receiptId)
      : null,
  ])
  return {
    id: reportDocument._id,
    reporterHandle: reporter?.handle ?? 'deleted-user',
    targetType: reportDocument.targetType,
    targetId: benchmark?.slug ?? receipt?.publicId ?? 'missing-target',
    targetLabel: benchmark?.title ?? receipt?.publicId ?? 'Missing target',
    category: reportDocument.category,
    details: reportDocument.details,
    status: reportDocument.status,
    resolution: reportDocument.resolution,
    createdAt: reportDocument.createdAt,
  }
}

export const queue = defineQuery({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'moderator')
    const reports = await ctx.db
      .query('reports')
      .withIndex('by_status_createdAt', (query) => query.eq('status', 'open'))
      .order('asc')
      .take(200)
    const reviewing = await ctx.db
      .query('reports')
      .withIndex('by_status_createdAt', (query) =>
        query.eq('status', 'reviewing'),
      )
      .order('asc')
      .take(200)
    return Promise.all(
      [...reports, ...reviewing].map((reportDocument) =>
        reportView(ctx, reportDocument),
      ),
    )
  },
})

export const resolveReport = mutation({
  args: {
    reportId: v.id('reports'),
    status: v.union(v.literal('resolved'), v.literal('dismissed')),
    resolution: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireRole(ctx, 'moderator')
    const reportDocument = await ctx.db.get('reports', args.reportId)
    if (!reportDocument) {
      throw new ConvexError({ code: 'REPORT_NOT_FOUND' })
    }
    const resolution = bounded(
      args.resolution,
      10,
      1_000,
      'RESOLUTION_REQUIRED',
    )
    const now = Date.now()
    await ctx.db.patch(reportDocument._id, {
      status: args.status,
      assignedToUserId: moderator._id,
      resolution,
      updatedAt: now,
    })
    await ctx.db.insert('auditEvents', {
      actorId: moderator._id,
      action: `report.${args.status}`,
      targetType: 'report',
      targetId: String(reportDocument._id),
      publicSummary: resolution,
      createdAt: now,
    })
    return { status: args.status }
  },
})

export const setBenchmarkStatus = mutation({
  args: {
    slug: v.string(),
    status: v.union(
      v.literal('published'),
      v.literal('hidden'),
      v.literal('suspended'),
    ),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireRole(ctx, 'moderator')
    const benchmark = await ctx.db
      .query('benchmarks')
      .withIndex('by_slug', (query) => query.eq('slug', args.slug.trim()))
      .unique()
    if (!benchmark || benchmark.status === 'draft') {
      throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
    }
    const reason = bounded(args.reason, 10, 1_000, 'MODERATION_REASON_REQUIRED')
    const now = Date.now()
    await ctx.db.patch(benchmark._id, {
      status: args.status,
      updatedAt: now,
    })
    await ctx.db.insert('auditEvents', {
      actorId: moderator._id,
      action: `benchmark.${args.status}`,
      targetType: 'benchmark',
      targetId: benchmark.slug,
      publicSummary: reason,
      createdAt: now,
    })
    return { status: args.status }
  },
})

export const setReceiptStatus = mutation({
  args: {
    receiptPublicId: v.string(),
    status: v.union(
      v.literal('valid'),
      v.literal('disputed'),
      v.literal('invalid'),
    ),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireRole(ctx, 'moderator')
    const receipt = await receiptByPublicId(ctx, args.receiptPublicId.trim())
    if (!receipt) throw new ConvexError({ code: 'RECEIPT_NOT_FOUND' })
    if (receipt.status === 'superseded') {
      throw new ConvexError({ code: 'RECEIPT_SUPERSEDED' })
    }
    const reason = bounded(args.reason, 10, 1_000, 'MODERATION_REASON_REQUIRED')
    const now = Date.now()
    await ctx.db.patch(receipt._id, {
      status: args.status,
      moderationReason: reason,
    })
    await ctx.db.insert('auditEvents', {
      actorId: moderator._id,
      action: `receipt.${args.status}`,
      targetType: 'receipt',
      targetId: receipt.publicId,
      publicSummary: reason,
      createdAt: now,
    })
    await reconcileBenchmarkReceiptCounters(ctx, receipt.benchmarkId)
    return { status: args.status }
  },
})

export const proposeReproduction = mutation({
  args: {
    candidateReceiptPublicId: v.string(),
    supportingReceiptPublicId: v.string(),
    tolerance: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    if (
      !Number.isFinite(args.tolerance) ||
      args.tolerance < 0 ||
      args.tolerance > 1_000_000
    ) {
      throw new ConvexError({ code: 'INVALID_TOLERANCE' })
    }
    const [candidate, supporting] = await Promise.all([
      receiptByPublicId(ctx, args.candidateReceiptPublicId),
      receiptByPublicId(ctx, args.supportingReceiptPublicId),
    ])
    if (!candidate || !supporting || candidate._id === supporting._id) {
      throw new ConvexError({ code: 'REPRODUCTION_RECEIPTS_INVALID' })
    }
    if (
      candidate.benchmarkVersionId !== supporting.benchmarkVersionId ||
      candidate.trackId !== supporting.trackId ||
      candidate.primaryMetricKey !== supporting.primaryMetricKey ||
      candidate.status !== 'valid' ||
      supporting.status !== 'valid'
    ) {
      throw new ConvexError({ code: 'REPRODUCTION_NOT_COMPARABLE' })
    }
    if (
      candidate.submittedByUserId === supporting.submittedByUserId ||
      (candidate.runnerKeyId &&
        candidate.runnerKeyId === supporting.runnerKeyId)
    ) {
      throw new ConvexError({ code: 'SELF_REPRODUCTION_NOT_ALLOWED' })
    }
    if (
      Math.abs(candidate.primaryMetricValue - supporting.primaryMetricValue) >
      args.tolerance
    ) {
      throw new ConvexError({ code: 'REPRODUCTION_OUTSIDE_TOLERANCE' })
    }
    const existing = await ctx.db
      .query('reproductionReviews')
      .withIndex('by_candidateReceiptId', (query) =>
        query.eq('candidateReceiptId', candidate._id),
      )
      .filter((query) =>
        query.eq(query.field('supportingReceiptId'), supporting._id),
      )
      .first()
    if (existing) return { reviewId: existing._id, status: existing.status }
    const reviewId = await ctx.db.insert('reproductionReviews', {
      candidateReceiptId: candidate._id,
      supportingReceiptId: supporting._id,
      requestedByUserId: user._id,
      tolerance: args.tolerance,
      status: 'pending',
      createdAt: Date.now(),
    })
    return { reviewId, status: 'pending' as const }
  },
})

export const reviewReproduction = mutation({
  args: {
    reviewId: v.id('reproductionReviews'),
    status: v.union(v.literal('accepted'), v.literal('rejected')),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const review = await ctx.db.get('reproductionReviews', args.reviewId)
    if (!review) throw new ConvexError({ code: 'REPRODUCTION_NOT_FOUND' })
    if (review.status !== 'pending') {
      return { status: review.status }
    }
    const candidate = await ctx.db.get('receipts', review.candidateReceiptId)
    if (!candidate) throw new ConvexError({ code: 'RECEIPT_NOT_FOUND' })
    const benchmark = await ctx.db.get('benchmarks', candidate.benchmarkId)
    if (
      !benchmark ||
      (benchmark.ownerId !== user._id &&
        user.role !== 'moderator' &&
        user.role !== 'admin')
    ) {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }
    const reason = bounded(args.reason, 10, 1_000, 'REVIEW_REASON_REQUIRED')
    const now = Date.now()
    await ctx.db.patch(review._id, {
      status: args.status,
      decidedByUserId: user._id,
      reason,
      decidedAt: now,
    })
    if (args.status === 'accepted') {
      await ctx.db.patch(candidate._id, { independentlyReproduced: true })
      await reconcileBenchmarkReceiptCounters(ctx, candidate.benchmarkId)
    }
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: `reproduction.${args.status}`,
      targetType: 'receipt',
      targetId: candidate.publicId,
      publicSummary: reason,
      createdAt: now,
    })
    return { status: args.status }
  },
})

const collectionEntry = v.object({
  benchmarkId: v.id('benchmarks'),
  note: v.optional(v.string()),
})

export const collectionWorkspace = defineQuery({
  args: {},
  handler: async (ctx) => {
    const curator = await requireRole(ctx, 'curator')
    const [benchmarks, collections] = await Promise.all([
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'published'),
        )
        .order('desc')
        .take(500),
      ctx.db
        .query('curatorCollections')
        .withIndex('by_ownerId_updatedAt', (query) =>
          query.eq('ownerId', curator._id),
        )
        .order('desc')
        .take(100),
    ])
    return {
      benchmarks: benchmarks.map((benchmark) => ({
        id: benchmark._id,
        slug: benchmark.slug,
        title: benchmark.title,
      })),
      collections: await Promise.all(
        collections.map(async (collection) => {
          const entries = await ctx.db
            .query('curatorCollectionEntries')
            .withIndex('by_collectionId_position', (query) =>
              query.eq('collectionId', collection._id),
            )
            .collect()
          return {
            id: collection._id,
            slug: collection.slug,
            title: collection.title,
            description: collection.description,
            status: collection.status,
            entries: entries.map((entry) => ({
              benchmarkId: entry.benchmarkId,
              note: entry.note,
            })),
          }
        }),
      ),
    }
  },
})

export const saveCollection = mutation({
  args: {
    collectionId: v.optional(v.id('curatorCollections')),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal('draft'), v.literal('published')),
    entries: v.array(collectionEntry),
  },
  handler: async (ctx, args) => {
    const curator = await requireRole(ctx, 'curator')
    if (args.entries.length > 100) {
      throw new ConvexError({ code: 'TOO_MANY_COLLECTION_ENTRIES' })
    }
    const slug = normalizedSlug(args.slug)
    const duplicate = await ctx.db
      .query('curatorCollections')
      .withIndex('by_slug', (query) => query.eq('slug', slug))
      .unique()
    if (duplicate && duplicate._id !== args.collectionId) {
      throw new ConvexError({ code: 'COLLECTION_SLUG_EXISTS' })
    }
    if (args.collectionId) {
      const existing = await ctx.db.get('curatorCollections', args.collectionId)
      if (
        !existing ||
        (existing.ownerId !== curator._id && curator.role !== 'admin')
      ) {
        throw new ConvexError({ code: 'FORBIDDEN' })
      }
    }
    const uniqueBenchmarkIds = new Set(
      args.entries.map((entry) => String(entry.benchmarkId)),
    )
    if (uniqueBenchmarkIds.size !== args.entries.length) {
      throw new ConvexError({ code: 'DUPLICATE_COLLECTION_ENTRY' })
    }
    for (const entry of args.entries) {
      const benchmark = await ctx.db.get('benchmarks', entry.benchmarkId)
      if (!benchmark || benchmark.status !== 'published') {
        throw new ConvexError({ code: 'COLLECTION_BENCHMARK_NOT_PUBLIC' })
      }
    }
    const now = Date.now()
    const fields = {
      slug,
      title: bounded(args.title, 3, 100, 'COLLECTION_TITLE_REQUIRED'),
      description: bounded(
        args.description,
        10,
        1_000,
        'COLLECTION_DESCRIPTION_REQUIRED',
      ),
      status: args.status,
      updatedAt: now,
    }
    const collectionId =
      args.collectionId ??
      (await ctx.db.insert('curatorCollections', {
        ownerId: curator._id,
        ...fields,
        createdAt: now,
      }))
    if (args.collectionId) await ctx.db.patch(collectionId, fields)
    const previous = await ctx.db
      .query('curatorCollectionEntries')
      .withIndex('by_collectionId_position', (query) =>
        query.eq('collectionId', collectionId),
      )
      .collect()
    for (const entry of previous) await ctx.db.delete(entry._id)
    for (const [position, entry] of args.entries.entries()) {
      await ctx.db.insert('curatorCollectionEntries', {
        collectionId,
        benchmarkId: entry.benchmarkId,
        position,
        ...(entry.note
          ? { note: bounded(entry.note, 1, 500, 'COLLECTION_NOTE_TOO_LONG') }
          : {}),
        createdAt: now,
      })
    }
    await ctx.db.insert('auditEvents', {
      actorId: curator._id,
      action: `collection.${args.status}`,
      targetType: 'collection',
      targetId: slug,
      createdAt: now,
    })
    return { collectionId, slug }
  },
})

export const publicCollection = defineQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query('curatorCollections')
      .withIndex('by_slug', (query) => query.eq('slug', args.slug.trim()))
      .unique()
    if (!collection || collection.status !== 'published') return null
    const entries = await ctx.db
      .query('curatorCollectionEntries')
      .withIndex('by_collectionId_position', (query) =>
        query.eq('collectionId', collection._id),
      )
      .collect()
    const benchmarks = await Promise.all(
      entries.map(async (entry) => {
        const benchmark = await ctx.db.get('benchmarks', entry.benchmarkId)
        if (!benchmark || benchmark.status !== 'published') return null
        return {
          slug: benchmark.slug,
          title: benchmark.title,
          summary: benchmark.summary,
          version: benchmark.currentVersion,
          note: entry.note,
        }
      }),
    )
    return {
      slug: collection.slug,
      title: collection.title,
      description: collection.description,
      rankingRule:
        'Curator-selected ordering with explicit editorial notes; pageviews are not used as quality.',
      entries: benchmarks.filter((benchmark) => benchmark !== null),
    }
  },
})
