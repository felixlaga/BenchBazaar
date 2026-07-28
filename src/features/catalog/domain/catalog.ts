export const aisleIds = [
  'reasoning-row',
  'code-corner',
  'agent-alley',
  'vision-arcade',
  'language-lane',
  'robustness-booth',
  'oddities-tent',
] as const

export type AisleId = (typeof aisleIds)[number]

export type Aisle = {
  id: AisleId
  label: string
  description: string
  motif: string
}

export type Vendor = {
  handle: string
  displayName: string
}

export type MetricDirection = 'higher' | 'lower'

export type Track = {
  id: string
  label: string
  description: string
  primaryMetric: {
    key: string
    label: string
    direction: MetricDirection
    unit: '%' | 'score'
  }
}

export type PublicSample = {
  id: string
  input: string
  expectedAnswer: string
  explanation: string
  includedInOfficialScore: false
}

export type BenchmarkSummary = {
  id: string
  slug: string
  title: string
  summary: string
  coverImageUrl?: string
  aisle: Aisle
  vendor: Vendor
  version: string
  tags: Array<string>
  modality: 'text' | 'text + image'
  scorer: string
  publicSampleCount: number
  sealedItemCount: number
  receiptCount: number
  distinctModelCount: number
  publishedAt: string
  curatorPick: boolean
  runnerAvailable: boolean
}

export type BenchmarkDetail = BenchmarkSummary & {
  currentVersion: string
  isCurrent: boolean
  versionStatus: 'current' | 'historical' | 'deprecated'
  changelog: string
  comparability: 'compatible' | 'partially_compatible' | 'incompatible'
  purpose: string
  method: string
  limitations: Array<string>
  repositoryUrl?: string
  samples: Array<PublicSample>
  tracks: Array<Track>
  sealedSet: {
    mode: 'public' | 'author_managed'
    statement: string
    endpointExposure: string
  }
  versions: Array<BenchmarkVersionSummary>
}

export type BenchmarkVersionSummary = {
  version: string
  status: 'current' | 'historical' | 'deprecated'
  publishedAt: string
  changelog: string
  comparability: 'compatible' | 'partially_compatible' | 'incompatible'
}

export const verificationStatuses = [
  'self_reported',
  'artifact_linked',
  'runner_signed',
  'maintainer_official',
  'independently_reproduced',
] as const

export type VerificationStatus = (typeof verificationStatuses)[number]

export const receiptStates = [
  'valid',
  'disputed',
  'invalid',
  'superseded',
] as const

export type ReceiptState = (typeof receiptStates)[number]

export type Receipt = {
  id: string
  benchmark: Pick<BenchmarkSummary, 'slug' | 'title' | 'version'>
  trackId: string
  model: {
    slug: string
    displayName: string
    exactId: string
    provider: string
  }
  submittedModelId: string
  primaryMetric: {
    label: string
    value: number
    unit: '%' | 'score'
  }
  metrics: Array<{ label: string; value: string }>
  submittedAt: string
  completedAt: string
  itemCount: number
  scorerVersion: string
  configurationSummary: string
  configurationDigest: string
  datasetDigest: string
  verification: {
    status: VerificationStatus
    label: string
    explanation: string
  }
  state: {
    status: ReceiptState
    label: string
    explanation: string
    reason?: string
  }
  compatibility: {
    compatible: boolean
    explanation: string
  }
  manifestDigest: string
  endpointExposure:
    | 'trusted_local_model'
    | 'operator_provider_account'
    | 'site_provider_account'
    | 'requester_endpoint'
    | 'unknown_or_legacy'
  signatureFingerprint?: string
  artifacts: Array<{ label: string; url: string; digest?: string }>
  notes?: string
  modelIdentityWarning?: string
  supersedes?: string
  supersededBy?: string
  synthetic: boolean
}

export type Scoreboard = {
  track: Track
  receipts: Array<Receipt>
}

export type BenchmarkPageData = {
  benchmark: BenchmarkDetail
  scoreboards: Array<Scoreboard>
  receipts: Array<Receipt>
  relatedBenchmarks: Array<BenchmarkSummary>
}

export type AislePageData = {
  aisle: Aisle
  curatorPick?: BenchmarkSummary
  newest: Array<BenchmarkSummary>
  mostReproduced: Array<BenchmarkSummary>
}

export type PublicStall = {
  handle: string
  displayName: string
  avatarUrl?: string
  bio?: string
  githubUsername?: string
}

export type StallPageData = {
  stall: PublicStall
  benchmarks: {
    items: Array<BenchmarkSummary>
    continueCursor: string
    isDone: boolean
  }
  recentReceipts: Array<Receipt>
  reproductions: Array<Receipt>
}

export type ModelPageData = {
  model: {
    slug: string
    provider: string
    canonicalId: string
    displayName: string
    family?: string
    releaseDate?: string
    aliases: Array<string>
    status: 'active' | 'legacy' | 'disputed_identity'
    metadataUrl?: string
  }
  receipts: {
    items: Array<Receipt>
    continueCursor: string
    isDone: boolean
  }
}

export type HomePageData = {
  featuredAisles: Array<Aisle>
  freshBenchmarks: Array<BenchmarkSummary>
  curatorPicks: Array<BenchmarkSummary>
  bestSellers: Array<BenchmarkSummary>
  recentReceipts: Array<Receipt>
  marketStats: {
    benchmarks: number
    receipts: number
    models: number
  }
}
