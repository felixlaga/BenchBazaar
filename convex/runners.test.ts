// @vitest-environment edge-runtime

import { bytesToBase64Url } from '@benchbazaar/protocol'
import { convexTest } from 'convex-test'
import type { TestConvex } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

type RunnerTestContext = TestConvex<typeof schema>

async function setupOwner(t: RunnerTestContext) {
  const owner = t.withIdentity({
    subject: 'runner_owner',
    name: 'runner-owner',
    preferredUsername: 'runner-owner',
  })
  await owner.mutation(api.users.syncCurrent, {})
  await owner.mutation(api.users.updateProfile, {
    handle: 'runner-owner',
    displayName: 'Runner Owner',
    bio: 'Owns a test runner.',
    githubUsername: 'runner-owner',
    avatarUrl: '',
  })
  const ownerDocument = await t.run(async (ctx) =>
    ctx.db
      .query('users')
      .withIndex('by_handle', (query) => query.eq('handle', 'runner-owner'))
      .unique(),
  )
  if (!ownerDocument) throw new Error('Missing owner')
  return { owner, ownerDocument }
}

async function prepareBenchmark(
  t: RunnerTestContext,
  ownerId: Awaited<ReturnType<typeof setupOwner>>['ownerDocument']['_id'],
) {
  const hash = `sha256:${'a'.repeat(64)}`
  return t.run(async (ctx) => {
    const benchmark = await ctx.db
      .query('benchmarks')
      .withIndex('by_slug', (query) => query.eq('slug', 'calendar-gymnastics'))
      .unique()
    if (!benchmark) throw new Error('Missing benchmark')
    const version = await ctx.db
      .query('benchmarkVersions')
      .withIndex('by_benchmarkId_version', (query) =>
        query.eq('benchmarkId', benchmark._id).eq('version', '1.0.0'),
      )
      .unique()
    if (!version) throw new Error('Missing version')
    await ctx.db.patch(benchmark._id, { ownerId })
    await ctx.db.patch(version._id, {
      ownerId,
      manifestDigest: hash,
      sealedPolicy: {
        ...version.sealedPolicy,
        itemCount: 120,
        datasetDigest: hash,
      },
    })
    return { benchmark, version, hash }
  })
}

async function registerKey(
  owner: Awaited<ReturnType<typeof setupOwner>>['owner'],
) {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])
  const publicKeySpki = bytesToBase64Url(
    new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey)),
  )
  return owner.mutation(api.runners.register, {
    label: 'Local signed runner',
    publicKeySpki,
    scope: 'all_owner_benchmarks',
  })
}

describe('signed runner lifecycle and ingestion', () => {
  it('derives key fingerprints, enforces replay protection, and preserves signed facts', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const { owner, ownerDocument } = await setupOwner(t)
    const { benchmark, hash } = await prepareBenchmark(t, ownerDocument._id)
    const key = await registerKey(owner)
    expect(key.fingerprint).toMatch(/^ed25519:[0-9a-f]{64}$/)

    const payload = {
      protocolVersion: '1.0.0' as const,
      receiptId: 'BBR-TEST-SIGNED-0001',
      runnerId: key.publicId,
      nonce: 'nonce-1234567890abcdef',
      benchmarkPublicRef: benchmark.publicRef,
      benchmarkVersion: '1.0.0',
      trackId: 'standard',
      modelId: 'testco/signed-model-2026-07-28',
      metrics: [{ key: 'score', value: 91, unit: '%' }],
      primaryMetricKey: 'score',
      primaryMetricValue: 91,
      itemCount: 120,
      scorerVersion: '1.0.0',
      configurationDigest: hash,
      manifestDigest: hash,
      datasetDigest: hash,
      completedAt: new Date(Date.now() - 60_000).toISOString(),
      endpointExposure: 'trusted_local_model' as const,
    }
    const result = await t.mutation(internal.runners.ingestVerified, {
      requestId: 'request-runner-test-1',
      runnerPublicId: key.publicId,
      signature: 'test-signature-is-verified-by-the-http-action',
      receipt: payload,
    })
    expect(result.publicId).toBe(payload.receiptId)
    const stored = await t.run(async (ctx) =>
      ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) =>
          query.eq('publicId', payload.receiptId),
        )
        .unique(),
    )
    expect(stored).toMatchObject({
      source: 'runner',
      verificationLevel: 'runner_signed',
      signatureValid: true,
      signatureFingerprint: key.fingerprint,
      compatibilityStatus: 'compatible',
    })
    await expect(
      t.mutation(internal.runners.ingestVerified, {
        requestId: 'request-runner-test-2',
        runnerPublicId: key.publicId,
        signature: 'duplicate',
        receipt: { ...payload, receiptId: 'BBR-TEST-SIGNED-0002' },
      }),
    ).rejects.toThrow()

    const moderator = t.withIdentity({
      subject: 'runner_moderator',
      name: 'runner-moderator',
      preferredUsername: 'runner-moderator',
    })
    await moderator.mutation(api.users.syncCurrent, {})
    await moderator.mutation(api.users.updateProfile, {
      handle: 'runner-moderator',
      displayName: 'Runner Moderator',
      bio: 'Moderates runner lifecycle tests.',
      githubUsername: 'runner-moderator',
      avatarUrl: '',
    })
    const moderatorDocument = await t.run(async (ctx) =>
      ctx.db
        .query('users')
        .withIndex('by_handle', (query) =>
          query.eq('handle', 'runner-moderator'),
        )
        .unique(),
    )
    if (!moderatorDocument) throw new Error('Missing moderator')
    await t.run(async (ctx) => {
      await ctx.db.patch(moderatorDocument._id, { role: 'moderator' })
    })
    await moderator.mutation(api.runners.moderateStatus, {
      publicId: key.publicId,
      status: 'suspended',
      reason: 'Suspended to test that new signed receipt ingestion is denied.',
    })
    await expect(
      t.mutation(internal.runners.ingestVerified, {
        requestId: 'request-runner-test-suspended',
        runnerPublicId: key.publicId,
        signature: 'after-suspension',
        receipt: {
          ...payload,
          receiptId: 'BBR-TEST-SIGNED-SUSPENDED',
          nonce: 'nonce-suspended-1234567890',
        },
      }),
    ).rejects.toThrow()
    await moderator.mutation(api.runners.moderateStatus, {
      publicId: key.publicId,
      status: 'active',
      reason: 'Reactivated after the runner lifecycle test completed.',
    })

    await owner.mutation(api.runners.revoke, { publicId: key.publicId })
    await expect(
      t.mutation(internal.runners.ingestVerified, {
        requestId: 'request-runner-test-3',
        runnerPublicId: key.publicId,
        signature: 'after-revocation',
        receipt: {
          ...payload,
          receiptId: 'BBR-TEST-SIGNED-0003',
          nonce: 'nonce-abcdef1234567890',
        },
      }),
    ).rejects.toThrow()
    expect((await owner.query(api.runners.mine, {}))[0]?.status).toBe('revoked')
  })
})
