import { base64UrlToBytes, publicKeyFingerprint } from '@benchbazaar/protocol'
import { ConvexError, v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import {
  internalQuery,
  internalMutation,
  mutation,
  query as defineQuery,
} from './_generated/server'
import type { MutationCtx } from './_generated/server'
import {
  requireBenchmarkOwner,
  requireRole,
  requireUser,
} from './lib/authorization'
import { bumpCounter } from './lib/counters'
import { getReceiptCompatibilityIssues } from './lib/receipt_compatibility'
import { reconcileBenchmarkReceiptCounters } from './lib/receipt_counters'
import { enforceRateLimit } from './lib/rate_limits'

const digest = /^sha256:[0-9a-f]{64}$/

function bounded(value: string, min: number, max: number, code: string) {
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw new ConvexError({ code })
  }
  return normalized
}

function safeIdentifier(value: string, code: string) {
  const normalized = bounded(value, 2, 160, code)
  if (!/^[A-Za-z0-9._:/-]+$/.test(normalized)) {
    throw new ConvexError({ code })
  }
  return normalized
}

async function validatePublicKey(publicKeySpki: string) {
  const normalized = bounded(publicKeySpki, 40, 200, 'INVALID_PUBLIC_KEY')
  try {
    const keyBytes = Uint8Array.from(base64UrlToBytes(normalized))
    await crypto.subtle.importKey(
      'spki',
      keyBytes.buffer,
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
  } catch {
    throw new ConvexError({ code: 'INVALID_PUBLIC_KEY' })
  }
  return {
    publicKeySpki: normalized,
    fingerprint: await publicKeyFingerprint(normalized),
  }
}

export const register = mutation({
  args: {
    label: v.string(),
    publicKeySpki: v.string(),
    scope: v.union(v.literal('all_owner_benchmarks'), v.literal('benchmark')),
    benchmarkId: v.optional(v.id('benchmarks')),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await enforceRateLimit(ctx, {
      key: String(user._id),
      operation: 'runner.register',
      limit: 10,
      windowMs: 60 * 60 * 1_000,
    })
    if (args.scope === 'benchmark') {
      if (!args.benchmarkId) {
        throw new ConvexError({ code: 'BENCHMARK_SCOPE_REQUIRED' })
      }
      await requireBenchmarkOwner(ctx, args.benchmarkId)
    } else if (args.benchmarkId) {
      throw new ConvexError({ code: 'BENCHMARK_SCOPE_NOT_ALLOWED' })
    }

    const key = await validatePublicKey(args.publicKeySpki)
    const duplicate = await ctx.db
      .query('runnerKeys')
      .withIndex('by_fingerprint', (query) =>
        query.eq('fingerprint', key.fingerprint),
      )
      .unique()
    if (duplicate) throw new ConvexError({ code: 'RUNNER_KEY_EXISTS' })

    const now = Date.now()
    const runnerKeyId = await ctx.db.insert('runnerKeys', {
      publicId: `pending:${now}:${String(user._id)}`,
      ownerId: user._id,
      label: bounded(args.label, 2, 80, 'RUNNER_LABEL_REQUIRED'),
      publicKeySpki: key.publicKeySpki,
      fingerprint: key.fingerprint,
      scope: args.scope,
      ...(args.benchmarkId ? { benchmarkId: args.benchmarkId } : {}),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    const publicId = `BBRK-${String(runnerKeyId).toUpperCase()}`
    await ctx.db.patch(runnerKeyId, { publicId })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'runner.registered',
      targetType: 'runner_key',
      targetId: publicId,
      publicSummary: key.fingerprint,
      createdAt: now,
    })
    return { publicId, fingerprint: key.fingerprint }
  },
})

export const mine = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const keys = await ctx.db
      .query('runnerKeys')
      .withIndex('by_ownerId_createdAt', (query) =>
        query.eq('ownerId', user._id),
      )
      .order('desc')
      .take(100)
    return Promise.all(
      keys.map(async (key) => {
        const benchmark = key.benchmarkId
          ? await ctx.db.get('benchmarks', key.benchmarkId)
          : null
        return {
          publicId: key.publicId,
          label: key.label,
          fingerprint: key.fingerprint,
          scope: key.scope,
          benchmark: benchmark
            ? { slug: benchmark.slug, title: benchmark.title }
            : null,
          status: key.status,
          createdAt: key.createdAt,
        }
      }),
    )
  },
})

export const registrationOptions = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const benchmarks = await ctx.db
      .query('benchmarks')
      .withIndex('by_ownerId_status_publishedAt', (query) =>
        query.eq('ownerId', user._id).eq('status', 'published'),
      )
      .order('desc')
      .take(100)
    return benchmarks.map((benchmark) => ({
      id: benchmark._id,
      slug: benchmark.slug,
      title: benchmark.title,
      version: benchmark.currentVersion ?? 'unknown',
    }))
  },
})

export const publicForOwner = defineQuery({
  args: { ownerId: v.id('users') },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query('runnerKeys')
      .withIndex('by_ownerId_createdAt', (query) =>
        query.eq('ownerId', args.ownerId),
      )
      .order('desc')
      .take(50)
    return keys
      .filter((key) => key.status === 'active')
      .map((key) => ({
        publicId: key.publicId,
        label: key.label,
        fingerprint: key.fingerprint,
        scope: key.scope,
        createdAt: key.createdAt,
      }))
  },
})

export const revoke = mutation({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const key = await ctx.db
      .query('runnerKeys')
      .withIndex('by_publicId', (query) => query.eq('publicId', args.publicId))
      .unique()
    if (!key) throw new ConvexError({ code: 'RUNNER_KEY_NOT_FOUND' })
    if (key.ownerId !== user._id && user.role !== 'admin') {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }
    if (key.status === 'revoked') return { status: 'revoked' as const }
    const now = Date.now()
    await ctx.db.patch(key._id, {
      status: 'revoked',
      revokedAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'runner.revoked',
      targetType: 'runner_key',
      targetId: key.publicId,
      createdAt: now,
    })
    return { status: 'revoked' as const }
  },
})

export const moderateStatus = mutation({
  args: {
    publicId: v.string(),
    status: v.union(v.literal('active'), v.literal('suspended')),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireRole(ctx, 'moderator')
    const key = await ctx.db
      .query('runnerKeys')
      .withIndex('by_publicId', (query) => query.eq('publicId', args.publicId))
      .unique()
    if (!key) throw new ConvexError({ code: 'RUNNER_KEY_NOT_FOUND' })
    if (key.status === 'revoked') {
      throw new ConvexError({ code: 'RUNNER_KEY_REVOKED' })
    }
    const now = Date.now()
    await ctx.db.patch(key._id, { status: args.status, updatedAt: now })
    await ctx.db.insert('auditEvents', {
      actorId: moderator._id,
      action: `runner.${args.status}`,
      targetType: 'runner_key',
      targetId: key.publicId,
      publicSummary: bounded(
        args.reason,
        10,
        500,
        'MODERATION_REASON_REQUIRED',
      ),
      createdAt: now,
    })
    return { status: args.status }
  },
})

async function resolveRunnerModel(ctx: MutationCtx, exactModelId: string) {
  const submittedModelId = bounded(exactModelId, 2, 240, 'INVALID_MODEL_ID')
  const canonicalId = submittedModelId.toLowerCase()
  const existing = await ctx.db
    .query('models')
    .withIndex('by_canonicalId', (query) =>
      query.eq('canonicalId', canonicalId),
    )
    .unique()
  if (existing) return { model: existing, submittedModelId }
  const [provider = 'unknown'] = canonicalId.split('/')
  const now = Date.now()
  const modelId = await ctx.db.insert('models', {
    provider: provider.slice(0, 80),
    canonicalId,
    displayName: submittedModelId.slice(0, 100),
    aliases: [],
    status: /(^|[/_.:-])(latest|default|stable)(?:$|[/_.:-])/i.test(canonicalId)
      ? 'disputed_identity'
      : 'active',
    createdAt: now,
    updatedAt: now,
  })
  const model = await ctx.db.get('models', modelId)
  if (!model) throw new ConvexError({ code: 'MODEL_REGISTRATION_FAILED' })
  await bumpCounter(ctx, 'models', 1)
  return { model, submittedModelId }
}

const ingestionMetric = v.object({
  key: v.string(),
  value: v.number(),
  unit: v.optional(v.string()),
})

export const ingestVerified = internalMutation({
  args: {
    requestId: v.string(),
    runnerPublicId: v.string(),
    signature: v.string(),
    receipt: v.object({
      protocolVersion: v.literal('1.0.0'),
      receiptId: v.string(),
      runnerId: v.string(),
      nonce: v.string(),
      benchmarkPublicRef: v.string(),
      benchmarkVersion: v.string(),
      trackId: v.string(),
      modelId: v.string(),
      metrics: v.array(ingestionMetric),
      primaryMetricKey: v.string(),
      primaryMetricValue: v.number(),
      itemCount: v.number(),
      scorerVersion: v.string(),
      configurationDigest: v.string(),
      manifestDigest: v.string(),
      datasetDigest: v.optional(v.string()),
      generatorDigest: v.optional(v.string()),
      completedAt: v.string(),
      endpointExposure: v.union(
        v.literal('trusted_local_model'),
        v.literal('operator_provider_account'),
        v.literal('site_provider_account'),
        v.literal('requester_endpoint'),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const runner = await ctx.db
      .query('runnerKeys')
      .withIndex('by_publicId', (query) =>
        query.eq('publicId', args.runnerPublicId),
      )
      .unique()
    if (!runner || runner.status !== 'active') {
      throw new ConvexError({ code: 'RUNNER_NOT_ACTIVE' })
    }
    if (args.receipt.runnerId !== runner.publicId) {
      throw new ConvexError({ code: 'RUNNER_ID_MISMATCH' })
    }
    await enforceRateLimit(ctx, {
      key: String(runner._id),
      operation: 'receipt.ingest',
      limit: 120,
      windowMs: 60 * 60 * 1_000,
    })
    const existingNonce = await ctx.db
      .query('receiptNonces')
      .withIndex('by_runnerKeyId_nonce', (query) =>
        query.eq('runnerKeyId', runner._id).eq('nonce', args.receipt.nonce),
      )
      .unique()
    if (existingNonce) throw new ConvexError({ code: 'REPLAY_DETECTED' })
    const existingReceipt = await ctx.db
      .query('receipts')
      .withIndex('by_publicId', (query) =>
        query.eq('publicId', args.receipt.receiptId),
      )
      .unique()
    if (existingReceipt) throw new ConvexError({ code: 'RECEIPT_ID_EXISTS' })

    const benchmark = await ctx.db
      .query('benchmarks')
      .withIndex('by_publicRef', (query) =>
        query.eq('publicRef', args.receipt.benchmarkPublicRef),
      )
      .unique()
    if (!benchmark || benchmark.status !== 'published') {
      throw new ConvexError({ code: 'BENCHMARK_NOT_AVAILABLE' })
    }
    if (benchmark.ownerId !== runner.ownerId) {
      throw new ConvexError({ code: 'RUNNER_SCOPE_MISMATCH' })
    }
    if (runner.scope === 'benchmark' && runner.benchmarkId !== benchmark._id) {
      throw new ConvexError({ code: 'RUNNER_SCOPE_MISMATCH' })
    }
    const version = await ctx.db
      .query('benchmarkVersions')
      .withIndex('by_benchmarkId_version', (query) =>
        query
          .eq('benchmarkId', benchmark._id)
          .eq('version', args.receipt.benchmarkVersion),
      )
      .unique()
    if (!version || version.status === 'suspended') {
      throw new ConvexError({ code: 'VERSION_NOT_AVAILABLE' })
    }
    const completedAt = Date.parse(args.receipt.completedAt)
    const now = Date.now()
    if (
      !Number.isFinite(completedAt) ||
      completedAt > now + 5 * 60 * 1_000 ||
      completedAt < now - 30 * 24 * 60 * 60 * 1_000
    ) {
      throw new ConvexError({ code: 'RECEIPT_TIMESTAMP_OUT_OF_RANGE' })
    }
    for (const value of [
      args.receipt.configurationDigest,
      args.receipt.manifestDigest,
      args.receipt.datasetDigest,
      args.receipt.generatorDigest,
    ]) {
      if (value && !digest.test(value)) {
        throw new ConvexError({ code: 'INVALID_DIGEST' })
      }
    }
    const { model, submittedModelId } = await resolveRunnerModel(
      ctx,
      args.receipt.modelId,
    )
    const metrics = args.receipt.metrics.map((metric) => ({
      ...metric,
      label: metric.key,
      direction:
        metric.key === args.receipt.primaryMetricKey
          ? (version.tracks.find((track) => track.id === args.receipt.trackId)
              ?.metricDirection ?? ('neutral' as const))
          : ('neutral' as const),
    }))
    const compatibilityIssues = getReceiptCompatibilityIssues({
      version,
      model,
      trackId: args.receipt.trackId,
      primaryMetricKey: args.receipt.primaryMetricKey,
      scorerVersion: args.receipt.scorerVersion,
      manifestDigest: args.receipt.manifestDigest,
      datasetDigest: args.receipt.datasetDigest,
      generatorDigest: args.receipt.generatorDigest,
      itemCount: args.receipt.itemCount,
    })
    if (compatibilityIssues.length) {
      throw new ConvexError({
        code: 'RECEIPT_INCOMPATIBLE',
        issues: compatibilityIssues,
      })
    }

    const receiptId = await ctx.db.insert('receipts', {
      publicId: args.receipt.receiptId,
      protocolVersion: args.receipt.protocolVersion,
      benchmarkId: benchmark._id,
      benchmarkVersionId: version._id,
      trackId: args.receipt.trackId,
      modelId: model._id,
      submittedModelId,
      submittedByUserId: runner.ownerId,
      source: 'runner',
      verificationLevel: 'runner_signed',
      maintainerOfficial: false,
      independentlyReproduced: false,
      status: 'valid',
      primaryMetricKey: args.receipt.primaryMetricKey,
      primaryMetricValue: args.receipt.primaryMetricValue,
      metrics,
      itemCount: args.receipt.itemCount,
      scorerVersion: args.receipt.scorerVersion,
      configurationDigest: args.receipt.configurationDigest,
      ...(args.receipt.datasetDigest
        ? { datasetDigest: args.receipt.datasetDigest }
        : {}),
      ...(args.receipt.generatorDigest
        ? { generatorDigest: args.receipt.generatorDigest }
        : {}),
      manifestDigest: args.receipt.manifestDigest,
      endpointExposure: args.receipt.endpointExposure,
      completedAt,
      submittedAt: now,
      compatibilityStatus: 'compatible',
      compatibilityIssues: [],
      runnerKeyId: runner._id,
      signature: args.signature,
      signatureFingerprint: runner.fingerprint,
      signatureValid: true,
      synthetic: false,
    })
    await ctx.db.insert('receiptNonces', {
      runnerKeyId: runner._id,
      nonce: safeIdentifier(args.receipt.nonce, 'INVALID_NONCE'),
      receiptPublicId: args.receipt.receiptId,
      createdAt: now,
    })
    await ctx.db.insert('auditEvents', {
      actorId: runner.ownerId,
      action: 'receipt.runner_ingested',
      targetType: 'receipt',
      targetId: args.receipt.receiptId,
      requestId: args.requestId,
      createdAt: now,
    })
    await reconcileBenchmarkReceiptCounters(ctx, benchmark._id)
    await bumpCounter(ctx, 'receipts', 1)
    return { receiptId, publicId: args.receipt.receiptId }
  },
})

export const logIngestionAttempt = internalMutation({
  args: {
    requestId: v.string(),
    runnerPublicId: v.optional(v.string()),
    receiptPublicId: v.optional(v.string()),
    outcome: v.union(v.literal('accepted'), v.literal('rejected')),
    errorCode: v.optional(v.string()),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('receiptIngestionAttempts', {
      ...args,
      durationMs: Math.max(0, Math.min(args.durationMs, 10 * 60 * 1_000)),
      createdAt: Date.now(),
    })
  },
})

export const keyForIngestion = internalQuery({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query('runnerKeys')
      .withIndex('by_publicId', (query) => query.eq('publicId', args.publicId))
      .unique()
    if (!key || key.status !== 'active') return null
    return {
      publicId: key.publicId,
      publicKeySpki: key.publicKeySpki,
      fingerprint: key.fingerprint,
    }
  },
})

export const moderatorList = defineQuery({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'moderator')
    return ctx.db.query('runnerKeys').withIndex('by_status').take(500)
  },
})

export type RunnerKeyId = Id<'runnerKeys'>
