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
  purpose: string
  method: string
  limitations: Array<string>
  samples: Array<PublicSample>
  tracks: Array<Track>
  sealedSet: {
    mode: 'author_managed'
    statement: string
    endpointExposure: string
  }
}

export const verificationStatuses = [
  'self_reported',
  'artifact_linked',
  'runner_signed',
  'maintainer_official',
  'independently_reproduced',
] as const

export type VerificationStatus = (typeof verificationStatuses)[number]

export type Receipt = {
  id: string
  benchmark: Pick<BenchmarkSummary, 'slug' | 'title' | 'version'>
  trackId: string
  model: {
    slug: string
    displayName: string
    exactId: string
  }
  primaryMetric: {
    label: string
    value: number
    unit: '%' | 'score'
  }
  metrics: Array<{ label: string; value: string }>
  submittedAt: string
  itemCount: number
  scorerVersion: string
  configurationDigest: string
  datasetDigest: string
  verification: {
    status: VerificationStatus
    label: string
    explanation: string
  }
  synthetic: true
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
