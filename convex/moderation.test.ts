// @vitest-environment edge-runtime

import { convexTest } from 'convex-test'
import type { TestConvex } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

type ModerationTestContext = TestConvex<typeof schema>

async function setupUser(
  t: ModerationTestContext,
  subject: string,
  handle: string,
) {
  const client = t.withIdentity({
    subject,
    name: handle,
    preferredUsername: handle,
  })
  await client.mutation(api.users.syncCurrent, {})
  await client.mutation(api.users.updateProfile, {
    handle,
    displayName: handle,
    bio: 'Moderation workflow test profile.',
    githubUsername: handle,
    avatarUrl: '',
  })
  const document = await t.run(async (ctx) =>
    ctx.db
      .query('users')
      .withIndex('by_handle', (query) => query.eq('handle', handle))
      .unique(),
  )
  if (!document) throw new Error('Missing test user')
  return { client, document }
}

describe('moderation and trust workflows', () => {
  it('rate-limits private reports and requires moderator authority for discovery actions', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const reporter = await setupUser(t, 'reporter-subject', 'reporter-user')
    const moderator = await setupUser(t, 'moderator-subject', 'moderator-user')
    await t.run(async (ctx) => {
      await ctx.db.patch(moderator.document._id, { role: 'moderator' })
    })

    const created = await reporter.client.mutation(api.moderation.report, {
      targetType: 'benchmark',
      targetId: 'calendar-gymnastics',
      category: 'misleading_claim',
      details:
        'The public methodology statement needs moderator review for a potentially misleading provenance claim.',
    })
    await expect(
      reporter.client.query(api.moderation.queue, {}),
    ).rejects.toThrow()
    const queue = await moderator.client.query(api.moderation.queue, {})
    expect(queue).toHaveLength(1)
    expect(queue[0]?.targetId).toBe('calendar-gymnastics')

    await moderator.client.mutation(api.moderation.setBenchmarkStatus, {
      slug: 'calendar-gymnastics',
      status: 'hidden',
      reason:
        'Temporarily hidden from discovery while the reported public claim is reviewed.',
    })
    const hidden = await t.run(async (ctx) =>
      ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique(),
    )
    expect(hidden?.status).toBe('hidden')
    await moderator.client.mutation(api.moderation.resolveReport, {
      reportId: created.reportId,
      status: 'resolved',
      resolution:
        'The benchmark was hidden from discovery pending an owner correction.',
    })
    expect(await moderator.client.query(api.moderation.queue, {})).toHaveLength(
      0,
    )
    expect(
      (await t.run(async (ctx) => ctx.db.query('auditEvents').collect())).map(
        (event) => event.action,
      ),
    ).toEqual(
      expect.arrayContaining([
        'report.created',
        'benchmark.hidden',
        'report.resolved',
      ]),
    )
  })

  it('requires separate operators for reproduction and publishes curator collections', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const owner = await setupUser(t, 'trust-owner', 'trust-owner')
    const reproducer = await setupUser(
      t,
      'trust-reproducer',
      'trust-reproducer',
    )
    await t.run(async (ctx) => {
      await ctx.db.patch(owner.document._id, { role: 'curator' })
      const benchmark = await ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique()
      if (!benchmark) throw new Error('Missing benchmark')
      await ctx.db.patch(benchmark._id, { ownerId: owner.document._id })
    })
    const candidate = await owner.client.mutation(
      api.receipts.submitManual,
      await receiptArguments(owner.client, 90),
    )
    const supporting = await reproducer.client.mutation(
      api.receipts.submitManual,
      await receiptArguments(reproducer.client, 90.25),
    )
    const review = await reproducer.client.mutation(
      api.moderation.proposeReproduction,
      {
        candidateReceiptPublicId: candidate.receiptId,
        supportingReceiptPublicId: supporting.receiptId,
        tolerance: 0.5,
      },
    )
    await owner.client.mutation(api.moderation.reviewReproduction, {
      reviewId: review.reviewId,
      status: 'accepted',
      reason:
        'A separate operator reproduced the exact version and track within the declared tolerance.',
    })
    const candidateDocument = await t.run(async (ctx) =>
      ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', candidate.receiptId),
        )
        .unique(),
    )
    expect(candidateDocument?.independentlyReproduced).toBe(true)

    const benchmark = await t.run(async (ctx) =>
      ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique(),
    )
    if (!benchmark) throw new Error('Missing benchmark')
    const savedCollection = await owner.client.mutation(
      api.moderation.saveCollection,
      {
        slug: 'careful-reproductions',
        title: 'Careful reproductions',
        description:
          'A transparent curator-maintained list of benchmarks with useful reproduction evidence.',
        status: 'published',
        entries: [{ benchmarkId: benchmark._id }],
      },
    )
    await owner.client.mutation(api.moderation.saveCollection, {
      collectionId: savedCollection.collectionId,
      slug: 'careful-reproductions-updated',
      title: 'Careful reproductions',
      description:
        'A renamed curator-maintained list with the same transparent ranking rule.',
      status: 'published',
      entries: [{ benchmarkId: benchmark._id }],
    })
    const collection = await t.query(api.moderation.publicCollection, {
      slug: 'careful-reproductions-updated',
    })
    expect(collection?.entries[0]?.slug).toBe('calendar-gymnastics')
    expect(collection?.rankingRule).toContain('pageviews are not used')
  })
})

async function receiptArguments(
  client: Awaited<ReturnType<typeof setupUser>>['client'],
  score: number,
) {
  const options = await client.query(api.receipts.submissionOptions, {})
  const version = options.benchmarks
    .find((benchmark) => benchmark.slug === 'calendar-gymnastics')
    ?.versions.find((candidate) => candidate.version === '1.0.0')
  const track = version?.tracks.find((candidate) => candidate.id === 'standard')
  if (!version || !track) throw new Error('Missing receipt options')
  return {
    benchmarkVersionId: version.id,
    trackId: track.id,
    exactModelId: 'testco/reproduced-model-2026-07-28',
    modelProvider: 'TestCo',
    modelDisplayName: 'Reproduced Model',
    metrics: [
      {
        key: track.primaryMetricKey,
        label: 'Score',
        value: score,
        unit: '%',
        direction: track.metricDirection,
      },
    ],
    itemCount: version.itemCount ?? 120,
    scorerVersion: track.scorerVersion,
    manifestDigest: version.manifestDigest,
    ...(version.datasetDigest ? { datasetDigest: version.datasetDigest } : {}),
    ...(version.generatorDigest
      ? { generatorDigest: version.generatorDigest }
      : {}),
    configurationSummary: 'Independent aggregate test configuration.',
    endpointExposure: 'operator_provider_account' as const,
    completedAt: Date.now() - 60_000,
    artifactRefs: [],
    confirmations: {
      aggregateOnly: true as const,
      noHiddenContent: true as const,
      publicEvidenceOnly: true as const,
    },
  }
}
