import { describe, expect, it } from 'vitest'

import { benchmarks, receipts } from '../data/catalog.fixtures'
import {
  browseCatalog,
  getBenchmark,
  getBenchmarkReceipts,
  getHomePageData,
  getMysteryBenchmark,
} from './catalog.repository'

describe('public catalog repository', () => {
  it('provides a launch-sized synthetic catalog and receipt set', () => {
    expect(benchmarks).toHaveLength(12)
    expect(receipts).toHaveLength(20)
    expect(receipts.map((receipt) => receipt.synthetic)).toEqual(
      Array.from({ length: 20 }, () => true),
    )
  })

  it('keeps every public sample distinct and excluded from official scoring', () => {
    const ids = benchmarks.flatMap((benchmark) =>
      benchmark.samples.map((sample) => sample.id),
    )

    expect(new Set(ids).size).toBe(ids.length)
    expect(
      benchmarks.flatMap((benchmark) =>
        benchmark.samples.map((sample) => sample.includedInOfficialScore),
      ),
    ).toEqual(Array.from({ length: 36 }, () => false))
  })

  it('contains no sealed content or secret-shaped public fields', () => {
    const publicPayload = JSON.stringify({ benchmarks, receipts })
    const prohibitedFieldNames = [
      'hiddenItems',
      'hiddenPrompt',
      'sealedContent',
      'privateKey',
      'providerApiKey',
      'cookiePassword',
    ]

    for (const field of prohibitedFieldNames) {
      expect(publicPayload).not.toContain(`"${field}"`)
    }
    expect(publicPayload).not.toContain('SEALED_SENTINEL_DO_NOT_EXPOSE')
  })

  it('searches public fields and applies aisle filters', () => {
    const queryResult = browseCatalog({ q: 'calendar' })
    const aisleResult = browseCatalog({ aisle: 'oddities-tent' })

    expect(queryResult.items.map((item) => item.slug)).toEqual([
      'calendar-gymnastics',
    ])
    expect(
      aisleResult.items.every((item) => item.aisle.id === 'oddities-tent'),
    ).toBe(true)
  })

  it('groups receipt reads by exact benchmark version and track', () => {
    const benchmark = getBenchmark('calendar-gymnastics')
    const matchingReceipts = getBenchmarkReceipts('calendar-gymnastics')

    expect(benchmark?.version).toBe('1.0.0')
    expect(matchingReceipts.length).toBeGreaterThan(0)
    expect(
      matchingReceipts.every(
        (receipt) =>
          receipt.benchmark.version === benchmark?.version &&
          receipt.trackId === 'standard',
      ),
    ).toBe(true)
  })

  it('returns bounded homepage view models', () => {
    const homepage = getHomePageData()

    expect(homepage.freshBenchmarks).toHaveLength(4)
    expect(homepage.curatorPicks).toHaveLength(4)
    expect(homepage.bestSellers).toHaveLength(4)
    expect(homepage.recentReceipts).toHaveLength(4)
  })

  it('supports deterministic mystery-crate selection for testing', () => {
    expect(getMysteryBenchmark(() => 0).slug).toBe(benchmarks[0].slug)
    expect(getMysteryBenchmark(() => 0.999).slug).toBe(
      benchmarks[benchmarks.length - 1].slug,
    )
  })
})
