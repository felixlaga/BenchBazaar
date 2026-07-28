// @vitest-environment edge-runtime

import { convexTest } from 'convex-test'
import type { TestConvex } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

type LaunchTestContext = TestConvex<typeof schema>

async function setupUser(
  t: LaunchTestContext,
  subject: string,
  handle: string,
) {
  const identity = t.withIdentity({
    subject,
    name: handle,
    preferredUsername: handle,
  })
  await identity.mutation(api.users.syncCurrent, {})
  await identity.mutation(api.users.updateProfile, {
    handle,
    displayName: handle,
    bio: 'Launch gate test account.',
    githubUsername: handle,
    avatarUrl: '',
  })
  const user = await t.run(async (ctx) =>
    ctx.db
      .query('users')
      .withIndex('by_externalId', (query) => query.eq('externalId', subject))
      .unique(),
  )
  if (!user) throw new Error('Missing test user')
  return { identity, user }
}

describe('launch content gate', () => {
  it('rejects synthetic preview data and restricts consent attestation', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const { identity: member } = await setupUser(
      t,
      'launch_member',
      'launch-member',
    )
    const { identity: admin, user: adminUser } = await setupUser(
      t,
      'launch_admin',
      'launch-admin',
    )
    await t.run(async (ctx) => {
      await ctx.db.patch(adminUser._id, { role: 'admin' })
    })
    const benchmark = await t.run(async (ctx) =>
      ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique(),
    )
    if (!benchmark) throw new Error('Missing seeded benchmark')
    const consent = await t.query(api.launch.consentText, {})

    await expect(member.query(api.launch.workspace, {})).rejects.toThrow()
    await expect(
      member.mutation(api.launch.recordConsent, {
        benchmarkId: benchmark._id,
        source: 'owner_submission',
        statement: consent.statement,
      }),
    ).rejects.toThrow()
    await expect(
      admin.mutation(api.launch.recordConsent, {
        benchmarkId: benchmark._id,
        source: 'written_release',
        statement: consent.statement,
      }),
    ).rejects.toThrow('SYNTHETIC_CONTENT_NOT_CONSENTABLE')

    await t.run(async (ctx) => {
      await ctx.db.patch(benchmark._id, { synthetic: false })
    })
    await expect(admin.query(api.launch.workspace, {})).resolves.toMatchObject({
      statement: consent.statement,
      benchmarks: [
        {
          id: benchmark._id,
          slug: benchmark.slug,
          consent: null,
        },
      ],
    })
    await expect(
      admin.mutation(api.launch.recordConsent, {
        benchmarkId: benchmark._id,
        source: 'written_release',
        statement: consent.statement,
        evidenceUrl: 'https://example.com/consent/record',
      }),
    ).resolves.toHaveProperty('consentId')

    await expect(
      t.query(internal.launch.readiness, {
        confirmProductionReview: true,
      }),
    ).resolves.toMatchObject({
      ready: false,
      syntheticBenchmarkCount: 11,
      syntheticReceiptCount: 20,
      missingConsentCount: 11,
      issues: expect.arrayContaining([
        'SYNTHETIC_BENCHMARKS_PRESENT',
        'SYNTHETIC_RECEIPTS_PRESENT',
        'CONSENT_RECORDS_MISSING',
      ]),
    })
  })
})
