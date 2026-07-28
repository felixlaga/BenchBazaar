// @vitest-environment edge-runtime

import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'
import { validatePublicImageMetadata } from './uploads'

async function setupOwner(t: ReturnType<typeof convexTest>) {
  const owner = t.withIdentity({
    subject: 'operations_owner',
    name: 'Operations Owner',
    preferredUsername: 'operations-owner',
  })
  await owner.mutation(api.users.syncCurrent, {})
  await owner.mutation(api.users.updateProfile, {
    handle: 'operations-owner',
    displayName: 'Operations Owner',
    bio: 'Operations boundary test account.',
    githubUsername: 'operations-owner',
    avatarUrl: '',
  })
  return owner
}

describe('public image upload boundary', () => {
  it('accepts only the bounded public image metadata contract', () => {
    expect(
      validatePublicImageMetadata({
        size: 5 * 1_024 * 1_024,
        contentType: 'image/png',
      }),
    ).toBeNull()
    expect(
      validatePublicImageMetadata({
        size: 5 * 1_024 * 1_024 + 1,
        contentType: 'image/png',
      }),
    ).toBe('UPLOAD_TOO_LARGE')
    expect(
      validatePublicImageMetadata({
        size: 100,
        contentType: 'image/svg+xml',
      }),
    ).toBe('UPLOAD_TYPE_NOT_ALLOWED')
    expect(validatePublicImageMetadata({ size: 100 })).toBe(
      'UPLOAD_TYPE_NOT_ALLOWED',
    )
  })
})

describe('save counter reconciliation', () => {
  it('repairs drift from the append-only save rows', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const member = await setupOwner(t)
    await member.mutation(api.basket.toggle, { slug: 'calendar-gymnastics' })
    const benchmark = await t.run(async (ctx) =>
      ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique(),
    )
    if (!benchmark) throw new Error('Missing seeded benchmark')
    await t.run(async (ctx) => {
      await ctx.db.patch(benchmark._id, { saveCount: 99 })
    })

    await expect(
      t.mutation(internal.basket.reconcileCounters, { confirm: true }),
    ).resolves.toMatchObject({ updated: 1 })
    expect(
      await t.run(async (ctx) => ctx.db.get('benchmarks', benchmark._id)),
    ).toMatchObject({ saveCount: 1 })
  })
})
