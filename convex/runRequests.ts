import { ConvexError, v } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import { mutation, query as defineQuery } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireUser } from './lib/authorization'
import { enforceRateLimit } from './lib/rate_limits'

type RequestContext = QueryCtx | MutationCtx

function bounded(value: string, min: number, max: number, code: string) {
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw new ConvexError({ code })
  }
  return normalized
}

function optionalBounded(value: string | undefined, max: number) {
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (normalized.length > max) {
    throw new ConvexError({ code: 'FIELD_TOO_LONG' })
  }
  return normalized
}

function safeEndpoint(value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) return undefined
  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    throw new ConvexError({ code: 'INVALID_ENDPOINT_URL' })
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '0.0.0.0' ||
    url.hostname === '::1'
  ) {
    throw new ConvexError({ code: 'INVALID_ENDPOINT_URL' })
  }
  return url.toString()
}

async function requestByPublicId(ctx: RequestContext, publicId: string) {
  return ctx.db
    .query('runRequests')
    .withIndex('by_publicId', (query) => query.eq('publicId', publicId))
    .unique()
}

async function canRead(
  ctx: RequestContext,
  request: Doc<'runRequests'>,
  user: Doc<'users'>,
) {
  if (
    request.requesterId === user._id ||
    user.role === 'moderator' ||
    user.role === 'admin'
  ) {
    return true
  }
  const benchmark = await ctx.db.get('benchmarks', request.benchmarkId)
  if (benchmark?.ownerId === user._id) return true
  if (request.assignedRunnerKeyId) {
    const runner = await ctx.db.get('runnerKeys', request.assignedRunnerKeyId)
    if (runner?.ownerId === user._id) return true
  }
  return false
}

async function toView(ctx: QueryCtx, request: Doc<'runRequests'>) {
  const [benchmark, version, requester, runner, receipt] = await Promise.all([
    ctx.db.get('benchmarks', request.benchmarkId),
    ctx.db.get('benchmarkVersions', request.benchmarkVersionId),
    ctx.db.get('users', request.requesterId),
    request.assignedRunnerKeyId
      ? ctx.db.get('runnerKeys', request.assignedRunnerKeyId)
      : null,
    request.receiptId ? ctx.db.get('receipts', request.receiptId) : null,
  ])
  return {
    publicId: request.publicId,
    benchmark: {
      slug: benchmark?.slug ?? 'missing',
      title: version?.title ?? benchmark?.title ?? 'Missing benchmark',
      version: version?.version ?? 'unknown',
    },
    trackId: request.trackId,
    requestedModelId: request.requestedModelId,
    requesterHandle: requester?.handle ?? 'deleted-user',
    endpointUrl: request.endpointUrl,
    endpointExposureAcknowledged: request.endpointExposureAcknowledged,
    status: request.status,
    runner: runner
      ? {
          publicId: runner.publicId,
          label: runner.label,
          fingerprint: runner.fingerprint,
        }
      : null,
    receiptPublicId: receipt?.publicId,
    ownerNote: request.ownerNote,
    errorCode: request.errorCode,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}

export const options = defineQuery({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    const benchmarks = await ctx.db
      .query('benchmarks')
      .withIndex('by_status_publishedAt', (query) =>
        query.eq('status', 'published'),
      )
      .order('desc')
      .take(500)
    return Promise.all(
      benchmarks.map(async (benchmark) => {
        const versions = await ctx.db
          .query('benchmarkVersions')
          .withIndex('by_benchmarkId_publishedAt', (query) =>
            query.eq('benchmarkId', benchmark._id),
          )
          .order('desc')
          .take(50)
        return {
          slug: benchmark.slug,
          title: benchmark.title,
          versions: versions
            .filter((version) => version.status !== 'suspended')
            .map((version) => ({
              id: version._id,
              version: version.version,
              tracks: version.tracks.map((track) => ({
                id: track.id,
                label: track.label,
              })),
            })),
        }
      }),
    )
  },
})

export const create = mutation({
  args: {
    benchmarkVersionId: v.id('benchmarkVersions'),
    trackId: v.string(),
    requestedModelId: v.string(),
    endpointUrl: v.optional(v.string()),
    endpointExposureAcknowledged: v.literal(true),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const version = await ctx.db.get(
      'benchmarkVersions',
      args.benchmarkVersionId,
    )
    if (!version || version.status === 'suspended') {
      throw new ConvexError({ code: 'VERSION_NOT_AVAILABLE' })
    }
    const benchmark = await ctx.db.get('benchmarks', version.benchmarkId)
    if (!benchmark || benchmark.status !== 'published') {
      throw new ConvexError({ code: 'BENCHMARK_NOT_AVAILABLE' })
    }
    const trackId = bounded(args.trackId, 2, 160, 'TRACK_REQUIRED')
    if (!version.tracks.some((track) => track.id === trackId)) {
      throw new ConvexError({ code: 'TRACK_NOT_FOUND' })
    }
    const requestedModelId = bounded(
      args.requestedModelId,
      2,
      240,
      'MODEL_ID_REQUIRED',
    )
    const endpointUrl = safeEndpoint(args.endpointUrl)
    const endpointCategory = endpointUrl
      ? 'requester_endpoint'
      : 'operator_provider_account'
    const now = Date.now()
    await enforceRateLimit(ctx, {
      key: String(user._id),
      operation: 'run_request.user',
      limit: 5,
      windowMs: 24 * 60 * 60 * 1_000,
      now,
    })
    await enforceRateLimit(ctx, {
      key: String(benchmark._id),
      operation: 'run_request.benchmark',
      limit: 50,
      windowMs: 24 * 60 * 60 * 1_000,
      now,
    })
    await enforceRateLimit(ctx, {
      key: `${String(benchmark._id)}:${requestedModelId.toLowerCase()}`,
      operation: 'run_request.model',
      limit: 10,
      windowMs: 7 * 24 * 60 * 60 * 1_000,
      now,
    })
    await enforceRateLimit(ctx, {
      key: `${String(benchmark._id)}:${endpointCategory}`,
      operation: 'run_request.endpoint_category',
      limit: 20,
      windowMs: 24 * 60 * 60 * 1_000,
      now,
    })
    const requestId = await ctx.db.insert('runRequests', {
      publicId: `pending:${now}:${String(user._id)}`,
      requesterId: user._id,
      benchmarkId: benchmark._id,
      benchmarkVersionId: version._id,
      trackId,
      requestedModelId,
      ...(endpointUrl ? { endpointUrl } : {}),
      endpointExposureAcknowledged: true,
      status: 'requested',
      createdAt: now,
      updatedAt: now,
    })
    const publicId = `BBREQ-${String(requestId).toUpperCase()}`
    await ctx.db.patch(requestId, { publicId })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'run_request.created',
      targetType: 'run_request',
      targetId: publicId,
      createdAt: now,
    })
    return { publicId }
  },
})

export const get = defineQuery({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const request = await requestByPublicId(ctx, args.publicId.trim())
    if (!request) return null
    if (!(await canRead(ctx, request, user))) {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }
    return toView(ctx, request)
  },
})

export const mine = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const requests = await ctx.db
      .query('runRequests')
      .withIndex('by_requesterId_createdAt', (query) =>
        query.eq('requesterId', user._id),
      )
      .order('desc')
      .take(100)
    return Promise.all(requests.map((request) => toView(ctx, request)))
  },
})

export const ownerQueue = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const benchmarks = await ctx.db
      .query('benchmarks')
      .withIndex('by_ownerId', (query) => query.eq('ownerId', user._id))
      .take(500)
    const requests = (
      await Promise.all(
        benchmarks.map((benchmark) =>
          ctx.db
            .query('runRequests')
            .withIndex('by_benchmarkId_createdAt', (query) =>
              query.eq('benchmarkId', benchmark._id),
            )
            .order('desc')
            .take(100),
        ),
      )
    ).flat()
    return Promise.all(requests.map((request) => toView(ctx, request)))
  },
})

export const transition = mutation({
  args: {
    publicId: v.string(),
    action: v.union(
      v.literal('approve'),
      v.literal('decline'),
      v.literal('assign'),
      v.literal('start'),
      v.literal('succeed'),
      v.literal('fail'),
      v.literal('cancel'),
    ),
    runnerPublicId: v.optional(v.string()),
    receiptPublicId: v.optional(v.string()),
    note: v.optional(v.string()),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const request = await requestByPublicId(ctx, args.publicId.trim())
    if (!request) throw new ConvexError({ code: 'RUN_REQUEST_NOT_FOUND' })
    const benchmark = await ctx.db.get('benchmarks', request.benchmarkId)
    if (!benchmark) throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
    const ownerAuthorized =
      benchmark.ownerId === user._id || user.role === 'admin'
    const requesterAuthorized = request.requesterId === user._id
    let runnerAuthorized = false
    if (request.assignedRunnerKeyId) {
      const assigned = await ctx.db.get(
        'runnerKeys',
        request.assignedRunnerKeyId,
      )
      runnerAuthorized = assigned?.ownerId === user._id
    }

    const transitions = {
      requested: ['approve', 'decline', 'cancel'],
      approved: ['assign', 'cancel'],
      assigned: ['start', 'cancel'],
      running: ['succeed', 'fail'],
      failed: ['assign', 'cancel'],
      declined: [],
      succeeded: [],
      cancelled: [],
    } as const
    if (
      !(transitions[request.status] as readonly string[]).includes(args.action)
    ) {
      throw new ConvexError({ code: 'INVALID_RUN_REQUEST_TRANSITION' })
    }
    if (
      (args.action === 'approve' ||
        args.action === 'decline' ||
        args.action === 'assign') &&
      !ownerAuthorized
    ) {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }
    if (args.action === 'cancel' && !ownerAuthorized && !requesterAuthorized) {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }
    if (
      (args.action === 'start' ||
        args.action === 'succeed' ||
        args.action === 'fail') &&
      !ownerAuthorized &&
      !runnerAuthorized
    ) {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }

    const now = Date.now()
    const ownerNote = optionalBounded(args.note, 1_000)
    const patch: Partial<Doc<'runRequests'>> = {
      updatedAt: now,
      ...(ownerNote ? { ownerNote } : {}),
    }
    if (args.action === 'approve') patch.status = 'approved'
    if (args.action === 'decline') patch.status = 'declined'
    if (args.action === 'cancel') patch.status = 'cancelled'
    if (args.action === 'start') patch.status = 'running'
    if (args.action === 'fail') {
      patch.status = 'failed'
      patch.errorCode = bounded(
        args.errorCode ?? '',
        2,
        80,
        'ERROR_CODE_REQUIRED',
      )
    }
    if (args.action === 'assign') {
      const runnerPublicId = bounded(
        args.runnerPublicId ?? '',
        2,
        200,
        'RUNNER_REQUIRED',
      )
      const runner = await ctx.db
        .query('runnerKeys')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', runnerPublicId),
        )
        .unique()
      if (
        !runner ||
        runner.status !== 'active' ||
        runner.ownerId !== benchmark.ownerId ||
        (runner.scope === 'benchmark' && runner.benchmarkId !== benchmark._id)
      ) {
        throw new ConvexError({ code: 'RUNNER_NOT_ELIGIBLE' })
      }
      patch.status = 'assigned'
      patch.assignedRunnerKeyId = runner._id
      delete patch.errorCode
    }
    if (args.action === 'succeed') {
      const receiptPublicId = bounded(
        args.receiptPublicId ?? '',
        2,
        200,
        'RECEIPT_REQUIRED',
      )
      const receipt = await ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', receiptPublicId),
        )
        .unique()
      if (
        !receipt ||
        receipt.status !== 'valid' ||
        receipt.compatibilityStatus !== 'compatible' ||
        receipt.benchmarkVersionId !== request.benchmarkVersionId ||
        receipt.trackId !== request.trackId ||
        receipt.runnerKeyId !== request.assignedRunnerKeyId
      ) {
        throw new ConvexError({ code: 'RECEIPT_DOES_NOT_CLOSE_REQUEST' })
      }
      const model = await ctx.db.get('models', receipt.modelId)
      if (
        !model ||
        model.canonicalId !== request.requestedModelId.toLowerCase()
      ) {
        throw new ConvexError({ code: 'RECEIPT_DOES_NOT_CLOSE_REQUEST' })
      }
      patch.status = 'succeeded'
      patch.receiptId = receipt._id
    }
    await ctx.db.patch(request._id, patch)
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: `run_request.${args.action}`,
      targetType: 'run_request',
      targetId: request.publicId,
      ...(patch.ownerNote ? { publicSummary: patch.ownerNote } : {}),
      createdAt: now,
    })
    return { status: patch.status ?? request.status }
  },
})
