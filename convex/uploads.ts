import { ConvexError, v } from 'convex/values'

import { mutation, query as defineQuery } from './_generated/server'
import { requireBenchmarkOwner, requireUser } from './lib/authorization'
import { enforceRateLimit } from './lib/rate_limits'

const MAX_PUBLIC_IMAGE_BYTES = 5 * 1_024 * 1_024
const allowedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validatePublicImageMetadata(metadata: {
  size: number
  contentType?: string | null
}) {
  if (metadata.size > MAX_PUBLIC_IMAGE_BYTES) return 'UPLOAD_TOO_LARGE'
  if (
    !metadata.contentType ||
    !allowedContentTypes.has(metadata.contentType.toLowerCase())
  ) {
    return 'UPLOAD_TYPE_NOT_ALLOWED'
  }
  return null
}

export const options = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const benchmarks = await ctx.db
      .query('benchmarks')
      .withIndex('by_ownerId', (query) => query.eq('ownerId', user._id))
      .take(200)
    return benchmarks
      .filter((benchmark) => benchmark.status !== 'draft')
      .map((benchmark) => ({
        id: benchmark._id,
        slug: benchmark.slug,
        title: benchmark.title,
        hasCover: Boolean(benchmark.coverImageStorageId),
      }))
  },
})

export const createIntent = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    await enforceRateLimit(ctx, {
      key: String(user._id),
      operation: 'upload.public_image',
      limit: 20,
      windowMs: 24 * 60 * 60 * 1_000,
    })
    const now = Date.now()
    const intentId = await ctx.db.insert('uploadIntents', {
      ownerId: user._id,
      kind: 'public_benchmark_image',
      status: 'pending',
      createdAt: now,
    })
    return {
      intentId,
      uploadUrl: await ctx.storage.generateUploadUrl(),
      maxBytes: MAX_PUBLIC_IMAGE_BYTES,
      allowedContentTypes: [...allowedContentTypes],
    }
  },
})

export const finalize = mutation({
  args: {
    intentId: v.id('uploadIntents'),
    storageId: v.id('_storage'),
    benchmarkId: v.id('benchmarks'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await requireBenchmarkOwner(ctx, args.benchmarkId)
    const intent = await ctx.db.get('uploadIntents', args.intentId)
    if (
      !intent ||
      intent.ownerId !== user._id ||
      intent.status !== 'pending' ||
      Date.now() - intent.createdAt > 15 * 60 * 1_000
    ) {
      throw new ConvexError({ code: 'UPLOAD_INTENT_INVALID' })
    }
    const metadata = await ctx.storage.getMetadata(args.storageId)
    if (!metadata) throw new ConvexError({ code: 'UPLOAD_NOT_FOUND' })

    const rejectionCode = validatePublicImageMetadata(metadata)
    const now = Date.now()
    if (rejectionCode) {
      await ctx.storage.delete(args.storageId)
      await ctx.db.patch(intent._id, {
        storageId: args.storageId,
        status: 'rejected',
        rejectionCode,
        finalizedAt: now,
      })
      return { accepted: false as const, code: rejectionCode }
    }

    const benchmark = await ctx.db.get('benchmarks', args.benchmarkId)
    if (!benchmark) throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
    if (benchmark.coverImageStorageId) {
      await ctx.storage.delete(benchmark.coverImageStorageId)
    }
    await ctx.db.patch(benchmark._id, {
      coverImageStorageId: args.storageId,
      updatedAt: now,
    })
    await ctx.db.patch(intent._id, {
      storageId: args.storageId,
      status: 'accepted',
      finalizedAt: now,
    })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'benchmark.public_image_updated',
      targetType: 'benchmark',
      targetId: benchmark.slug,
      createdAt: now,
    })
    return { accepted: true as const }
  },
})
