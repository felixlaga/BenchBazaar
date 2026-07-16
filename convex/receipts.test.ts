// @vitest-environment edge-runtime

import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

const confirmations = {
  aggregateOnly: true as const,
  noHiddenContent: true as const,
  publicEvidenceOnly: true as const,
}

async function setupMember(
  t: ReturnType<typeof convexTest>,
  subject: string,
  handle: string,
) {
  const member = t.withIdentity({
    subject,
    name: handle,
    preferredUsername: handle,
  })
  await member.mutation(api.users.syncCurrent, {})
  await member.mutation(api.users.updateProfile, {
    handle,
    displayName: handle,
    bio: 'Public receipt test profile.',
    githubUsername: handle,
    avatarUrl: '',
  })
  return member
}

async function receiptArgs(
  member: Awaited<ReturnType<typeof setupMember>>,
  overrides: Record<string, unknown> = {},
) {
  const options = await member.query(api.receipts.submissionOptions, {})
  const benchmark = options.benchmarks.find(
    (candidate) => candidate.slug === 'calendar-gymnastics',
  )
  const version = benchmark?.versions.find(
    (candidate) => candidate.version === '1.0.0',
  )
  const track = version?.tracks.find((candidate) => candidate.id === 'standard')
  if (!version || !track) throw new Error('Missing receipt test contract')
  return {
    benchmarkVersionId: version.id,
    trackId: track.id,
    exactModelId: 'TestCo/Exact-Model-2026-07-01',
    modelProvider: 'TestCo',
    modelDisplayName: 'Exact Model July 2026',
    metrics: [
      {
        key: track.primaryMetricKey,
        label: 'Score',
        value: 87.5,
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
    configurationSummary:
      'Temperature zero, one attempt per item, no tools, and the published prompt template.',
    endpointExposure: 'operator_provider_account' as const,
    completedAt: Date.now() - 60_000,
    artifactRefs: [],
    notesMarkdown: 'Aggregate result only.',
    confirmations,
    ...overrides,
  }
}

describe('manual receipt workflows', () => {
  it('assigns evidence and canonical model identity on the server', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const member = await setupMember(t, 'receipt_submitter', 'receipt-member')
    const args = await receiptArgs(member)

    await expect(
      member.mutation(api.receipts.submitManual, {
        ...args,
        verificationLevel: 'runner_signed',
        maintainerOfficial: true,
        signatureValid: true,
      } as never),
    ).rejects.toThrow()

    const result = await member.mutation(api.receipts.submitManual, args)
    expect(result).toMatchObject({
      compatible: true,
      compatibilityIssues: [],
      verificationLevel: 'self_reported',
    })
    const stored = await t.run(async (ctx) =>
      ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', result.receiptId),
        )
        .unique(),
    )
    const model = stored
      ? await t.run(async (ctx) => ctx.db.get('models', stored.modelId))
      : null
    expect(stored).toMatchObject({
      submittedModelId: 'TestCo/Exact-Model-2026-07-01',
      source: 'manual',
      verificationLevel: 'self_reported',
      maintainerOfficial: false,
      independentlyReproduced: false,
      signatureValid: false,
      status: 'valid',
      compatibilityStatus: 'compatible',
    })
    expect(stored?.configurationDigest).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(model?.canonicalId).toBe('testco/exact-model-2026-07-01')

    const publicReceipt = await t.query(api.catalog.receiptByPublicId, {
      receiptId: result.receiptId,
    })
    expect(publicReceipt?.verification.status).toBe('self_reported')
    expect(publicReceipt?.compatibility.compatible).toBe(true)
    expect(publicReceipt?.submittedModelId).toBe(
      'TestCo/Exact-Model-2026-07-01',
    )
    expect(JSON.stringify(publicReceipt)).not.toContain('externalId')

    const artifact = await member.mutation(api.receipts.submitManual, {
      ...(await receiptArgs(member, {
        exactModelId: 'testco/artifact-model-2026-07-02',
        modelDisplayName: 'Artifact Model July 2026',
      })),
      artifactRefs: [
        {
          label: 'Public run bundle',
          url: 'https://example.com/runs/public-bundle.json',
          digest: 'sha256:public-artifact',
        },
      ],
    })
    expect(artifact.verificationLevel).toBe('artifact_linked')
    expect(
      (
        await t.query(api.catalog.receiptByPublicId, {
          receiptId: artifact.receiptId,
        })
      )?.verification.status,
    ).toBe('artifact_linked')

    await expect(
      member.mutation(api.receipts.submitManual, {
        ...(await receiptArgs(member)),
        artifactRefs: [{ label: 'Unsafe', url: 'javascript:alert(1)' }],
      }),
    ).rejects.toThrow()
  })

  it('stores compatibility failures visibly but never ranks them', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const member = await setupMember(
      t,
      'incompatible_submitter',
      'compat-member',
    )
    const result = await member.mutation(
      api.receipts.submitManual,
      await receiptArgs(member, {
        exactModelId: 'testco/latest',
        modelDisplayName: 'Mutable Test Alias',
        itemCount: 1,
        scorerVersion: 'wrong-scorer',
        manifestDigest: 'sha256:wrong-manifest',
        datasetDigest: 'sha256:wrong-dataset',
      }),
    )
    expect(result.compatible).toBe(false)
    expect(result.compatibilityIssues).toEqual(
      expect.arrayContaining([
        'scorer version does not match the track',
        'manifest digest does not match the exact version',
        'item count does not match the disclosed sealed-set size',
        'dataset digest does not match the exact version',
        'model identity is ambiguous or disputed',
      ]),
    )

    const receipt = await t.query(api.catalog.receiptByPublicId, {
      receiptId: result.receiptId,
    })
    expect(receipt?.state.status).toBe('valid')
    expect(receipt?.compatibility.compatible).toBe(false)
    expect(receipt?.modelIdentityWarning).toBeTruthy()

    const benchmark = await t.query(api.catalog.benchmarkBySlug, {
      slug: 'calendar-gymnastics',
    })
    expect(
      benchmark?.scoreboards.some((scoreboard) =>
        scoreboard.receipts.some(
          (candidate) => candidate.id === result.receiptId,
        ),
      ),
    ).toBe(false)
    expect(
      benchmark?.receipts.some(
        (candidate) => candidate.id === result.receiptId,
      ),
    ).toBe(true)
  })

  it('supersedes append-only receipts and preserves both public records', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const member = await setupMember(t, 'correction_owner', 'correction-owner')
    const stranger = await setupMember(
      t,
      'correction_stranger',
      'correction-stranger',
    )
    const original = await member.mutation(
      api.receipts.submitManual,
      await receiptArgs(member),
    )

    await expect(
      stranger.mutation(
        api.receipts.submitManual,
        await receiptArgs(stranger, {
          supersedesReceiptId: original.receiptId,
        }),
      ),
    ).rejects.toThrow()

    const successor = await member.mutation(
      api.receipts.submitManual,
      await receiptArgs(member, {
        metrics: [
          {
            key: 'score',
            label: 'Score',
            value: 89,
            unit: '%',
            direction: 'maximize',
          },
        ],
        supersedesReceiptId: original.receiptId,
      }),
    )
    const [oldPublic, newPublic] = await Promise.all([
      t.query(api.catalog.receiptByPublicId, {
        receiptId: original.receiptId,
      }),
      t.query(api.catalog.receiptByPublicId, {
        receiptId: successor.receiptId,
      }),
    ])
    expect(oldPublic?.state.status).toBe('superseded')
    expect(oldPublic?.supersededBy).toBe(successor.receiptId)
    expect(newPublic?.supersedes).toBe(original.receiptId)
    expect(newPublic?.primaryMetric.value).toBe(89)
    expect(oldPublic?.primaryMetric.value).toBe(87.5)
  })

  it('authorizes official designation and disputes without changing signature facts', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const maintainer = await setupMember(
      t,
      'receipt_maintainer',
      'receipt-maintainer',
    )
    const submitter = await setupMember(
      t,
      'receipt_claimant',
      'receipt-claimant',
    )
    const stranger = await setupMember(t, 'receipt_reader', 'receipt-reader')
    const maintainerUser = await t.run(async (ctx) =>
      ctx.db
        .query('users')
        .withIndex('by_handle', (query) =>
          query.eq('handle', 'receipt-maintainer'),
        )
        .unique(),
    )
    const benchmarkId = await t.run(async (ctx) => {
      const benchmark = await ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique()
      if (!benchmark || !maintainerUser) throw new Error('Missing owner setup')
      await ctx.db.patch(benchmark._id, { ownerId: maintainerUser._id })
      return benchmark._id
    })
    const result = await submitter.mutation(
      api.receipts.submitManual,
      await receiptArgs(submitter),
    )

    await expect(
      stranger.mutation(api.receipts.markMaintainerOfficial, {
        receiptId: result.receiptId,
      }),
    ).rejects.toThrow()
    await maintainer.mutation(api.receipts.markMaintainerOfficial, {
      receiptId: result.receiptId,
    })
    let stored = await t.run(async (ctx) =>
      ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', result.receiptId),
        )
        .unique(),
    )
    expect(stored).toMatchObject({
      maintainerOfficial: true,
      verificationLevel: 'self_reported',
      signatureValid: false,
    })
    expect(
      (
        await t.query(api.catalog.receiptByPublicId, {
          receiptId: result.receiptId,
        })
      )?.verification.status,
    ).toBe('maintainer_official')

    await expect(
      stranger.mutation(api.receipts.dispute, {
        receiptId: result.receiptId,
        reason: 'A stranger should not be able to alter this receipt status.',
      }),
    ).rejects.toThrow()
    await submitter.mutation(api.receipts.dispute, {
      receiptId: result.receiptId,
      reason:
        'The submitter discovered a material configuration ambiguity requiring public review.',
    })
    stored = await t.run(async (ctx) =>
      ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', result.receiptId),
        )
        .unique(),
    )
    expect(stored?.status).toBe('disputed')
    expect(stored?.signatureValid).toBe(false)
    expect(
      await t.run(async (ctx) => ctx.db.query('receiptDisputes').collect()),
    ).toHaveLength(1)

    await t.run(async (ctx) => {
      await ctx.db.patch(benchmarkId, {
        receiptCount: 999,
        distinctModelCount: 999,
      })
    })
    expect(
      await t.mutation(internal.receipts.reconcileCounters, { confirm: true }),
    ).toMatchObject({ scanned: 12, updated: 1 })
    const repaired = await t.run(async (ctx) =>
      ctx.db.get('benchmarks', benchmarkId),
    )
    expect(repaired?.receiptCount).not.toBe(999)
    expect(repaired?.distinctModelCount).not.toBe(999)

    const actions = await maintainer.query(api.receipts.viewerActions, {
      receiptId: result.receiptId,
    })
    expect(actions?.canDispute).toBe(false)
    const audits = await t.run(async (ctx) =>
      ctx.db.query('auditEvents').collect(),
    )
    expect(audits.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        'receipt.submitted_manual',
        'receipt.designated_maintainer_official',
        'receipt.disputed',
      ]),
    )
  })
})
