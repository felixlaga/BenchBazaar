import { benchmarks, receipts } from '../data/catalog.fixtures'
import { aisles } from '../domain/aisles'
import type {
  AisleId,
  BenchmarkDetail,
  BenchmarkSummary,
  HomePageData,
  Receipt,
} from '../domain/catalog'

export type BrowseSort = 'newest' | 'most-run' | 'curated'

export type BrowseCatalogInput = {
  q?: string | undefined
  aisle?: AisleId | undefined
  sort?: BrowseSort | undefined
}

export type BrowseCatalogResult = {
  items: Array<BenchmarkSummary>
  total: number
}

const newestFirst = <T extends { publishedAt: string }>(left: T, right: T) =>
  right.publishedAt.localeCompare(left.publishedAt)

function toSummary(benchmark: BenchmarkDetail): BenchmarkSummary {
  const {
    purpose: _purpose,
    method: _method,
    limitations: _limitations,
    samples: _samples,
    tracks: _tracks,
    sealedSet: _sealedSet,
    ...summary
  } = benchmark

  return summary
}

export function getHomePageData(): HomePageData {
  const uniqueModels = new Set(receipts.map((receipt) => receipt.model.exactId))

  return {
    featuredAisles: aisles,
    freshBenchmarks: [...benchmarks]
      .sort(newestFirst)
      .slice(0, 4)
      .map(toSummary),
    curatorPicks: benchmarks
      .filter((benchmark) => benchmark.curatorPick)
      .slice(0, 4)
      .map(toSummary),
    bestSellers: [...benchmarks]
      .sort((left, right) => right.distinctModelCount - left.distinctModelCount)
      .slice(0, 4)
      .map(toSummary),
    recentReceipts: [...receipts]
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
      .slice(0, 4),
    marketStats: {
      benchmarks: benchmarks.length,
      receipts: receipts.length,
      models: uniqueModels.size,
    },
  }
}

export function browseCatalog({
  q = '',
  aisle,
  sort = 'newest',
}: BrowseCatalogInput): BrowseCatalogResult {
  const normalizedQuery = q.trim().toLocaleLowerCase()
  const matching = benchmarks.filter((benchmark) => {
    if (aisle && benchmark.aisle.id !== aisle) return false
    if (!normalizedQuery) return true

    const searchText = [
      benchmark.title,
      benchmark.summary,
      benchmark.aisle.label,
      benchmark.vendor.handle,
      ...benchmark.tags,
    ]
      .join(' ')
      .toLocaleLowerCase()

    return searchText.includes(normalizedQuery)
  })

  const sorted = [...matching].sort((left, right) => {
    if (sort === 'most-run')
      return right.distinctModelCount - left.distinctModelCount
    if (sort === 'curated')
      return Number(right.curatorPick) - Number(left.curatorPick)
    return newestFirst(left, right)
  })

  return { items: sorted.map(toSummary), total: sorted.length }
}

export function getBenchmark(slug: string): BenchmarkDetail | undefined {
  return benchmarks.find((benchmark) => benchmark.slug === slug)
}

export function getBenchmarkReceipts(slug: string): Array<Receipt> {
  return receipts
    .filter((receipt) => receipt.benchmark.slug === slug)
    .sort((left, right) => right.primaryMetric.value - left.primaryMetric.value)
}

export function getReceipt(receiptId: string): Receipt | undefined {
  return receipts.find((receipt) => receipt.id === receiptId)
}

export function getMysteryBenchmark(random = Math.random): BenchmarkSummary {
  const index = Math.floor(random() * benchmarks.length)
  return toSummary(benchmarks[Math.min(index, benchmarks.length - 1)])
}
