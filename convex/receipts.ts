import { ConvexError, v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import {
  internalMutation,
  mutation,
  query as defineQuery,
} from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireBenchmarkOwner, requireUser } from './lib/authorization'
import { bumpCounter } from './lib/counters'
import { enforceRateLimit } from './lib/rate_limits'
import { getReceiptCompatibilityIssues } from './lib/receipt_compatibility'
import { reconcileBenchmarkReceiptCounters } from './lib/receipt_counters'

const metricValidator = v.object({
  key: v.string(),
  label: v.string(),
  value: v.number(),
  unit: v.optional(v.string()),
  direction: v.union(
    v.literal('maximize'),
    v.literal('minimize'),
    v.literal('neutral'),
  ),
})

const artifactValidator = v.object({
  label: v.string(),
  url: v.string(),
  digest: v.optional(v.string()),
})

const endpointExposureValidator = v.union(
  v.literal('trusted_local_model'),
  v.literal('operator_provider_account'),
  v.literal('site_provider_account'),
  v.literal('requester_endpoint'),
  v.literal('unknown_or_legacy'),
)

const manualReceiptArgs = {
  benchmarkVersionId: v.id('benchmarkVersions'),
  trackId: v.string(),
  exactModelId: v.string(),
  modelProvider: v.string(),
  modelDisplayName: v.string(),
  metrics: v.array(metricValidator),
  itemCount: v.number(),
  scorerVersion: v.string(),
  manifestDigest: v.string(),
  datasetDigest: v.optional(v.string()),
  generatorDigest: v.optional(v.string()),
  configurationSummary: v.string(),
  endpointExposure: endpointExposureValidator,
  completedAt: v.number(),
  artifactRefs: v.array(artifactValidator),
  notesMarkdown: v.optional(v.string()),
  supersedesReceiptId: v.optional(v.string()),
  confirmations: v.object({
    aggregateOnly: v.literal(true),
    noHiddenContent: v.literal(true),
    publicEvidenceOnly: v.literal(true),
  }),
}

function bounded(
  value: string,
  minimum: number,
  maximum: number,
  code: string,
) {
  const normalized = value.trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new ConvexError({ code })
  }
  return normalized
}

function optionalBounded(value: string | undefined, maximum: number) {
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (normalized.length > maximum) {
    throw new ConvexError({ code: 'FIELD_TOO_LONG' })
  }
  return normalized
}

function identifier(value: string, code: string) {
  const normalized = value.trim().toLowerCase()
  if (
    normalized.length < 2 ||
    normalized.length > 160 ||
    !/^[a-z0-9][a-z0-9._:/-]*[a-z0-9]$/.test(normalized)
  ) {
    throw new ConvexError({ code })
  }
  return normalized
}

function safeHttpsUrl(value: string, code: string) {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new ConvexError({ code })
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new ConvexError({ code })
  }
  return parsed.toString()
}

function isAmbiguousModelId(value: string) {
  return /(^|[/_.:-])(latest|default|stable)(?:$|[/_.:-])/i.test(value)
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`
}

async function resolveModel(
  ctx: MutationCtx,
  args: {
    exactModelId: string
    modelProvider: string
    modelDisplayName: string
  },
) {
  const submittedModelId = bounded(
    args.exactModelId,
    2,
    160,
    'INVALID_MODEL_ID',
  )
  const canonicalId = identifier(submittedModelId, 'INVALID_MODEL_ID')
  const existing = await ctx.db
    .query('models')
    .withIndex('by_canonicalId', (query) =>
      query.eq('canonicalId', canonicalId),
    )
    .unique()
  if (existing) return { model: existing, submittedModelId, created: false }

  const now = Date.now()
  const modelId = await ctx.db.insert('models', {
    provider: bounded(args.modelProvider, 2, 80, 'MODEL_PROVIDER_REQUIRED'),
    canonicalId,
    displayName: bounded(
      args.modelDisplayName,
      2,
      100,
      'MODEL_DISPLAY_NAME_REQUIRED',
    ),
    aliases: [],
    status: isAmbiguousModelId(canonicalId) ? 'disputed_identity' : 'active',
    createdAt: now,
    updatedAt: now,
  })
  const model = await ctx.db.get('models', modelId)
  if (!model) throw new ConvexError({ code: 'MODEL_REGISTRATION_FAILED' })
  await bumpCounter(ctx, 'models', 1)
  return { model, submittedModelId, created: true }
}

async function receiptCompatibility(
  ctx: QueryCtx | MutationCtx,
  receipt: Doc<'receipts'>,
) {
  if (receipt.compatibilityStatus) {
    return {
      compatible: receipt.compatibilityStatus === 'compatible',
      issues: receipt.compatibilityIssues ?? [],
    }
  }
  const [version, model] = await Promise.all([
    ctx.db.get('benchmarkVersions', receipt.benchmarkVersionId),
    ctx.db.get('models', receipt.modelId),
  ])
  if (!version || !model) {
    return { compatible: false, issues: ['receipt dependency is missing'] }
  }
  const issues = getReceiptCompatibilityIssues({
    version,
    model,
    trackId: receipt.trackId,
    primaryMetricKey: receipt.primaryMetricKey,
    scorerVersion: receipt.scorerVersion,
    manifestDigest: receipt.manifestDigest,
    datasetDigest: receipt.datasetDigest,
    generatorDigest: receipt.generatorDigest,
    itemCount: receipt.itemCount,
  })
  return { compatible: issues.length === 0, issues }
}

function receiptPublicId(receiptId: Id<'receipts'>, completedAt: number) {
  const year = new Date(completedAt).getUTCFullYear()
  return `BBR-${year}-${String(receiptId).slice(-12).toUpperCase()}`
}

export const submissionOptions = defineQuery({
  args: { supersedesReceiptId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const [benchmarks, models] = await Promise.all([
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'published'),
        )
        .order('desc')
        .take(200),
      ctx.db.query('models').take(500),
    ])
    const benchmarkOptions = await Promise.all(
      benchmarks.map(async (benchmark) => ({
        slug: benchmark.slug,
        title: benchmark.title,
        versions: (
          await ctx.db
            .query('benchmarkVersions')
            .withIndex('by_benchmarkId_publishedAt', (query) =>
              query.eq('benchmarkId', benchmark._id),
            )
            .order('desc')
            .take(50)
        )
          .filter((version) => version.status !== 'suspended')
          .map((version) => ({
            id: version._id,
            version: version.version,
            status: version.status,
            manifestDigest: version.manifestDigest,
            itemCount: version.sealedPolicy.itemCount,
            datasetDigest: version.sealedPolicy.datasetDigest,
            generatorDigest: version.sealedPolicy.generatorDigest,
            tracks: version.tracks.map((track) => ({
              id: track.id,
              label: track.label,
              primaryMetricKey: track.primaryMetricKey,
              metricDirection: track.metricDirection,
              scorerVersion: track.scorerVersion,
            })),
          })),
      })),
    )

    let correction
    if (args.supersedesReceiptId) {
      const oldReceipt = await ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', args.supersedesReceiptId as string),
        )
        .unique()
      if (
        !oldReceipt ||
        oldReceipt.submittedByUserId !== user._id ||
        oldReceipt.source === 'runner'
      ) {
        throw new ConvexError({ code: 'RECEIPT_NOT_CORRECTABLE' })
      }
      const model = await ctx.db.get('models', oldReceipt.modelId)
      if (!model) throw new ConvexError({ code: 'MODEL_NOT_FOUND' })
      correction = {
        receiptId: oldReceipt.publicId,
        benchmarkVersionId: oldReceipt.benchmarkVersionId,
        trackId: oldReceipt.trackId,
        exactModelId: oldReceipt.submittedModelId,
        canonicalModelId: model.canonicalId,
        modelProvider: model.provider,
        modelDisplayName: model.displayName,
        metrics: oldReceipt.metrics,
        itemCount: oldReceipt.itemCount,
        scorerVersion: oldReceipt.scorerVersion,
        manifestDigest: oldReceipt.manifestDigest,
        datasetDigest: oldReceipt.datasetDigest,
        generatorDigest: oldReceipt.generatorDigest,
        configurationSummary: oldReceipt.configurationSummary ?? '',
        endpointExposure: oldReceipt.endpointExposure,
        completedAt: oldReceipt.completedAt,
        artifactRefs: oldReceipt.artifactRefs ?? [],
        notesMarkdown: oldReceipt.notesMarkdown,
      }
    }

    return {
      benchmarks: benchmarkOptions.filter(
        (benchmark) => benchmark.versions.length > 0,
      ),
      models: models
        .map((model) => ({
          canonicalId: model.canonicalId,
          provider: model.provider,
          displayName: model.displayName,
          status: model.status,
          aliases: model.aliases,
        }))
        .sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        ),
      correction,
    }
  },
})

export const mine = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const documents = await ctx.db
      .query('receipts')
      .withIndex('by_submittedByUserId_submittedAt', (query) =>
        query.eq('submittedByUserId', user._id),
      )
      .order('desc')
      .take(50)

    return Promise.all(
      documents.map(async (receipt) => {
        const [benchmark, version, model, compatibility] = await Promise.all([
          ctx.db.get('benchmarks', receipt.benchmarkId),
          ctx.db.get('benchmarkVersions', receipt.benchmarkVersionId),
          ctx.db.get('models', receipt.modelId),
          receiptCompatibility(ctx, receipt),
        ])
        return {
          id: receipt.publicId,
          benchmarkTitle: version?.title ?? benchmark?.title ?? 'Unknown',
          benchmarkSlug: benchmark?.slug ?? '',
          version: version?.version ?? 'unknown',
          trackId: receipt.trackId,
          model: model?.displayName ?? receipt.submittedModelId,
          submittedAt: receipt.submittedAt,
          state: receipt.status,
          verification: receipt.verificationLevel,
          compatible: compatibility.compatible,
        }
      }),
    )
  },
})

export const submitManual = mutation({
  args: manualReceiptArgs,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await enforceRateLimit(ctx, {
      key: String(user._id),
      operation: 'receipts.submitManual',
      limit: 60,
      windowMs: 24 * 60 * 60 * 1_000,
    })
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
    const track = version.tracks.find(
      (candidate) => candidate.id === args.trackId,
    )
    if (!track) throw new ConvexError({ code: 'TRACK_NOT_FOUND' })

    if (args.metrics.length < 1 || args.metrics.length > 10) {
      throw new ConvexError({ code: 'INVALID_METRIC_COUNT' })
    }
    const metricKeys = new Set<string>()
    const metrics = args.metrics.map((metric) => {
      const key = identifier(metric.key, 'INVALID_METRIC_KEY')
      const unit = optionalBounded(metric.unit, 20)
      if (metricKeys.has(key) || !Number.isFinite(metric.value)) {
        throw new ConvexError({ code: 'INVALID_OR_DUPLICATE_METRIC' })
      }
      metricKeys.add(key)
      return {
        key,
        label: bounded(metric.label, 1, 80, 'METRIC_LABEL_REQUIRED'),
        value: metric.value,
        ...(unit ? { unit } : {}),
        direction:
          key === track.primaryMetricKey
            ? track.metricDirection
            : metric.direction,
      }
    })
    const primaryMetric = metrics.find(
      (metric) => metric.key === track.primaryMetricKey,
    )
    if (!primaryMetric) {
      throw new ConvexError({ code: 'PRIMARY_METRIC_REQUIRED' })
    }
    if (
      !Number.isInteger(args.itemCount) ||
      args.itemCount < 1 ||
      args.itemCount > 1_000_000
    ) {
      throw new ConvexError({ code: 'INVALID_ITEM_COUNT' })
    }
    const now = Date.now()
    if (
      !Number.isFinite(args.completedAt) ||
      args.completedAt < Date.UTC(2000, 0, 1) ||
      args.completedAt > now + 5 * 60_000
    ) {
      throw new ConvexError({ code: 'INVALID_COMPLETION_TIME' })
    }

    const configurationSummary = bounded(
      args.configurationSummary,
      20,
      4_000,
      'CONFIGURATION_SUMMARY_REQUIRED',
    )
    const scorerVersion = bounded(
      args.scorerVersion,
      1,
      80,
      'SCORER_VERSION_REQUIRED',
    )
    const manifestDigest = bounded(
      args.manifestDigest,
      8,
      300,
      'MANIFEST_DIGEST_REQUIRED',
    )
    const datasetDigest = optionalBounded(args.datasetDigest, 300)
    const generatorDigest = optionalBounded(args.generatorDigest, 300)
    const notesMarkdown = optionalBounded(args.notesMarkdown, 2_000)
    if (args.artifactRefs.length > 3) {
      throw new ConvexError({ code: 'TOO_MANY_ARTIFACTS' })
    }
    const artifactRefs = args.artifactRefs.map((artifact) => {
      const digest = optionalBounded(artifact.digest, 300)
      return {
        label: bounded(artifact.label, 2, 100, 'ARTIFACT_LABEL_REQUIRED'),
        url: safeHttpsUrl(artifact.url, 'INVALID_ARTIFACT_URL'),
        ...(digest ? { digest } : {}),
      }
    })

    const {
      model,
      submittedModelId,
      created: modelCreated,
    } = await resolveModel(ctx, args)
    const compatibilityIssues = getReceiptCompatibilityIssues({
      version,
      model,
      trackId: track.id,
      primaryMetricKey: track.primaryMetricKey,
      scorerVersion,
      manifestDigest,
      datasetDigest,
      generatorDigest,
      itemCount: args.itemCount,
    })

    let supersededReceipt: Doc<'receipts'> | null = null
    if (args.supersedesReceiptId) {
      supersededReceipt = await ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', args.supersedesReceiptId as string),
        )
        .unique()
      const existingSuccessor = supersededReceipt
        ? await ctx.db
            .query('receipts')
            .withIndex('by_supersedesReceiptId', (query) =>
              query.eq('supersedesReceiptId', supersededReceipt!._id),
            )
            .unique()
        : null
      if (
        !supersededReceipt ||
        supersededReceipt.submittedByUserId !== user._id ||
        supersededReceipt.source === 'runner' ||
        supersededReceipt.status === 'superseded' ||
        existingSuccessor ||
        supersededReceipt.benchmarkVersionId !== version._id ||
        supersededReceipt.trackId !== track.id ||
        supersededReceipt.modelId !== model._id
      ) {
        throw new ConvexError({ code: 'RECEIPT_NOT_CORRECTABLE' })
      }
    }

    const configurationDigest = await sha256(
      JSON.stringify({
        benchmarkVersion: version.publicRef,
        trackId: track.id,
        submittedModelId,
        configurationSummary,
        endpointExposure: args.endpointExposure,
      }),
    )
    const placeholder = `pending:${now}:${user._id}`
    const receiptId = await ctx.db.insert('receipts', {
      publicId: placeholder,
      protocolVersion: 'manual.v1',
      benchmarkId: benchmark._id,
      benchmarkVersionId: version._id,
      trackId: track.id,
      modelId: model._id,
      submittedModelId,
      submittedByUserId: user._id,
      source: artifactRefs.length > 0 ? 'artifact' : 'manual',
      verificationLevel:
        artifactRefs.length > 0 ? 'artifact_linked' : 'self_reported',
      maintainerOfficial: false,
      independentlyReproduced: false,
      status: 'valid',
      primaryMetricKey: track.primaryMetricKey,
      primaryMetricValue: primaryMetric.value,
      metrics,
      itemCount: args.itemCount,
      scorerVersion,
      configurationSummary,
      configurationDigest,
      ...(datasetDigest ? { datasetDigest } : {}),
      ...(generatorDigest ? { generatorDigest } : {}),
      manifestDigest,
      endpointExposure: args.endpointExposure,
      completedAt: args.completedAt,
      submittedAt: now,
      ...(artifactRefs.length > 0 ? { artifactRefs } : {}),
      ...(notesMarkdown ? { notesMarkdown } : {}),
      ...(supersededReceipt
        ? { supersedesReceiptId: supersededReceipt._id }
        : {}),
      compatibilityStatus:
        compatibilityIssues.length === 0 ? 'compatible' : 'incompatible',
      compatibilityIssues,
      signatureValid: false,
      synthetic: false,
    })
    const publicId = receiptPublicId(receiptId, args.completedAt)
    await ctx.db.patch(receiptId, { publicId })

    if (supersededReceipt) {
      await ctx.db.patch(supersededReceipt._id, { status: 'superseded' })
      await ctx.db.insert('auditEvents', {
        actorId: user._id,
        action: 'receipt.superseded',
        targetType: 'receipt',
        targetId: supersededReceipt.publicId,
        publicSummary: `Superseded by ${publicId}.`,
        createdAt: now,
      })
    }
    if (modelCreated) {
      await ctx.db.insert('auditEvents', {
        actorId: user._id,
        action: 'model.registered',
        targetType: 'model',
        targetId: model.canonicalId,
        createdAt: now,
      })
    }
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'receipt.submitted_manual',
      targetType: 'receipt',
      targetId: publicId,
      createdAt: now,
    })
    await reconcileBenchmarkReceiptCounters(ctx, benchmark._id)
    await bumpCounter(ctx, 'receipts', 1)

    return {
      receiptId: publicId,
      compatible: compatibilityIssues.length === 0,
      compatibilityIssues,
      verificationLevel:
        artifactRefs.length > 0
          ? ('artifact_linked' as const)
          : ('self_reported' as const),
    }
  },
})

export const viewerActions = defineQuery({
  args: { receiptId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const receipt = await ctx.db
      .query('receipts')
      .withIndex('by_publicId', (query) => query.eq('publicId', args.receiptId))
      .unique()
    if (!receipt) return null
    const [benchmark, successor, compatibility] = await Promise.all([
      ctx.db.get('benchmarks', receipt.benchmarkId),
      ctx.db
        .query('receipts')
        .withIndex('by_supersedesReceiptId', (query) =>
          query.eq('supersedesReceiptId', receipt._id),
        )
        .unique(),
      receiptCompatibility(ctx, receipt),
    ])
    const isAdmin = user.role === 'admin'
    const isSubmitter = receipt.submittedByUserId === user._id
    const isMaintainer = benchmark?.ownerId === user._id
    return {
      canSupersede:
        (isSubmitter || isAdmin) &&
        receipt.source !== 'runner' &&
        receipt.status !== 'superseded' &&
        !successor,
      canMarkOfficial:
        (isMaintainer || isAdmin) &&
        receipt.status === 'valid' &&
        compatibility.compatible &&
        !receipt.maintainerOfficial,
      canDispute:
        (isMaintainer || isSubmitter || isAdmin) && receipt.status === 'valid',
    }
  },
})

export const markMaintainerOfficial = mutation({
  args: { receiptId: v.string() },
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query('receipts')
      .withIndex('by_publicId', (query) => query.eq('publicId', args.receiptId))
      .unique()
    if (!receipt) throw new ConvexError({ code: 'RECEIPT_NOT_FOUND' })
    const { user } = await requireBenchmarkOwner(ctx, receipt.benchmarkId)
    if (receipt.maintainerOfficial) return { official: true }
    const compatibility = await receiptCompatibility(ctx, receipt)
    if (receipt.status !== 'valid' || !compatibility.compatible) {
      throw new ConvexError({ code: 'RECEIPT_NOT_ELIGIBLE' })
    }
    const now = Date.now()
    await ctx.db.patch(receipt._id, { maintainerOfficial: true })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'receipt.designated_maintainer_official',
      targetType: 'receipt',
      targetId: receipt.publicId,
      publicSummary: 'Designated maintainer official.',
      createdAt: now,
    })
    return { official: true }
  },
})

export const dispute = mutation({
  args: { receiptId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await enforceRateLimit(ctx, {
      key: String(user._id),
      operation: 'receipts.dispute',
      limit: 30,
      windowMs: 24 * 60 * 60 * 1_000,
    })
    const receipt = await ctx.db
      .query('receipts')
      .withIndex('by_publicId', (query) => query.eq('publicId', args.receiptId))
      .unique()
    if (!receipt) throw new ConvexError({ code: 'RECEIPT_NOT_FOUND' })
    const benchmark = await ctx.db.get('benchmarks', receipt.benchmarkId)
    const authorized =
      user.role === 'admin' ||
      receipt.submittedByUserId === user._id ||
      benchmark?.ownerId === user._id
    if (!authorized) throw new ConvexError({ code: 'FORBIDDEN' })
    if (receipt.status === 'disputed') return { disputed: true }
    if (receipt.status !== 'valid') {
      throw new ConvexError({ code: 'RECEIPT_NOT_DISPUTABLE' })
    }
    const reason = bounded(args.reason, 20, 1_000, 'DISPUTE_REASON_REQUIRED')
    const now = Date.now()
    await ctx.db.insert('receiptDisputes', {
      receiptId: receipt._id,
      openedByUserId: user._id,
      reason,
      status: 'open',
      createdAt: now,
    })
    await ctx.db.patch(receipt._id, {
      status: 'disputed',
      disputeSummary: reason,
    })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: 'receipt.disputed',
      targetType: 'receipt',
      targetId: receipt.publicId,
      publicSummary: reason,
      createdAt: now,
    })
    await reconcileBenchmarkReceiptCounters(ctx, receipt.benchmarkId)
    return { disputed: true }
  },
})

export const reconcileCounters = internalMutation({
  args: { confirm: v.literal(true) },
  handler: async (ctx) => {
    const benchmarks = await ctx.db.query('benchmarks').take(10_000)
    let updated = 0
    for (const benchmark of benchmarks) {
      if (await reconcileBenchmarkReceiptCounters(ctx, benchmark._id)) {
        updated += 1
      }
    }
    return { scanned: benchmarks.length, updated }
  },
})
