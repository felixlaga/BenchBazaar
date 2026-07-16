import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'

import type {
  AisleId,
  AislePageData,
  BenchmarkDetail,
  BenchmarkPageData,
  BenchmarkSummary,
  HomePageData,
  ModelPageData,
  Receipt,
  ReceiptState,
  Scoreboard,
  StallPageData,
  Track,
  VerificationStatus,
} from '../src/features/catalog/domain/catalog'
import { aisles } from '../src/features/catalog/domain/aisles'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query as defineQuery } from './_generated/server'
import { getReceiptCompatibilityIssues } from './lib/receipt_compatibility'

const PAGE_SIZE = 6
const MAX_SECTION_RESULTS = 100

const aisleValidator = v.union(
  v.literal('reasoning-row'),
  v.literal('code-corner'),
  v.literal('agent-alley'),
  v.literal('vision-arcade'),
  v.literal('language-lane'),
  v.literal('robustness-booth'),
  v.literal('oddities-tent'),
)

const browseSortValidator = v.union(
  v.literal('newest'),
  v.literal('most-run'),
  v.literal('curated'),
)

const receiptStateValidator = v.union(
  v.literal('valid'),
  v.literal('disputed'),
  v.literal('invalid'),
  v.literal('superseded'),
)

const verificationValidator = v.union(
  v.literal('self_reported'),
  v.literal('artifact_linked'),
  v.literal('runner_signed'),
  v.literal('maintainer_official'),
  v.literal('independently_reproduced'),
)

const verificationCopy: Record<
  VerificationStatus,
  { label: string; explanation: string }
> = {
  self_reported: {
    label: 'Self-reported',
    explanation:
      'The submitter entered this result. BenchBazaar has not independently verified the run.',
  },
  artifact_linked: {
    label: 'Artifact linked',
    explanation:
      'A public run artifact is linked. Its presence does not certify the result as correct.',
  },
  runner_signed: {
    label: 'Runner signed',
    explanation:
      'A registered runner signed this exact receipt payload. The signature proves source and integrity, not scientific infallibility.',
  },
  maintainer_official: {
    label: 'Maintainer official',
    explanation:
      'The benchmark maintainer recognizes this run for this exact version and track.',
  },
  independently_reproduced: {
    label: 'Independently reproduced',
    explanation:
      'A separate trusted runner produced a compatible result within the benchmark’s stated tolerance.',
  },
}

const receiptStateCopy: Record<
  ReceiptState,
  { label: string; explanation: string }
> = {
  valid: {
    label: 'Valid',
    explanation: 'This receipt is eligible for its exact version and track.',
  },
  disputed: {
    label: 'Disputed',
    explanation:
      'A public challenge is open. The receipt remains visible but is excluded from scoreboards.',
  },
  invalid: {
    label: 'Invalid',
    explanation:
      'This receipt failed a compatibility or moderation check and is excluded from scoreboards.',
  },
  superseded: {
    label: 'Superseded',
    explanation:
      'A successor receipt corrects this record. The original remains visible for history.',
  },
}

function getAisle(id: string) {
  return aisles.find((aisle) => aisle.id === id)
}

function getVerificationStatus(receipt: Doc<'receipts'>): VerificationStatus {
  if (receipt.independentlyReproduced) return 'independently_reproduced'
  if (receipt.maintainerOfficial) return 'maintainer_official'
  return receipt.verificationLevel
}

function getMetricUnit(unit: string | undefined): '%' | 'score' {
  return unit === '%' ? '%' : 'score'
}

function markdownList(markdown: string) {
  return markdown
    .split('\n')
    .map((line) => line.trim().replace(/^[-*]\s+/, ''))
    .filter(Boolean)
}

function normalizeCursor(cursor: string | undefined) {
  return cursor ?? null
}

function publicVersionStatus(status: Doc<'benchmarkVersions'>['status']) {
  return status === 'current' ||
    status === 'historical' ||
    status === 'deprecated'
    ? status
    : null
}

async function toBenchmarkSummary(
  ctx: QueryCtx,
  benchmark: Doc<'benchmarks'>,
): Promise<BenchmarkSummary> {
  const owner = await ctx.db.get('users', benchmark.ownerId)
  const aisle = getAisle(benchmark.aisle)

  if (!owner || !aisle || !benchmark.currentVersion) {
    throw new ConvexError({ code: 'INVALID_PUBLIC_BENCHMARK' })
  }

  return {
    id: benchmark.publicRef,
    slug: benchmark.slug,
    title: benchmark.title,
    summary: benchmark.summary,
    aisle,
    vendor: { handle: owner.handle, displayName: owner.displayName },
    version: benchmark.currentVersion,
    tags: benchmark.tags,
    modality: benchmark.modalities.includes('text + image')
      ? 'text + image'
      : 'text',
    scorer: benchmark.scorerLabel,
    publicSampleCount: benchmark.publicSampleCount,
    sealedItemCount: benchmark.sealedItemCount,
    receiptCount: benchmark.receiptCount,
    distinctModelCount: benchmark.distinctModelCount,
    publishedAt: new Date(
      benchmark.publishedAt ?? benchmark.createdAt,
    ).toISOString(),
    curatorPick: benchmark.curatorPick,
    runnerAvailable: benchmark.runnerAvailable,
  }
}

function toTrack(
  track: Doc<'benchmarkVersions'>['tracks'][number],
  receipts: Array<Doc<'receipts'>>,
): Track {
  const metric = receipts
    .flatMap((receipt) => receipt.metrics)
    .find((candidate) => candidate.key === track.primaryMetricKey)

  return {
    id: track.id,
    label: track.label,
    description: track.description,
    primaryMetric: {
      key: track.primaryMetricKey,
      label: metric?.label ?? track.primaryMetricKey,
      direction: track.metricDirection === 'maximize' ? 'higher' : 'lower',
      unit: getMetricUnit(metric?.unit),
    },
  }
}

async function toReceipt(
  ctx: QueryCtx,
  receipt: Doc<'receipts'>,
): Promise<Receipt> {
  const [benchmark, version, model] = await Promise.all([
    ctx.db.get('benchmarks', receipt.benchmarkId),
    ctx.db.get('benchmarkVersions', receipt.benchmarkVersionId),
    ctx.db.get('models', receipt.modelId),
  ])

  if (!benchmark || !version || !model || version.status === 'suspended') {
    throw new ConvexError({ code: 'INVALID_PUBLIC_RECEIPT' })
  }

  const primaryMetric = receipt.metrics.find(
    (metric) => metric.key === receipt.primaryMetricKey,
  )
  const verificationStatus = getVerificationStatus(receipt)
  const compatibilityIssues = receipt.compatibilityStatus
    ? (receipt.compatibilityIssues ?? [])
    : getReceiptCompatibilityIssues({
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
  const reason = receipt.disputeSummary ?? receipt.moderationReason

  return {
    id: receipt.publicId,
    benchmark: {
      slug: benchmark.slug,
      title: version.title,
      version: version.version,
    },
    trackId: receipt.trackId,
    model: {
      slug: model.canonicalId,
      displayName: model.displayName,
      exactId: model.canonicalId,
      provider: model.provider,
    },
    submittedModelId: receipt.submittedModelId,
    primaryMetric: {
      label: primaryMetric?.label ?? receipt.primaryMetricKey,
      value: receipt.primaryMetricValue,
      unit: getMetricUnit(primaryMetric?.unit),
    },
    metrics: receipt.metrics.map((metric) => ({
      label: metric.label,
      value: `${metric.value}${metric.unit ?? ''}`,
    })),
    submittedAt: new Date(receipt.submittedAt).toISOString(),
    completedAt: new Date(receipt.completedAt).toISOString(),
    itemCount: receipt.itemCount,
    scorerVersion: receipt.scorerVersion,
    configurationSummary:
      receipt.configurationSummary ??
      'No public configuration summary was provided for this legacy receipt.',
    configurationDigest: receipt.configurationDigest,
    datasetDigest: receipt.datasetDigest ?? 'not disclosed',
    manifestDigest: receipt.manifestDigest,
    endpointExposure: receipt.endpointExposure,
    verification: {
      status: verificationStatus,
      ...verificationCopy[verificationStatus],
    },
    state: {
      status: receipt.status,
      ...receiptStateCopy[receipt.status],
      ...(reason ? { reason } : {}),
    },
    compatibility: {
      compatible: compatibilityIssues.length === 0,
      explanation:
        compatibilityIssues.length === 0
          ? 'The version, track, metric, scorer, manifest, and disclosed dataset digest agree.'
          : `Excluded: ${compatibilityIssues.join('; ')}.`,
    },
    ...(receipt.signatureFingerprint
      ? { signatureFingerprint: receipt.signatureFingerprint }
      : {}),
    artifacts: (receipt.artifactRefs ?? []).map((artifact) => ({
      label: artifact.label,
      url: artifact.url,
      ...(artifact.digest ? { digest: artifact.digest } : {}),
    })),
    ...(receipt.notesMarkdown ? { notes: receipt.notesMarkdown } : {}),
    ...(model.status === 'disputed_identity'
      ? {
          modelIdentityWarning:
            'This model identity is ambiguous or disputed and is excluded from exact comparisons.',
        }
      : receipt.submittedModelId !== model.canonicalId
        ? {
            modelIdentityWarning: `The submitted identifier “${receipt.submittedModelId}” resolves to canonical ID “${model.canonicalId}”.`,
          }
        : {}),
    synthetic: receipt.synthetic,
  }
}

async function toBenchmarkDetail(
  ctx: QueryCtx,
  benchmark: Doc<'benchmarks'>,
  version: Doc<'benchmarkVersions'>,
  versionHistory: Array<Doc<'benchmarkVersions'>>,
  receiptDocuments: Array<Doc<'receipts'>>,
): Promise<BenchmarkDetail> {
  const summary = await toBenchmarkSummary(ctx, benchmark)
  const samples = await ctx.db
    .query('publicSamples')
    .withIndex('by_benchmarkVersionId_position', (query) =>
      query.eq('benchmarkVersionId', version._id),
    )
    .order('asc')
    .take(MAX_SECTION_RESULTS)
  const status = publicVersionStatus(version.status)
  if (!status) throw new ConvexError({ code: 'INVALID_PUBLIC_VERSION' })

  return {
    ...summary,
    title: version.title,
    summary: version.summary,
    version: version.version,
    tags: version.tags,
    modality: version.modalities.includes('text + image')
      ? 'text + image'
      : 'text',
    sealedItemCount: version.sealedPolicy.itemCount ?? 0,
    publishedAt: new Date(version.publishedAt).toISOString(),
    currentVersion: benchmark.currentVersion ?? version.version,
    isCurrent: benchmark.currentVersionId === version._id,
    versionStatus: status,
    changelog: version.changelogMarkdown,
    comparability: version.comparability,
    purpose: version.capabilityStatement,
    method: version.methodMarkdown,
    limitations: markdownList(version.limitationsMarkdown),
    samples: samples.map((sample) => ({
      id: sample.publicSampleId,
      input: sample.inputMarkdown,
      expectedAnswer: sample.expectedMarkdown ?? 'Not disclosed',
      explanation: sample.explanationMarkdown ?? '',
      includedInOfficialScore: sample.includedInOfficialScore,
    })),
    tracks: version.tracks.map((track) =>
      toTrack(
        track,
        receiptDocuments.filter((receipt) => receipt.trackId === track.id),
      ),
    ),
    sealedSet: {
      mode: 'author_managed',
      statement:
        'The official scored questions are kept by the benchmark author and are not publicly downloadable.',
      endpointExposure: version.sealedPolicy.endpointExposureNote,
    },
    versions: versionHistory.flatMap((candidate) => {
      const candidateStatus = publicVersionStatus(candidate.status)
      return candidateStatus
        ? [
            {
              version: candidate.version,
              status: candidateStatus,
              publishedAt: new Date(candidate.publishedAt).toISOString(),
              changelog: candidate.changelogMarkdown,
              comparability: candidate.comparability,
            },
          ]
        : []
    }),
  }
}

function bestCompatibleReceipts(
  receipts: Array<Receipt>,
  direction: 'higher' | 'lower',
) {
  const bestByModel = new Map<string, Receipt>()
  for (const receipt of receipts) {
    if (receipt.state.status !== 'valid' || !receipt.compatibility.compatible) {
      continue
    }
    const current = bestByModel.get(receipt.model.exactId)
    const isBetter =
      !current ||
      (direction === 'higher'
        ? receipt.primaryMetric.value > current.primaryMetric.value
        : receipt.primaryMetric.value < current.primaryMetric.value)
    if (isBetter) bestByModel.set(receipt.model.exactId, receipt)
  }
  return [...bestByModel.values()].sort((left, right) =>
    direction === 'higher'
      ? right.primaryMetric.value - left.primaryMetric.value
      : left.primaryMetric.value - right.primaryMetric.value,
  )
}

async function benchmarkPageData(
  ctx: QueryCtx,
  slug: string,
  requestedVersion?: string,
): Promise<BenchmarkPageData | null> {
  const benchmark = await ctx.db
    .query('benchmarks')
    .withIndex('by_slug', (query) => query.eq('slug', slug))
    .unique()
  if (
    !benchmark ||
    benchmark.status !== 'published' ||
    !benchmark.currentVersionId
  ) {
    return null
  }

  const version = requestedVersion
    ? await ctx.db
        .query('benchmarkVersions')
        .withIndex('by_benchmarkId_version', (query) =>
          query
            .eq('benchmarkId', benchmark._id)
            .eq('version', requestedVersion),
        )
        .unique()
    : await ctx.db.get('benchmarkVersions', benchmark.currentVersionId)
  if (
    !version ||
    !publicVersionStatus(version.status) ||
    version.tracks.length === 0
  ) {
    return null
  }

  const [versionHistory, receiptsByTrack, relatedDocuments] = await Promise.all(
    [
      ctx.db
        .query('benchmarkVersions')
        .withIndex('by_benchmarkId_publishedAt', (query) =>
          query.eq('benchmarkId', benchmark._id),
        )
        .order('desc')
        .take(50),
      Promise.all(
        version.tracks.map((track) =>
          ctx.db
            .query('receipts')
            .withIndex('by_benchmarkVersionId_trackId', (query) =>
              query
                .eq('benchmarkVersionId', version._id)
                .eq('trackId', track.id),
            )
            .take(MAX_SECTION_RESULTS),
        ),
      ),
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_aisle_publishedAt', (query) =>
          query.eq('status', 'published').eq('aisle', benchmark.aisle),
        )
        .order('desc')
        .take(5),
    ],
  )
  const receiptDocuments = receiptsByTrack.flat()
  const publicReceipts = await Promise.all(
    receiptDocuments.map((receipt) => toReceipt(ctx, receipt)),
  )
  const benchmarkDetail = await toBenchmarkDetail(
    ctx,
    benchmark,
    version,
    versionHistory,
    receiptDocuments,
  )
  const scoreboards: Array<Scoreboard> = await Promise.all(
    benchmarkDetail.tracks.map(async (track) => {
      const receipts = publicReceipts.filter(
        (receipt) => receipt.trackId === track.id,
      )
      return {
        track,
        receipts: bestCompatibleReceipts(
          receipts,
          track.primaryMetric.direction,
        ),
      }
    }),
  )

  return {
    benchmark: benchmarkDetail,
    scoreboards,
    receipts: publicReceipts.sort(
      (left, right) =>
        Date.parse(right.submittedAt) - Date.parse(left.submittedAt),
    ),
    relatedBenchmarks: await Promise.all(
      relatedDocuments
        .filter((candidate) => candidate._id !== benchmark._id)
        .slice(0, 4)
        .map((candidate) => toBenchmarkSummary(ctx, candidate)),
    ),
  }
}

function matchesBrowseFilters(
  benchmark: Doc<'benchmarks'>,
  args: {
    modality?: string
    scorer?: string
    sealed?: boolean
    hasReceipts?: boolean
    curated?: boolean
  },
) {
  return (
    (!args.modality || benchmark.primaryModality === args.modality) &&
    (!args.scorer || benchmark.scorerCategory === args.scorer) &&
    (args.sealed === undefined || benchmark.sealed === args.sealed) &&
    (args.hasReceipts === undefined ||
      benchmark.hasReceipts === args.hasReceipts) &&
    (args.curated === undefined || benchmark.curatorPick === args.curated)
  )
}

export const home = defineQuery({
  args: {},
  handler: async (ctx): Promise<HomePageData> => {
    const [fresh, curated, popular, recentReceiptDocuments, counts] =
      await Promise.all([
        ctx.db
          .query('benchmarks')
          .withIndex('by_status_publishedAt', (query) =>
            query.eq('status', 'published'),
          )
          .order('desc')
          .take(4),
        ctx.db
          .query('benchmarks')
          .withIndex('by_status_curatorPick_publishedAt', (query) =>
            query.eq('status', 'published').eq('curatorPick', true),
          )
          .order('desc')
          .take(4),
        ctx.db
          .query('benchmarks')
          .withIndex('by_status_receiptCount', (query) =>
            query.eq('status', 'published'),
          )
          .order('desc')
          .take(4),
        ctx.db
          .query('receipts')
          .withIndex('by_status_submittedAt', (query) =>
            query.eq('status', 'valid'),
          )
          .order('desc')
          .take(4),
        Promise.all([
          ctx.db
            .query('benchmarks')
            .withIndex('by_status_publishedAt', (query) =>
              query.eq('status', 'published'),
            )
            .take(10_000),
          ctx.db.query('receipts').take(10_000),
          ctx.db.query('models').take(10_000),
        ]),
      ])

    return {
      featuredAisles: aisles,
      freshBenchmarks: await Promise.all(
        fresh.map((benchmark) => toBenchmarkSummary(ctx, benchmark)),
      ),
      curatorPicks: await Promise.all(
        curated.map((benchmark) => toBenchmarkSummary(ctx, benchmark)),
      ),
      bestSellers: await Promise.all(
        popular.map((benchmark) => toBenchmarkSummary(ctx, benchmark)),
      ),
      recentReceipts: await Promise.all(
        recentReceiptDocuments.map((receipt) => toReceipt(ctx, receipt)),
      ),
      marketStats: {
        benchmarks: counts[0].length,
        receipts: counts[1].length,
        models: counts[2].length,
      },
    }
  },
})

export const browse = defineQuery({
  args: {
    q: v.optional(v.string()),
    aisle: v.optional(aisleValidator),
    sort: v.optional(browseSortValidator),
    cursor: v.optional(v.string()),
    modality: v.optional(v.union(v.literal('text'), v.literal('text + image'))),
    scorer: v.optional(v.string()),
    sealed: v.optional(v.boolean()),
    hasReceipts: v.optional(v.boolean()),
    curated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = args.q?.trim()
    if (normalizedQuery && normalizedQuery.length > 120) {
      throw new ConvexError({ code: 'SEARCH_QUERY_TOO_LONG' })
    }

    const paginationOpts = {
      cursor: normalizeCursor(args.cursor),
      numItems: PAGE_SIZE,
    }
    let page
    if (normalizedQuery) {
      const search = ctx.db
        .query('benchmarks')
        .withSearchIndex('search_public', (query) => {
          let searchQuery = query
            .search('searchText', normalizedQuery)
            .eq('status', 'published')
          if (args.aisle) searchQuery = searchQuery.eq('aisle', args.aisle)
          if (args.modality) {
            searchQuery = searchQuery.eq('primaryModality', args.modality)
          }
          if (args.scorer) {
            searchQuery = searchQuery.eq('scorerCategory', args.scorer)
          }
          if (args.sealed !== undefined) {
            searchQuery = searchQuery.eq('sealed', args.sealed)
          }
          if (args.hasReceipts !== undefined) {
            searchQuery = searchQuery.eq('hasReceipts', args.hasReceipts)
          }
          if (args.curated !== undefined) {
            searchQuery = searchQuery.eq('curatorPick', args.curated)
          }
          return searchQuery
        })
      page = await search.paginate(paginationOpts)
    } else if (args.aisle && args.sort === 'most-run') {
      page = await ctx.db
        .query('benchmarks')
        .withIndex('by_status_aisle_receiptCount', (query) =>
          query.eq('status', 'published').eq('aisle', args.aisle as AisleId),
        )
        .order('desc')
        .paginate(paginationOpts)
    } else if (args.aisle && args.sort === 'curated') {
      page = await ctx.db
        .query('benchmarks')
        .withIndex('by_status_aisle_curatorPick_publishedAt', (query) =>
          query.eq('status', 'published').eq('aisle', args.aisle as AisleId),
        )
        .order('desc')
        .paginate(paginationOpts)
    } else if (args.aisle) {
      page = await ctx.db
        .query('benchmarks')
        .withIndex('by_status_aisle_publishedAt', (query) =>
          query.eq('status', 'published').eq('aisle', args.aisle as AisleId),
        )
        .order('desc')
        .paginate(paginationOpts)
    } else if (args.sort === 'most-run') {
      page = await ctx.db
        .query('benchmarks')
        .withIndex('by_status_receiptCount', (query) =>
          query.eq('status', 'published'),
        )
        .order('desc')
        .paginate(paginationOpts)
    } else if (args.sort === 'curated') {
      page = await ctx.db
        .query('benchmarks')
        .withIndex('by_status_curatorPick_publishedAt', (query) =>
          query.eq('status', 'published'),
        )
        .order('desc')
        .paginate(paginationOpts)
    } else {
      page = await ctx.db
        .query('benchmarks')
        .withIndex('by_status_publishedAt', (query) =>
          query.eq('status', 'published'),
        )
        .order('desc')
        .paginate(paginationOpts)
    }

    let documents = page.page.filter((benchmark) =>
      matchesBrowseFilters(benchmark, args),
    )
    if (normalizedQuery && args.sort === 'most-run') {
      documents = documents.sort(
        (left, right) => right.receiptCount - left.receiptCount,
      )
    } else if (normalizedQuery && args.sort === 'curated') {
      documents = documents.sort(
        (left, right) => Number(right.curatorPick) - Number(left.curatorPick),
      )
    }

    return {
      items: await Promise.all(
        documents.map((benchmark) => toBenchmarkSummary(ctx, benchmark)),
      ),
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    }
  },
})

export const aisle = defineQuery({
  args: { aisle: aisleValidator },
  handler: async (ctx, args): Promise<AislePageData> => {
    const aisleDefinition = getAisle(args.aisle)
    if (!aisleDefinition) throw new ConvexError({ code: 'UNKNOWN_AISLE' })
    const [curated, newest, reproduced] = await Promise.all([
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_aisle_curatorPick_publishedAt', (query) =>
          query
            .eq('status', 'published')
            .eq('aisle', args.aisle)
            .eq('curatorPick', true),
        )
        .order('desc')
        .first(),
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_aisle_publishedAt', (query) =>
          query.eq('status', 'published').eq('aisle', args.aisle),
        )
        .order('desc')
        .take(6),
      ctx.db
        .query('benchmarks')
        .withIndex('by_status_aisle_reproductionCount', (query) =>
          query.eq('status', 'published').eq('aisle', args.aisle),
        )
        .order('desc')
        .take(6),
    ])

    return {
      aisle: aisleDefinition,
      ...(curated
        ? { curatorPick: await toBenchmarkSummary(ctx, curated) }
        : {}),
      newest: await Promise.all(
        newest.map((benchmark) => toBenchmarkSummary(ctx, benchmark)),
      ),
      mostReproduced: await Promise.all(
        reproduced
          .filter((benchmark) => benchmark.independentReproductionCount > 0)
          .map((benchmark) => toBenchmarkSummary(ctx, benchmark)),
      ),
    }
  },
})

export const benchmarkBySlug = defineQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = args.slug.trim()
    if (!slug || slug.length > 120) {
      throw new ConvexError({ code: 'INVALID_SLUG' })
    }
    return benchmarkPageData(ctx, slug)
  },
})

export const benchmarkByVersion = defineQuery({
  args: { slug: v.string(), version: v.string() },
  handler: async (ctx, args) => {
    const slug = args.slug.trim()
    const version = args.version.trim()
    if (!slug || slug.length > 120 || !version || version.length > 40) {
      throw new ConvexError({ code: 'INVALID_VERSION_REFERENCE' })
    }
    return benchmarkPageData(ctx, slug, version)
  },
})

export const stallByHandle = defineQuery({
  args: { handle: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args): Promise<StallPageData | null> => {
    const handle = args.handle.trim().toLowerCase()
    if (!handle || handle.length > 60) return null
    const owner = await ctx.db
      .query('users')
      .withIndex('by_handle', (query) => query.eq('handle', handle))
      .unique()
    if (!owner || owner.status !== 'active') return null

    const [benchmarkPage, recentReceiptDocuments] = await Promise.all([
      ctx.db
        .query('benchmarks')
        .withIndex('by_ownerId_status_publishedAt', (query) =>
          query.eq('ownerId', owner._id).eq('status', 'published'),
        )
        .order('desc')
        .paginate(args.paginationOpts),
      ctx.db
        .query('receipts')
        .withIndex('by_submittedByUserId_submittedAt', (query) =>
          query.eq('submittedByUserId', owner._id),
        )
        .order('desc')
        .take(12),
    ])
    const receipts = await Promise.all(
      recentReceiptDocuments.map((receipt) => toReceipt(ctx, receipt)),
    )

    return {
      stall: {
        handle: owner.handle,
        displayName: owner.displayName,
        ...(owner.avatarUrl ? { avatarUrl: owner.avatarUrl } : {}),
        ...(owner.bio ? { bio: owner.bio } : {}),
        ...(owner.githubUsername
          ? { githubUsername: owner.githubUsername }
          : {}),
      },
      benchmarks: {
        items: await Promise.all(
          benchmarkPage.page.map((benchmark) =>
            toBenchmarkSummary(ctx, benchmark),
          ),
        ),
        continueCursor: benchmarkPage.continueCursor,
        isDone: benchmarkPage.isDone,
      },
      recentReceipts: receipts.slice(0, 6),
      reproductions: receipts
        .filter(
          (receipt) =>
            receipt.verification.status === 'independently_reproduced',
        )
        .slice(0, 6),
    }
  },
})

export const modelBySlug = defineQuery({
  args: {
    modelSlug: v.string(),
    paginationOpts: paginationOptsValidator,
    status: v.optional(receiptStateValidator),
    verification: v.optional(verificationValidator),
    trackId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ModelPageData | null> => {
    const modelSlug = args.modelSlug.trim()
    if (!modelSlug || modelSlug.length > 160) return null
    const model = await ctx.db
      .query('models')
      .withIndex('by_canonicalId', (query) =>
        query.eq('canonicalId', modelSlug),
      )
      .unique()
    if (!model) return null

    const receiptPage = await ctx.db
      .query('receipts')
      .withIndex('by_modelId_completedAt', (query) =>
        query.eq('modelId', model._id),
      )
      .order('desc')
      .paginate(args.paginationOpts)
    const mappedReceipts = await Promise.all(
      receiptPage.page.map((receipt) => toReceipt(ctx, receipt)),
    )
    const items = mappedReceipts.filter(
      (receipt) =>
        (!args.status || receipt.state.status === args.status) &&
        (!args.verification ||
          receipt.verification.status === args.verification) &&
        (!args.trackId || receipt.trackId === args.trackId),
    )

    return {
      model: {
        slug: model.canonicalId,
        provider: model.provider,
        canonicalId: model.canonicalId,
        displayName: model.displayName,
        ...(model.family ? { family: model.family } : {}),
        ...(model.releaseDate
          ? { releaseDate: new Date(model.releaseDate).toISOString() }
          : {}),
        aliases: model.aliases,
        status: model.status,
        ...(model.metadataUrl ? { metadataUrl: model.metadataUrl } : {}),
      },
      receipts: {
        items,
        continueCursor: receiptPage.continueCursor,
        isDone: receiptPage.isDone,
      },
    }
  },
})

export const receiptByPublicId = defineQuery({
  args: { receiptId: v.string() },
  handler: async (ctx, args) => {
    const receiptId = args.receiptId.trim()
    if (!receiptId || receiptId.length > 80) {
      throw new ConvexError({ code: 'INVALID_RECEIPT_ID' })
    }

    const receipt = await ctx.db
      .query('receipts')
      .withIndex('by_publicId', (query) => query.eq('publicId', receiptId))
      .unique()
    if (!receipt) return null
    const [publicReceipt, superseded, successor] = await Promise.all([
      toReceipt(ctx, receipt),
      receipt.supersedesReceiptId
        ? ctx.db.get('receipts', receipt.supersedesReceiptId)
        : null,
      ctx.db
        .query('receipts')
        .withIndex('by_supersedesReceiptId', (query) =>
          query.eq('supersedesReceiptId', receipt._id),
        )
        .unique(),
    ])

    return {
      ...publicReceipt,
      ...(superseded ? { supersedes: superseded.publicId } : {}),
      ...(successor ? { supersededBy: successor.publicId } : {}),
    }
  },
})

export const mystery = defineQuery({
  args: { seed: v.number() },
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.seed)) {
      throw new ConvexError({ code: 'INVALID_RANDOM_SEED' })
    }

    const documents = await ctx.db
      .query('benchmarks')
      .withIndex('by_status_publishedAt', (query) =>
        query.eq('status', 'published'),
      )
      .take(MAX_SECTION_RESULTS)
    const eligible = documents.filter(
      (benchmark) => benchmark.currentVersionId && benchmark.hasReceipts,
    )
    if (eligible.length === 0) return null

    const index = Math.abs(Math.floor(args.seed)) % eligible.length
    return toBenchmarkSummary(ctx, eligible[index])
  },
})
