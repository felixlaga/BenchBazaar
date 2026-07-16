// @vitest-environment edge-runtime

import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

describe('Convex foundation', () => {
  it('loads the synthetic catalog idempotently through an internal mutation', async () => {
    const t = convexTest(schema, modules)

    const first = await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const second = await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const home = await t.query(api.catalog.home, {})

    expect(first.created).toEqual({
      benchmarks: 12,
      versions: 14,
      samples: 42,
      models: 5,
      receipts: 20,
    })
    expect(second.created).toEqual({
      benchmarks: 0,
      versions: 0,
      samples: 0,
      models: 0,
      receipts: 0,
    })
    expect(home.marketStats).toEqual({
      benchmarks: 12,
      receipts: 20,
      models: 5,
    })
  })

  it('returns purpose-built public views with no sealed or secret fields', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })

    const result = await t.query(api.catalog.benchmarkBySlug, {
      slug: 'calendar-gymnastics',
    })
    const payload = JSON.stringify(result)

    expect(result?.benchmark.samples).toHaveLength(3)
    expect(
      result?.benchmark.samples.map((sample) => sample.includedInOfficialScore),
    ).toEqual([false, false, false])

    for (const prohibitedName of [
      'externalId',
      'email',
      'hiddenItems',
      'hiddenPrompt',
      'sealedContent',
      'privateKey',
      'providerApiKey',
      'cookiePassword',
    ]) {
      expect(payload).not.toContain(`"${prohibitedName}"`)
    }
  })

  it('requires a validated identity and synchronizes by token subject only', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.users.viewer, {})).rejects.toThrow()

    const asMember = t.withIdentity({
      subject: 'user_01_stable_subject',
      name: 'Market Tester',
      email: 'private@example.com',
      preferredUsername: 'market-tester',
    })
    const first = await asMember.mutation(api.users.syncCurrent, {})
    const second = await asMember.mutation(api.users.syncCurrent, {})
    const viewer = await asMember.query(api.users.viewer, {})

    expect(first.handle).toBe('member-1-stable-subject')
    expect(second.handle).toBe(first.handle)
    expect(viewer).toEqual(second)
    expect(JSON.stringify(viewer)).not.toContain('private@example.com')
    expect(JSON.stringify(viewer)).not.toContain('user_01_stable_subject')

    const users = await t.run(async (ctx) => ctx.db.query('users').take(10))
    expect(users).toHaveLength(1)
  })

  it('keeps hidden listings out of public catalog queries', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })

    await t.run(async (ctx) => {
      const benchmark = await ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique()
      if (!benchmark) throw new Error('Missing seed benchmark')
      await ctx.db.patch(benchmark._id, { status: 'hidden' })
    })

    const detail = await t.query(api.catalog.benchmarkBySlug, {
      slug: 'calendar-gymnastics',
    })
    const browse = await t.query(api.catalog.browse, {})

    expect(detail).toBeNull()
    expect(browse.items).toHaveLength(6)
    expect(
      browse.items.some((item) => item.slug === 'calendar-gymnastics'),
    ).toBe(false)
  })

  it('keeps scoreboards scoped to one exact version and compatible track', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })

    const current = await t.query(api.catalog.benchmarkBySlug, {
      slug: 'tool-call-or-not',
    })
    const historical = await t.query(api.catalog.benchmarkByVersion, {
      slug: 'calendar-gymnastics',
      version: '0.9.0',
    })

    expect(current?.benchmark.tracks.map((track) => track.id)).toEqual([
      'standard',
      'assisted',
    ])
    expect(current?.scoreboards).toHaveLength(2)
    for (const scoreboard of current?.scoreboards ?? []) {
      expect(
        scoreboard.receipts.every(
          (receipt) =>
            receipt.trackId === scoreboard.track.id &&
            receipt.state.status === 'valid' &&
            receipt.compatibility.compatible,
        ),
      ).toBe(true)
      expect(
        new Set(scoreboard.receipts.map((receipt) => receipt.model.exactId))
          .size,
      ).toBe(scoreboard.receipts.length)
    }

    expect(historical?.benchmark.version).toBe('0.9.0')
    expect(historical?.benchmark.isCurrent).toBe(false)
    expect(historical?.benchmark.versions).toHaveLength(2)
    expect(
      historical?.benchmark.samples.map(
        (sample) => sample.includedInOfficialScore,
      ),
    ).toEqual([false, false, false])
  })

  it('keeps disputed, invalid, superseded, and successor receipts public but unranked', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })

    const [disputed, invalid, superseded, successor] = await Promise.all([
      t.query(api.catalog.receiptByPublicId, { receiptId: 'BBR-2026-0006' }),
      t.query(api.catalog.receiptByPublicId, { receiptId: 'BBR-2026-0011' }),
      t.query(api.catalog.receiptByPublicId, { receiptId: 'BBR-2026-0005' }),
      t.query(api.catalog.receiptByPublicId, { receiptId: 'BBR-2026-0017' }),
    ])

    expect(disputed?.state.status).toBe('disputed')
    expect(disputed?.state.reason).toBeTruthy()
    expect(invalid?.state.status).toBe('invalid')
    expect(superseded?.state.status).toBe('superseded')
    expect(superseded?.supersededBy).toBe('BBR-2026-0017')
    expect(successor?.supersedes).toBe('BBR-2026-0005')
  })

  it('paginates public discovery and excludes private stall identity fields', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })

    const first = await t.query(api.catalog.browse, {})
    const second = await t.query(api.catalog.browse, {
      cursor: first.continueCursor,
    })
    const aisle = await t.query(api.catalog.aisle, {
      aisle: 'reasoning-row',
    })
    const stall = await t.query(api.catalog.stallByHandle, {
      handle: 'bazaar-lab',
      paginationOpts: { cursor: null, numItems: 6 },
    })
    const model = await t.query(api.catalog.modelBySlug, {
      modelSlug: 'orion-large-2026-06-18',
      paginationOpts: { cursor: null, numItems: 8 },
    })

    expect(first.items).toHaveLength(6)
    expect(first.isDone).toBe(false)
    expect(second.items).toHaveLength(6)
    expect(aisle.aisle.label).toBe('Reasoning Row')
    expect(stall?.benchmarks.items).toHaveLength(6)
    expect(model?.model.canonicalId).toBe('orion-large-2026-06-18')
    expect(JSON.stringify(stall)).not.toContain('externalId')
    expect(JSON.stringify(stall)).not.toContain('email')
  })
})
