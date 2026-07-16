import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const track = v.object({
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

const metric = v.object({
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

const sealedPolicy = v.object({
  mode: v.union(
    v.literal('none'),
    v.literal('manual_signed'),
    v.literal('author_runner'),
    v.literal('remote_runner'),
  ),
  itemCount: v.optional(v.number()),
  datasetDigest: v.optional(v.string()),
  generatorDigest: v.optional(v.string()),
  rotationPolicy: v.optional(v.string()),
  endpointExposureNote: v.string(),
})

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    handle: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(
      v.literal('member'),
      v.literal('curator'),
      v.literal('moderator'),
      v.literal('admin'),
    ),
    status: v.union(
      v.literal('active'),
      v.literal('suspended'),
      v.literal('deleted'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index('by_externalId', ['externalId'])
    .index('by_handle', ['handle'])
    .index('by_status', ['status']),

  benchmarks: defineTable({
    ownerId: v.id('users'),
    slug: v.string(),
    publicRef: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('hidden'),
      v.literal('suspended'),
      v.literal('archived'),
    ),
    currentVersionId: v.optional(v.id('benchmarkVersions')),
    currentVersion: v.optional(v.string()),
    title: v.string(),
    summary: v.string(),
    aisle: v.string(),
    tags: v.array(v.string()),
    modalities: v.array(v.string()),
    primaryModality: v.optional(v.string()),
    scorerCategory: v.optional(v.string()),
    sealed: v.optional(v.boolean()),
    hasReceipts: v.optional(v.boolean()),
    searchText: v.string(),
    coverImageStorageId: v.optional(v.id('_storage')),
    scorerLabel: v.string(),
    publicSampleCount: v.number(),
    sealedItemCount: v.number(),
    receiptCount: v.number(),
    distinctModelCount: v.number(),
    independentReproductionCount: v.number(),
    saveCount: v.number(),
    curatorPick: v.boolean(),
    runnerAvailable: v.boolean(),
    synthetic: v.boolean(),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_ownerId_status_publishedAt', [
      'ownerId',
      'status',
      'publishedAt',
    ])
    .index('by_ownerId_slug', ['ownerId', 'slug'])
    .index('by_publicRef', ['publicRef'])
    .index('by_slug', ['slug'])
    .index('by_status_publishedAt', ['status', 'publishedAt'])
    .index('by_status_aisle_publishedAt', ['status', 'aisle', 'publishedAt'])
    .index('by_aisle_publishedAt', ['aisle', 'publishedAt'])
    .index('by_status_receiptCount', ['status', 'receiptCount'])
    .index('by_status_aisle_receiptCount', ['status', 'aisle', 'receiptCount'])
    .index('by_status_aisle_reproductionCount', [
      'status',
      'aisle',
      'independentReproductionCount',
    ])
    .index('by_status_curatorPick_publishedAt', [
      'status',
      'curatorPick',
      'publishedAt',
    ])
    .index('by_status_aisle_curatorPick_publishedAt', [
      'status',
      'aisle',
      'curatorPick',
      'publishedAt',
    ])
    .searchIndex('search_public', {
      searchField: 'searchText',
      filterFields: [
        'status',
        'aisle',
        'primaryModality',
        'scorerCategory',
        'sealed',
        'hasReceipts',
        'curatorPick',
      ],
    }),

  benchmarkVersions: defineTable({
    benchmarkId: v.id('benchmarks'),
    ownerId: v.id('users'),
    version: v.string(),
    publicRef: v.string(),
    status: v.union(
      v.literal('current'),
      v.literal('historical'),
      v.literal('deprecated'),
      v.literal('suspended'),
    ),
    supersedesVersionId: v.optional(v.id('benchmarkVersions')),
    title: v.string(),
    summary: v.string(),
    aisle: v.string(),
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
    tracks: v.array(track),
    sealedPolicy,
    manifestProtocolVersion: v.string(),
    manifestDigest: v.string(),
    changelogMarkdown: v.string(),
    comparability: v.union(
      v.literal('compatible'),
      v.literal('partially_compatible'),
      v.literal('incompatible'),
    ),
    publishedAt: v.number(),
  })
    .index('by_benchmarkId_publishedAt', ['benchmarkId', 'publishedAt'])
    .index('by_benchmarkId_version', ['benchmarkId', 'version'])
    .index('by_publicRef', ['publicRef'])
    .index('by_status_publishedAt', ['status', 'publishedAt']),

  publicSamples: defineTable({
    benchmarkVersionId: v.id('benchmarkVersions'),
    benchmarkId: v.id('benchmarks'),
    publicSampleId: v.string(),
    position: v.number(),
    inputMarkdown: v.string(),
    expectedMarkdown: v.optional(v.string()),
    explanationMarkdown: v.optional(v.string()),
    includedInOfficialScore: v.literal(false),
    publishedAt: v.number(),
  }).index('by_benchmarkVersionId_position', [
    'benchmarkVersionId',
    'position',
  ]),

  models: defineTable({
    provider: v.string(),
    canonicalId: v.string(),
    displayName: v.string(),
    family: v.optional(v.string()),
    releaseDate: v.optional(v.number()),
    aliases: v.array(v.string()),
    status: v.union(
      v.literal('active'),
      v.literal('legacy'),
      v.literal('disputed_identity'),
    ),
    metadataUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_canonicalId', ['canonicalId'])
    .index('by_provider_displayName', ['provider', 'displayName']),

  receipts: defineTable({
    publicId: v.string(),
    protocolVersion: v.string(),
    benchmarkId: v.id('benchmarks'),
    benchmarkVersionId: v.id('benchmarkVersions'),
    trackId: v.string(),
    modelId: v.id('models'),
    submittedModelId: v.string(),
    submittedByUserId: v.optional(v.id('users')),
    source: v.union(
      v.literal('manual'),
      v.literal('artifact'),
      v.literal('runner'),
    ),
    verificationLevel: v.union(
      v.literal('self_reported'),
      v.literal('artifact_linked'),
      v.literal('runner_signed'),
    ),
    maintainerOfficial: v.boolean(),
    independentlyReproduced: v.boolean(),
    status: v.union(
      v.literal('valid'),
      v.literal('disputed'),
      v.literal('invalid'),
      v.literal('superseded'),
    ),
    primaryMetricKey: v.string(),
    primaryMetricValue: v.number(),
    metrics: v.array(metric),
    itemCount: v.number(),
    scorerVersion: v.string(),
    configurationDigest: v.string(),
    datasetDigest: v.optional(v.string()),
    generatorDigest: v.optional(v.string()),
    manifestDigest: v.string(),
    endpointExposure: v.union(
      v.literal('trusted_local_model'),
      v.literal('operator_provider_account'),
      v.literal('site_provider_account'),
      v.literal('requester_endpoint'),
      v.literal('unknown_or_legacy'),
    ),
    completedAt: v.number(),
    submittedAt: v.number(),
    artifactRefs: v.optional(
      v.array(
        v.object({
          label: v.string(),
          url: v.string(),
          digest: v.optional(v.string()),
        }),
      ),
    ),
    notesMarkdown: v.optional(v.string()),
    supersedesReceiptId: v.optional(v.id('receipts')),
    disputeSummary: v.optional(v.string()),
    moderationReason: v.optional(v.string()),
    signatureFingerprint: v.optional(v.string()),
    signatureValid: v.boolean(),
    synthetic: v.boolean(),
  })
    .index('by_publicId', ['publicId'])
    .index('by_benchmarkVersionId_trackId', ['benchmarkVersionId', 'trackId'])
    .index('by_benchmarkVersionId_trackId_modelId', [
      'benchmarkVersionId',
      'trackId',
      'modelId',
    ])
    .index('by_modelId_completedAt', ['modelId', 'completedAt'])
    .index('by_supersedesReceiptId', ['supersedesReceiptId'])
    .index('by_status_submittedAt', ['status', 'submittedAt'])
    .index('by_submittedByUserId_submittedAt', [
      'submittedByUserId',
      'submittedAt',
    ]),
})
