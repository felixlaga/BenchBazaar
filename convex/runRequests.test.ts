// @vitest-environment edge-runtime

import { bytesToBase64Url } from '@benchbazaar/protocol'
import { convexTest } from 'convex-test'
import type { TestConvex } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

type RunRequestTestContext = TestConvex<typeof schema>

async function setupUser(
  t: RunRequestTestContext,
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
    bio: 'Run request test profile.',
    githubUsername: handle,
    avatarUrl: '',
  })
  const document = await t.run(async (ctx) =>
    ctx.db
      .query('users')
      .withIndex('by_handle', (query) => query.eq('handle', handle))
      .unique(),
  )
  if (!document) throw new Error('Missing user')
  return { client, document }
}

describe('run request workflow and leakage budgets', () => {
  it('enforces the state machine and closes a request only with its assigned signed receipt', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const owner = await setupUser(t, 'request-owner', 'request-owner')
    const requester = await setupUser(
      t,
      'request-requester',
      'request-requester',
    )
    const hash = `sha256:${'b'.repeat(64)}`
    const contract = await t.run(async (ctx) => {
      const benchmark = await ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique()
      if (!benchmark) throw new Error('Missing benchmark')
      const version = await ctx.db
        .query('benchmarkVersions')
        .withIndex('by_benchmarkId_version', (query) =>
          query.eq('benchmarkId', benchmark._id).eq('version', '1.0.0'),
        )
        .unique()
      if (!version) throw new Error('Missing version')
      await ctx.db.patch(benchmark._id, { ownerId: owner.document._id })
      await ctx.db.patch(version._id, {
        ownerId: owner.document._id,
        manifestDigest: hash,
        sealedPolicy: {
          ...version.sealedPolicy,
          itemCount: 120,
          datasetDigest: hash,
        },
      })
      return { benchmark, version }
    })
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
      'sign',
      'verify',
    ])
    const publicKeySpki = bytesToBase64Url(
      new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey)),
    )
    const runner = await owner.client.mutation(api.runners.register, {
      label: 'Request runner',
      publicKeySpki,
      scope: 'benchmark',
      benchmarkId: contract.benchmark._id,
    })
    const created = await requester.client.mutation(api.runRequests.create, {
      benchmarkVersionId: contract.version._id,
      trackId: 'standard',
      requestedModelId: 'testco/request-model-2026-07-28',
      endpointExposureAcknowledged: true,
    })
    await expect(
      requester.client.mutation(api.runRequests.transition, {
        publicId: created.publicId,
        action: 'approve',
      }),
    ).rejects.toThrow()
    await owner.client.mutation(api.runRequests.transition, {
      publicId: created.publicId,
      action: 'approve',
      note: 'Owner accepted the request for controlled local execution.',
    })
    await owner.client.mutation(api.runRequests.transition, {
      publicId: created.publicId,
      action: 'assign',
      runnerPublicId: runner.publicId,
    })
    await owner.client.mutation(api.runRequests.transition, {
      publicId: created.publicId,
      action: 'start',
    })

    const receiptPublicId = 'BBR-REQUEST-CLOSE-0001'
    await t.mutation(internal.runners.ingestVerified, {
      requestId: 'request-ingestion-test',
      runnerPublicId: runner.publicId,
      signature: 'verified-by-http-action-in-production',
      receipt: {
        protocolVersion: '1.0.0',
        receiptId: receiptPublicId,
        runnerId: runner.publicId,
        nonce: 'request-nonce-1234567890',
        benchmarkPublicRef: contract.benchmark.publicRef,
        benchmarkVersion: '1.0.0',
        trackId: 'standard',
        modelId: 'testco/request-model-2026-07-28',
        metrics: [{ key: 'score', value: 92, unit: '%' }],
        primaryMetricKey: 'score',
        primaryMetricValue: 92,
        itemCount: 120,
        scorerVersion: '1.0.0',
        configurationDigest: hash,
        manifestDigest: hash,
        datasetDigest: hash,
        completedAt: new Date(Date.now() - 60_000).toISOString(),
        endpointExposure: 'trusted_local_model',
      },
    })
    await owner.client.mutation(api.runRequests.transition, {
      publicId: created.publicId,
      action: 'succeed',
      receiptPublicId,
    })
    const view = await requester.client.query(api.runRequests.get, {
      publicId: created.publicId,
    })
    expect(view).toMatchObject({
      status: 'succeeded',
      receiptPublicId,
      requestedModelId: 'testco/request-model-2026-07-28',
    })
    expect(
      (await owner.client.query(api.runRequests.ownerQueue, {}))[0]?.publicId,
    ).toBe(created.publicId)
  })

  it('rejects credential-bearing endpoints and enforces per-user quotas', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const requester = await setupUser(t, 'quota-user', 'quota-user')
    const options = await requester.client.query(api.runRequests.options, {})
    const version = options[0].versions[0]
    const track = version.tracks[0]

    await expect(
      requester.client.mutation(api.runRequests.create, {
        benchmarkVersionId: version.id,
        trackId: track.id,
        requestedModelId: 'testco/quota-model',
        endpointUrl: 'https://secret:provider-key@example.com/model',
        endpointExposureAcknowledged: true,
      }),
    ).rejects.toThrow()
    for (let index = 0; index < 5; index += 1) {
      await requester.client.mutation(api.runRequests.create, {
        benchmarkVersionId: version.id,
        trackId: track.id,
        requestedModelId: `testco/quota-model-${index}`,
        endpointExposureAcknowledged: true,
      })
    }
    const enforcedOperations = await t.run(async (ctx) =>
      (await ctx.db.query('rateLimits').collect()).map(
        (entry) => entry.operation,
      ),
    )
    expect(enforcedOperations).toEqual(
      expect.arrayContaining([
        'run_request.user',
        'run_request.benchmark',
        'run_request.model',
        'run_request.endpoint_category',
      ]),
    )
    await expect(
      requester.client.mutation(api.runRequests.create, {
        benchmarkVersionId: version.id,
        trackId: track.id,
        requestedModelId: 'testco/quota-model-over-limit',
        endpointExposureAcknowledged: true,
      }),
    ).rejects.toThrow()
  })
})
