import { ConvexError, v } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import { mutation, query as defineQuery } from './_generated/server'
import {
  requireBenchmarkOwner,
  requireDraftOwner,
  requireUser,
} from './lib/authorization'

const aisleValidator = v.union(
  v.literal('reasoning-row'),
  v.literal('code-corner'),
  v.literal('agent-alley'),
  v.literal('vision-arcade'),
  v.literal('language-lane'),
  v.literal('robustness-booth'),
  v.literal('oddities-tent'),
)

const trackValidator = v.object({
  id: v.string(),
  label: v.string(),
  description: v.string(),
  promptPolicy: v.string(),
  toolPolicy: v.string(),
  retryPolicy: v.string(),
  primaryMetricKey: v.string(),
  metricDirection: v.union(v.literal('maximize'), v.literal('minimize')),
  scorerType: v.union(
    v.literal('exact'),
    v.literal('code'),
    v.literal('human'),
    v.literal('llm_judge'),
    v.literal('hybrid'),
  ),
  scorerVersion: v.string(),
  judgeModel: v.optional(v.string()),
  judgeRubric: v.optional(v.string()),
})

const sealedPolicyValidator = v.object({
  mode: v.union(
    v.literal('none'),
    v.literal('manual_signed'),
    v.literal('author_runner'),
    v.literal('remote_runner'),
    v.literal('managed_later'),
  ),
  itemCount: v.optional(v.number()),
  datasetDigest: v.optional(v.string()),
  generatorDigest: v.optional(v.string()),
  rotationPolicy: v.optional(v.string()),
  endpointExposureNote: v.string(),
})

const draftInputValidator = v.object({
  proposedVersion: v.string(),
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  aisle: aisleValidator,
  tags: v.array(v.string()),
  modalities: v.array(v.string()),
  capabilityStatement: v.string(),
  whyItMatters: v.string(),
  intendedUse: v.string(),
  supportedClaims: v.string(),
  unsupportedClaims: v.string(),
  methodMarkdown: v.string(),
  limitationsMarkdown: v.string(),
  license: v.optional(v.string()),
  repositoryUrl: v.optional(v.string()),
  writeupUrl: v.optional(v.string()),
  sealedPolicy: sealedPolicyValidator,
  tracks: v.array(trackValidator),
  changelogMarkdown: v.string(),
})

const sampleInputValidator = v.object({
  publicSampleId: v.string(),
  inputMarkdown: v.string(),
  expectedMarkdown: v.optional(v.string()),
  explanationMarkdown: v.optional(v.string()),
  confirmedDisplayOnly: v.boolean(),
})

const defaultTrack: Doc<'benchmarkDrafts'>['tracks'][number] = {
  id: 'standard',
  label: 'Standard · no tools',
  description: 'One response per item with no external tools or retries.',
  promptPolicy: 'One instruction per item.',
  toolPolicy: 'No tools.',
  retryPolicy: 'One attempt per item.',
  primaryMetricKey: 'score',
  metricDirection: 'maximize',
  scorerType: 'exact',
  scorerVersion: '1.0.0',
}

const defaultEndpointNote =
  'A model service may retain prompts sent during evaluation. Sealed means hidden from public download, not impossible to leak.'

function normalizeSlug(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function normalizeIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function validateSafeUrl(value: string | undefined, code: string) {
  if (!value) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
  } catch {
    throw new ConvexError({ code })
  }
}

function assertLength(
  value: string,
  minimum: number,
  maximum: number,
  code: string,
) {
  const length = value.trim().length
  if (length < minimum || length > maximum) {
    throw new ConvexError({ code })
  }
}

function validateTracks(tracks: Doc<'benchmarkDrafts'>['tracks']) {
  if (tracks.length === 0 || tracks.length > 8) {
    throw new ConvexError({ code: 'INVALID_TRACK_COUNT' })
  }
  const ids = new Set<string>()
  for (const track of tracks) {
    const id = normalizeIdentifier(track.id)
    if (!id || id !== track.id || ids.has(id)) {
      throw new ConvexError({ code: 'INVALID_OR_DUPLICATE_TRACK_ID' })
    }
    ids.add(id)
    assertLength(track.label, 3, 80, 'INVALID_TRACK_LABEL')
    assertLength(track.description, 10, 280, 'INVALID_TRACK_DESCRIPTION')
    assertLength(track.primaryMetricKey, 1, 64, 'INVALID_METRIC_KEY')
    assertLength(track.scorerVersion, 1, 80, 'INVALID_SCORER_VERSION')
  }
}

function nextPatchVersion(version: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) return '1.0.0'
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`
}

function scorerCategory(
  scorerType: Doc<'benchmarkDrafts'>['tracks'][number]['scorerType'],
) {
  return scorerType === 'llm_judge' ? 'llm-judge' : scorerType
}

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const now = Date.now()
    const benchmarkId = await ctx.db.insert('benchmarks', {
      ownerId: user._id,
      slug: `draft-${now}`,
      publicRef: `draft:${now}`,
      status: 'draft',
      title: 'Untitled benchmark',
      summary: '',
      aisle: 'oddities-tent',
      tags: [],
      modalities: ['text'],
      primaryModality: 'text',
      scorerCategory: 'exact',
      sealed: true,
      hasReceipts: false,
      searchText: '',
      scorerLabel: 'score',
      publicSampleCount: 0,
      sealedItemCount: 0,
      receiptCount: 0,
      distinctModelCount: 0,
      independentReproductionCount: 0,
      saveCount: 0,
      curatorPick: false,
      runnerAvailable: false,
      synthetic: false,
      updatedAt: now,
      createdAt: now,
    })
    await ctx.db.patch(benchmarkId, {
      slug: `draft-${String(benchmarkId).slice(-12)}`,
      publicRef: `draft:${benchmarkId}`,
    })
    const draftId = await ctx.db.insert('benchmarkDrafts', {
      benchmarkId,
      ownerId: user._id,
      proposedVersion: '1.0.0',
      slug: '',
      title: '',
      summary: '',
      aisle: 'oddities-tent',
      tags: [],
      modalities: ['text'],
      capabilityStatement: '',
      whyItMatters: '',
      intendedUse: '',
      supportedClaims: '',
      unsupportedClaims: '',
      methodMarkdown: '',
      limitationsMarkdown: '',
      sealedPolicy: {
        mode: 'author_runner',
        endpointExposureNote: defaultEndpointNote,
      },
      tracks: [defaultTrack],
      changelogMarkdown: 'Initial version.',
      status: 'editing',
      createdAt: now,
      updatedAt: now,
    })
    for (let position = 0; position < 3; position += 1) {
      await ctx.db.insert('draftSamples', {
        draftId,
        ownerId: user._id,
        publicSampleId: `sample-${position + 1}`,
        position,
        inputMarkdown: '',
        confirmedDisplayOnly: false,
        createdAt: now,
        updatedAt: now,
      })
    }
    return { draftId }
  },
})

export const mine = defineQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const [drafts, published, basket] = await Promise.all([
      ctx.db
        .query('benchmarkDrafts')
        .withIndex('by_ownerId_updatedAt', (query) =>
          query.eq('ownerId', user._id),
        )
        .order('desc')
        .take(50),
      ctx.db
        .query('benchmarks')
        .withIndex('by_ownerId_status_publishedAt', (query) =>
          query.eq('ownerId', user._id).eq('status', 'published'),
        )
        .order('desc')
        .take(50),
      ctx.db
        .query('basketSaves')
        .withIndex('by_userId_createdAt', (query) =>
          query.eq('userId', user._id),
        )
        .take(1_000),
    ])

    return {
      profile: {
        handle: user.handle,
        displayName: user.displayName,
        profileComplete: user.profileComplete ?? false,
      },
      drafts: drafts
        .filter(
          (draft) =>
            draft.status !== 'abandoned' && draft.status !== 'published',
        )
        .map((draft) => ({
          id: draft._id,
          title: draft.title || 'Untitled benchmark',
          slug: draft.slug,
          proposedVersion: draft.proposedVersion,
          status: draft.status,
          updatedAt: draft.updatedAt,
          isSuccessor: Boolean(draft.baseVersionId),
        })),
      published: published.map((benchmark) => ({
        slug: benchmark.slug,
        title: benchmark.title,
        version: benchmark.currentVersion ?? 'unknown',
        receiptCount: benchmark.receiptCount,
        saveCount: benchmark.saveCount,
      })),
      basketCount: basket.length,
    }
  },
})

export const get = defineQuery({
  args: { draftId: v.id('benchmarkDrafts') },
  handler: async (ctx, args) => {
    const { draft, user } = await requireDraftOwner(ctx, args.draftId)
    if (draft.status === 'abandoned') return null
    const samples = await ctx.db
      .query('draftSamples')
      .withIndex('by_draftId_position', (query) =>
        query.eq('draftId', draft._id),
      )
      .order('asc')
      .take(20)

    return {
      id: draft._id,
      owner: { handle: user.handle, displayName: user.displayName },
      baseVersionId: draft.baseVersionId,
      publishedVersionId: draft.publishedVersionId,
      proposedVersion: draft.proposedVersion,
      slug: draft.slug,
      title: draft.title,
      summary: draft.summary,
      aisle: draft.aisle,
      tags: draft.tags,
      modalities: draft.modalities,
      capabilityStatement: draft.capabilityStatement,
      whyItMatters: draft.whyItMatters,
      intendedUse: draft.intendedUse,
      supportedClaims: draft.supportedClaims,
      unsupportedClaims: draft.unsupportedClaims,
      methodMarkdown: draft.methodMarkdown,
      limitationsMarkdown: draft.limitationsMarkdown,
      license: draft.license,
      repositoryUrl: draft.repositoryUrl,
      writeupUrl: draft.writeupUrl,
      sealedPolicy: draft.sealedPolicy,
      tracks: draft.tracks,
      changelogMarkdown: draft.changelogMarkdown,
      status: draft.status,
      updatedAt: draft.updatedAt,
      samples: samples.map((sample) => ({
        publicSampleId: sample.publicSampleId,
        inputMarkdown: sample.inputMarkdown,
        expectedMarkdown: sample.expectedMarkdown,
        explanationMarkdown: sample.explanationMarkdown,
        confirmedDisplayOnly: sample.confirmedDisplayOnly,
      })),
    }
  },
})

export const save = mutation({
  args: {
    draftId: v.id('benchmarkDrafts'),
    draft: draftInputValidator,
    samples: v.array(sampleInputValidator),
  },
  handler: async (ctx, args) => {
    const { draft, user } = await requireDraftOwner(ctx, args.draftId)
    if (draft.status === 'published' || draft.status === 'publishing') {
      throw new ConvexError({ code: 'DRAFT_NOT_EDITABLE' })
    }
    if (args.draft.slug && normalizeSlug(args.draft.slug) !== args.draft.slug) {
      throw new ConvexError({ code: 'INVALID_SLUG' })
    }
    if (args.draft.title.length > 100 || args.draft.summary.length > 220) {
      throw new ConvexError({ code: 'DRAFT_FIELD_TOO_LONG' })
    }
    if (args.draft.tags.length > 12 || args.draft.modalities.length > 4) {
      throw new ConvexError({ code: 'DRAFT_LIST_TOO_LONG' })
    }
    if (args.samples.length > 10) {
      throw new ConvexError({ code: 'TOO_MANY_PUBLIC_SAMPLES' })
    }
    validateTracks(args.draft.tracks)
    validateSafeUrl(args.draft.repositoryUrl, 'INVALID_REPOSITORY_URL')
    validateSafeUrl(args.draft.writeupUrl, 'INVALID_WRITEUP_URL')

    const sampleIds = new Set<string>()
    for (const sample of args.samples) {
      const id = normalizeIdentifier(sample.publicSampleId)
      if (!id || id !== sample.publicSampleId || sampleIds.has(id)) {
        throw new ConvexError({ code: 'INVALID_OR_DUPLICATE_SAMPLE_ID' })
      }
      sampleIds.add(id)
      if (
        sample.inputMarkdown.length > 4_000 ||
        (sample.expectedMarkdown?.length ?? 0) > 4_000 ||
        (sample.explanationMarkdown?.length ?? 0) > 4_000
      ) {
        throw new ConvexError({ code: 'PUBLIC_SAMPLE_TOO_LONG' })
      }
    }

    const now = Date.now()
    await ctx.db.patch(draft._id, {
      ...args.draft,
      status: 'editing',
      updatedAt: now,
    })
    const existing = await ctx.db
      .query('draftSamples')
      .withIndex('by_draftId_position', (query) =>
        query.eq('draftId', draft._id),
      )
      .take(20)
    const existingById = new Map(
      existing.map((sample) => [sample.publicSampleId, sample]),
    )
    for (const sample of existing) {
      if (!sampleIds.has(sample.publicSampleId)) await ctx.db.delete(sample._id)
    }
    for (const [position, sample] of args.samples.entries()) {
      const current = existingById.get(sample.publicSampleId)
      const values = {
        ownerId: user._id,
        publicSampleId: sample.publicSampleId,
        position,
        inputMarkdown: sample.inputMarkdown,
        expectedMarkdown: sample.expectedMarkdown,
        explanationMarkdown: sample.explanationMarkdown,
        confirmedDisplayOnly: sample.confirmedDisplayOnly,
        updatedAt: now,
      }
      if (current) {
        await ctx.db.patch(current._id, values)
      } else {
        await ctx.db.insert('draftSamples', {
          draftId: draft._id,
          ownerId: user._id,
          publicSampleId: sample.publicSampleId,
          position,
          inputMarkdown: sample.inputMarkdown,
          ...(sample.expectedMarkdown
            ? { expectedMarkdown: sample.expectedMarkdown }
            : {}),
          ...(sample.explanationMarkdown
            ? { explanationMarkdown: sample.explanationMarkdown }
            : {}),
          confirmedDisplayOnly: sample.confirmedDisplayOnly,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    return { updatedAt: now }
  },
})

export const createSuccessor = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const benchmark = await ctx.db
      .query('benchmarks')
      .withIndex('by_slug', (query) => query.eq('slug', args.slug))
      .unique()
    if (!benchmark || !benchmark.currentVersionId) {
      throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
    }
    const { user } = await requireBenchmarkOwner(ctx, benchmark._id)
    const editingDraft = await ctx.db
      .query('benchmarkDrafts')
      .withIndex('by_benchmarkId_status', (query) =>
        query.eq('benchmarkId', benchmark._id).eq('status', 'editing'),
      )
      .first()
    const readyDraft = editingDraft
      ? null
      : await ctx.db
          .query('benchmarkDrafts')
          .withIndex('by_benchmarkId_status', (query) =>
            query.eq('benchmarkId', benchmark._id).eq('status', 'ready'),
          )
          .first()
    const existing = editingDraft ?? readyDraft
    if (existing) return { draftId: existing._id, existing: true }

    const version = await ctx.db.get(
      'benchmarkVersions',
      benchmark.currentVersionId,
    )
    if (!version) throw new ConvexError({ code: 'VERSION_NOT_FOUND' })
    const publicSamples = await ctx.db
      .query('publicSamples')
      .withIndex('by_benchmarkVersionId_position', (query) =>
        query.eq('benchmarkVersionId', version._id),
      )
      .order('asc')
      .take(20)
    const now = Date.now()
    const draftId = await ctx.db.insert('benchmarkDrafts', {
      benchmarkId: benchmark._id,
      ownerId: user._id,
      baseVersionId: version._id,
      proposedVersion: nextPatchVersion(version.version),
      slug: benchmark.slug,
      title: version.title,
      summary: version.summary,
      aisle: version.aisle,
      tags: version.tags,
      modalities: version.modalities,
      capabilityStatement: version.capabilityStatement,
      whyItMatters: version.whyItMatters,
      intendedUse: version.intendedUse,
      supportedClaims: version.supportedClaims,
      unsupportedClaims: version.unsupportedClaims,
      methodMarkdown: version.methodMarkdown,
      limitationsMarkdown: version.limitationsMarkdown,
      ...(version.license ? { license: version.license } : {}),
      ...(version.repositoryUrl
        ? { repositoryUrl: version.repositoryUrl }
        : {}),
      ...(version.writeupUrl ? { writeupUrl: version.writeupUrl } : {}),
      sealedPolicy: version.sealedPolicy,
      tracks: version.tracks,
      changelogMarkdown: '',
      status: 'editing',
      createdAt: now,
      updatedAt: now,
    })
    for (const [position, sample] of publicSamples.entries()) {
      await ctx.db.insert('draftSamples', {
        draftId,
        ownerId: user._id,
        publicSampleId: sample.publicSampleId,
        position,
        inputMarkdown: sample.inputMarkdown,
        ...(sample.expectedMarkdown
          ? { expectedMarkdown: sample.expectedMarkdown }
          : {}),
        ...(sample.explanationMarkdown
          ? { explanationMarkdown: sample.explanationMarkdown }
          : {}),
        confirmedDisplayOnly: true,
        createdAt: now,
        updatedAt: now,
      })
    }
    return { draftId, existing: false }
  },
})

export const publish = mutation({
  args: {
    draftId: v.id('benchmarkDrafts'),
    confirmations: v.object({
      samplesArePublic: v.literal(true),
      samplesExcludedFromScore: v.literal(true),
      noHiddenItems: v.literal(true),
      rightsConfirmed: v.literal(true),
    }),
  },
  handler: async (ctx, args) => {
    const { draft, user } = await requireDraftOwner(ctx, args.draftId)
    if (draft.publishedVersionId) {
      const published = await ctx.db.get(
        'benchmarkVersions',
        draft.publishedVersionId,
      )
      if (published) {
        const benchmark = await ctx.db.get('benchmarks', draft.benchmarkId)
        if (benchmark) {
          return { slug: benchmark.slug, version: published.version }
        }
      }
    }
    if (draft.status === 'published' || draft.status === 'publishing') {
      throw new ConvexError({ code: 'DRAFT_NOT_PUBLISHABLE' })
    }
    if (!user.profileComplete) {
      throw new ConvexError({ code: 'PROFILE_SETUP_REQUIRED' })
    }

    const benchmark = await ctx.db.get('benchmarks', draft.benchmarkId)
    if (!benchmark) throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
    if (benchmark.ownerId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }
    if (benchmark.status === 'published' && benchmark.slug !== draft.slug) {
      throw new ConvexError({ code: 'PUBLISHED_SLUG_IMMUTABLE' })
    }
    if (
      draft.baseVersionId &&
      benchmark.currentVersionId !== draft.baseVersionId
    ) {
      throw new ConvexError({ code: 'SUCCESSOR_BASE_IS_STALE' })
    }

    const slug = normalizeSlug(draft.slug)
    if (slug !== draft.slug || slug.length < 3) {
      throw new ConvexError({ code: 'INVALID_SLUG' })
    }
    if (!/^\d+\.\d+\.\d+$/.test(draft.proposedVersion)) {
      throw new ConvexError({ code: 'INVALID_SEMVER' })
    }
    assertLength(draft.title, 3, 100, 'TITLE_REQUIRED')
    assertLength(draft.summary, 20, 220, 'SUMMARY_REQUIRED')
    assertLength(
      draft.capabilityStatement,
      20,
      1_500,
      'CAPABILITY_STATEMENT_REQUIRED',
    )
    assertLength(draft.methodMarkdown, 30, 8_000, 'METHOD_REQUIRED')
    assertLength(draft.limitationsMarkdown, 10, 5_000, 'LIMITATION_REQUIRED')
    assertLength(draft.supportedClaims, 10, 2_000, 'SUPPORTED_CLAIMS_REQUIRED')
    assertLength(
      draft.unsupportedClaims,
      10,
      2_000,
      'UNSUPPORTED_CLAIMS_REQUIRED',
    )
    assertLength(draft.changelogMarkdown, 3, 2_000, 'CHANGELOG_REQUIRED')
    validateTracks(draft.tracks)
    validateSafeUrl(draft.repositoryUrl, 'INVALID_REPOSITORY_URL')
    validateSafeUrl(draft.writeupUrl, 'INVALID_WRITEUP_URL')
    if (
      draft.sealedPolicy.mode !== 'none' &&
      (!draft.sealedPolicy.itemCount || draft.sealedPolicy.itemCount < 1)
    ) {
      throw new ConvexError({ code: 'SEALED_ITEM_COUNT_REQUIRED' })
    }
    assertLength(
      draft.sealedPolicy.endpointExposureNote,
      20,
      1_000,
      'ENDPOINT_EXPOSURE_NOTE_REQUIRED',
    )

    const collision = await ctx.db
      .query('benchmarks')
      .withIndex('by_slug', (query) => query.eq('slug', slug))
      .unique()
    if (collision && collision._id !== benchmark._id) {
      throw new ConvexError({ code: 'SLUG_TAKEN' })
    }
    const versionCollision = await ctx.db
      .query('benchmarkVersions')
      .withIndex('by_benchmarkId_version', (query) =>
        query
          .eq('benchmarkId', benchmark._id)
          .eq('version', draft.proposedVersion),
      )
      .unique()
    if (versionCollision) {
      throw new ConvexError({ code: 'VERSION_ALREADY_EXISTS' })
    }

    const samples = await ctx.db
      .query('draftSamples')
      .withIndex('by_draftId_position', (query) =>
        query.eq('draftId', draft._id),
      )
      .order('asc')
      .take(20)
    if (
      samples.length < 3 ||
      samples.some(
        (sample) =>
          !sample.confirmedDisplayOnly || !sample.inputMarkdown.trim(),
      )
    ) {
      throw new ConvexError({ code: 'PUBLIC_SAMPLES_INCOMPLETE' })
    }

    const manifest = {
      protocolVersion: '1.0',
      publicRef: `${user.handle}/${slug}@${draft.proposedVersion}`,
      version: draft.proposedVersion,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      aisle: draft.aisle,
      tags: draft.tags,
      modalities: draft.modalities,
      capabilityStatement: draft.capabilityStatement,
      methodMarkdown: draft.methodMarkdown,
      limitationsMarkdown: draft.limitationsMarkdown,
      tracks: draft.tracks,
      sealedPolicy: draft.sealedPolicy,
      publicSampleIds: samples.map((sample) => sample.publicSampleId),
    }
    const manifestDigest = await sha256(canonicalize(manifest))
    const now = Date.now()
    const versionId = await ctx.db.insert('benchmarkVersions', {
      benchmarkId: benchmark._id,
      ownerId: user._id,
      version: draft.proposedVersion,
      publicRef: manifest.publicRef,
      status: 'current',
      ...(benchmark.currentVersionId
        ? { supersedesVersionId: benchmark.currentVersionId }
        : {}),
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      aisle: draft.aisle,
      tags: draft.tags,
      modalities: draft.modalities,
      capabilityStatement: draft.capabilityStatement.trim(),
      whyItMatters: draft.whyItMatters.trim(),
      intendedUse: draft.intendedUse.trim(),
      supportedClaims: draft.supportedClaims.trim(),
      unsupportedClaims: draft.unsupportedClaims.trim(),
      methodMarkdown: draft.methodMarkdown.trim(),
      limitationsMarkdown: draft.limitationsMarkdown.trim(),
      ...(draft.license ? { license: draft.license.trim() } : {}),
      ...(draft.repositoryUrl
        ? { repositoryUrl: draft.repositoryUrl.trim() }
        : {}),
      ...(draft.writeupUrl ? { writeupUrl: draft.writeupUrl.trim() } : {}),
      tracks: draft.tracks,
      sealedPolicy: draft.sealedPolicy,
      manifestProtocolVersion: '1.0',
      manifestDigest,
      changelogMarkdown: draft.changelogMarkdown.trim(),
      comparability: draft.baseVersionId
        ? 'partially_compatible'
        : 'compatible',
      publishedAt: now,
    })
    for (const [position, sample] of samples.entries()) {
      await ctx.db.insert('publicSamples', {
        benchmarkVersionId: versionId,
        benchmarkId: benchmark._id,
        publicSampleId: sample.publicSampleId,
        position,
        inputMarkdown: sample.inputMarkdown.trim(),
        ...(sample.expectedMarkdown?.trim()
          ? { expectedMarkdown: sample.expectedMarkdown.trim() }
          : {}),
        ...(sample.explanationMarkdown?.trim()
          ? { explanationMarkdown: sample.explanationMarkdown.trim() }
          : {}),
        includedInOfficialScore: false,
        publishedAt: now,
      })
    }
    if (benchmark.currentVersionId) {
      await ctx.db.patch(benchmark.currentVersionId, { status: 'historical' })
    }
    const firstTrack = draft.tracks[0]
    await ctx.db.patch(benchmark._id, {
      slug,
      publicRef: `${user.handle}/${slug}`,
      status: 'published',
      currentVersionId: versionId,
      currentVersion: draft.proposedVersion,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      aisle: draft.aisle,
      tags: draft.tags,
      modalities: draft.modalities,
      primaryModality: draft.modalities[0] ?? 'text',
      scorerCategory: scorerCategory(firstTrack.scorerType),
      sealed: draft.sealedPolicy.mode !== 'none',
      hasReceipts: benchmark.receiptCount > 0,
      searchText: [
        draft.title,
        draft.summary,
        draft.capabilityStatement,
        user.handle,
        ...draft.tags,
      ].join(' '),
      scorerLabel: firstTrack.primaryMetricKey,
      publicSampleCount: samples.length,
      sealedItemCount: draft.sealedPolicy.itemCount ?? 0,
      runnerAvailable: ['author_runner', 'remote_runner'].includes(
        draft.sealedPolicy.mode,
      ),
      publishedAt: benchmark.publishedAt ?? now,
      updatedAt: now,
    })
    await ctx.db.patch(draft._id, {
      status: 'published',
      publishedVersionId: versionId,
      updatedAt: now,
    })
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: draft.baseVersionId
        ? 'benchmark.version.published_successor'
        : 'benchmark.version.published_initial',
      targetType: 'benchmarkVersion',
      targetId: String(versionId),
      publicSummary: `Published ${slug} version ${draft.proposedVersion}.`,
      createdAt: now,
    })
    return { slug, version: draft.proposedVersion }
  },
})
