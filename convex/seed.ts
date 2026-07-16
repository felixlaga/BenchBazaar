import { v } from 'convex/values'

import {
  benchmarks as benchmarkFixtures,
  receipts as receiptFixtures,
} from '../src/features/catalog/data/catalog.fixtures'
import type { Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'

const SEED_OWNER_EXTERNAL_ID = 'synthetic:benchbazaar-preview'
const HISTORICAL_VERSION_COUNT = 2

function toLimitationsMarkdown(limitations: Array<string>) {
  return limitations.map((limitation) => `- ${limitation}`).join('\n')
}

function verificationFields(
  status: (typeof receiptFixtures)[number]['verification']['status'],
) {
  return {
    source:
      status === 'runner_signed' || status === 'independently_reproduced'
        ? ('runner' as const)
        : status === 'artifact_linked'
          ? ('artifact' as const)
          : ('manual' as const),
    verificationLevel:
      status === 'runner_signed' || status === 'independently_reproduced'
        ? ('runner_signed' as const)
        : status === 'artifact_linked'
          ? ('artifact_linked' as const)
          : ('self_reported' as const),
    maintainerOfficial: status === 'maintainer_official',
    independentlyReproduced: status === 'independently_reproduced',
    signatureValid:
      status === 'runner_signed' || status === 'independently_reproduced',
  }
}

function toTracks(fixture: (typeof benchmarkFixtures)[number]) {
  return fixture.tracks.map((track) => ({
    id: track.id,
    label: track.label,
    description: track.description,
    promptPolicy: 'One public instruction template per item.',
    toolPolicy:
      track.id === 'assisted'
        ? 'Only the tools declared by the track may be used.'
        : 'No tools.',
    retryPolicy: 'One attempt per item.',
    primaryMetricKey: track.primaryMetric.key,
    metricDirection:
      track.primaryMetric.direction === 'higher'
        ? ('maximize' as const)
        : ('minimize' as const),
    scorerType: 'exact' as const,
    scorerVersion: '1.0.0',
  }))
}

function datasetDigestFor(index: number) {
  return `sha256:dataset${String(index + 1).padStart(4, '0')}beef`
}

function manifestDigestFor(slug: string, version: string) {
  return `sha256:synthetic-${slug}-${version}-manifest`
}

export const loadSyntheticCatalog = internalMutation({
  args: { confirmSynthetic: v.literal(true) },
  handler: async (ctx) => {
    const now = Date.now()
    let owner = await ctx.db
      .query('users')
      .withIndex('by_externalId', (query) =>
        query.eq('externalId', SEED_OWNER_EXTERNAL_ID),
      )
      .unique()

    if (!owner) {
      const ownerId = await ctx.db.insert('users', {
        externalId: SEED_OWNER_EXTERNAL_ID,
        handle: 'bazaar-lab',
        displayName: 'Bazaar Lab',
        bio: 'Synthetic preview fixtures maintained by the BenchBazaar project.',
        role: 'curator',
        status: 'active',
        profileComplete: true,
        createdAt: now,
        updatedAt: now,
      })
      owner = await ctx.db.get('users', ownerId)
    }

    if (!owner) throw new Error('Could not create the synthetic seed owner.')
    if (!owner.profileComplete) {
      await ctx.db.patch(owner._id, { profileComplete: true })
    }

    const benchmarkIds = new Map<string, Id<'benchmarks'>>()
    const versionIds = new Map<string, Id<'benchmarkVersions'>>()
    let createdBenchmarks = 0
    let createdVersions = 0
    let createdSamples = 0

    for (const [fixtureIndex, fixture] of benchmarkFixtures.entries()) {
      let benchmark = await ctx.db
        .query('benchmarks')
        .withIndex('by_publicRef', (query) => query.eq('publicRef', fixture.id))
        .unique()

      if (!benchmark) {
        const benchmarkId = await ctx.db.insert('benchmarks', {
          ownerId: owner._id,
          slug: fixture.slug,
          publicRef: fixture.id,
          status: 'published',
          currentVersion: fixture.version,
          title: fixture.title,
          summary: fixture.summary,
          aisle: fixture.aisle.id,
          tags: fixture.tags,
          modalities: [fixture.modality],
          primaryModality: fixture.modality,
          scorerCategory: 'exact',
          sealed: true,
          hasReceipts: fixture.receiptCount > 0,
          searchText: [
            fixture.title,
            fixture.summary,
            fixture.aisle.label,
            fixture.vendor.handle,
            ...fixture.tags,
          ].join(' '),
          scorerLabel: fixture.scorer,
          publicSampleCount: fixture.publicSampleCount,
          sealedItemCount: fixture.sealedItemCount,
          receiptCount: fixture.receiptCount,
          distinctModelCount: fixture.distinctModelCount,
          independentReproductionCount: 0,
          saveCount: 0,
          curatorPick: fixture.curatorPick,
          runnerAvailable: fixture.runnerAvailable,
          synthetic: true,
          publishedAt: Date.parse(fixture.publishedAt),
          updatedAt: Date.parse(fixture.publishedAt),
          createdAt: Date.parse(fixture.publishedAt),
        })
        benchmark = await ctx.db.get('benchmarks', benchmarkId)
        createdBenchmarks += 1
      }

      if (!benchmark) throw new Error(`Could not seed ${fixture.slug}.`)
      await ctx.db.patch(benchmark._id, {
        primaryModality: fixture.modality,
        scorerCategory: 'exact',
        sealed: true,
        hasReceipts: fixture.receiptCount > 0,
        searchText: [
          fixture.title,
          fixture.summary,
          fixture.aisle.label,
          fixture.vendor.handle,
          fixture.purpose,
          ...fixture.tags,
        ].join(' '),
      })
      benchmarkIds.set(fixture.slug, benchmark._id)

      let historicalVersionId: Id<'benchmarkVersions'> | undefined
      if (fixtureIndex < HISTORICAL_VERSION_COUNT) {
        const historicalVersion = '0.9.0'
        const historicalPublicRef = `${fixture.id}@${historicalVersion}`
        let historical = await ctx.db
          .query('benchmarkVersions')
          .withIndex('by_publicRef', (query) =>
            query.eq('publicRef', historicalPublicRef),
          )
          .unique()

        if (!historical) {
          const insertedId = await ctx.db.insert('benchmarkVersions', {
            benchmarkId: benchmark._id,
            ownerId: owner._id,
            version: historicalVersion,
            publicRef: historicalPublicRef,
            status: 'historical',
            title: fixture.title,
            summary: fixture.summary,
            aisle: fixture.aisle.id,
            tags: fixture.tags,
            modalities: [fixture.modality],
            capabilityStatement: fixture.purpose,
            whyItMatters: fixture.purpose,
            intendedUse: fixture.purpose,
            supportedClaims: fixture.summary,
            unsupportedClaims: fixture.limitations.join(' '),
            methodMarkdown: `${fixture.method} This preview used the earlier 0.9 recipe.`,
            limitationsMarkdown: toLimitationsMarkdown(fixture.limitations),
            tracks: toTracks(fixture),
            sealedPolicy: {
              mode: 'author_runner',
              itemCount: fixture.sealedItemCount,
              datasetDigest: datasetDigestFor(fixtureIndex),
              rotationPolicy: 'Superseded by version 1.0.0.',
              endpointExposureNote: fixture.sealedSet.endpointExposure,
            },
            manifestProtocolVersion: '0.synthetic-preview',
            manifestDigest: manifestDigestFor(fixture.slug, historicalVersion),
            changelogMarkdown:
              'Preview release retained for historical receipt compatibility.',
            comparability: 'partially_compatible',
            publishedAt: Date.parse(fixture.publishedAt) - 86_400_000 * 30,
          })
          historical = await ctx.db.get('benchmarkVersions', insertedId)
          createdVersions += 1
        }

        if (!historical) {
          throw new Error(`Could not seed history for ${fixture.slug}.`)
        }
        historicalVersionId = historical._id
        versionIds.set(`${fixture.slug}@${historicalVersion}`, historical._id)

        const historicalSamples = await ctx.db
          .query('publicSamples')
          .withIndex('by_benchmarkVersionId_position', (query) =>
            query.eq('benchmarkVersionId', historical._id),
          )
          .take(100)
        const historicalSampleIds = new Set(
          historicalSamples.map((sample) => sample.publicSampleId),
        )
        for (const [position, sample] of fixture.samples.entries()) {
          if (historicalSampleIds.has(sample.id)) continue
          await ctx.db.insert('publicSamples', {
            benchmarkVersionId: historical._id,
            benchmarkId: benchmark._id,
            publicSampleId: sample.id,
            position,
            inputMarkdown: sample.input,
            expectedMarkdown: sample.expectedAnswer,
            explanationMarkdown: sample.explanation,
            includedInOfficialScore: false,
            publishedAt: historical.publishedAt,
          })
          createdSamples += 1
        }
      }

      const versionPublicRef = `${fixture.id}@${fixture.version}`
      let version = await ctx.db
        .query('benchmarkVersions')
        .withIndex('by_publicRef', (query) =>
          query.eq('publicRef', versionPublicRef),
        )
        .unique()

      if (!version) {
        const versionId = await ctx.db.insert('benchmarkVersions', {
          benchmarkId: benchmark._id,
          ownerId: owner._id,
          version: fixture.version,
          publicRef: versionPublicRef,
          status: 'current',
          title: fixture.title,
          summary: fixture.summary,
          aisle: fixture.aisle.id,
          tags: fixture.tags,
          modalities: [fixture.modality],
          capabilityStatement: fixture.purpose,
          whyItMatters: fixture.purpose,
          intendedUse: fixture.purpose,
          supportedClaims: fixture.summary,
          unsupportedClaims: fixture.limitations.join(' '),
          methodMarkdown: fixture.method,
          limitationsMarkdown: toLimitationsMarkdown(fixture.limitations),
          ...(historicalVersionId
            ? { supersedesVersionId: historicalVersionId }
            : {}),
          tracks: toTracks(fixture),
          sealedPolicy: {
            mode: 'author_runner',
            itemCount: fixture.sealedItemCount,
            datasetDigest: datasetDigestFor(fixtureIndex),
            rotationPolicy: 'Create a successor version when the set changes.',
            endpointExposureNote: fixture.sealedSet.endpointExposure,
          },
          manifestProtocolVersion: '0.synthetic-preview',
          manifestDigest: manifestDigestFor(fixture.slug, fixture.version),
          changelogMarkdown: 'Initial synthetic preview version.',
          comparability: 'compatible',
          publishedAt: Date.parse(fixture.publishedAt),
        })
        version = await ctx.db.get('benchmarkVersions', versionId)
        createdVersions += 1
      }

      if (!version) {
        throw new Error(`Could not seed version for ${fixture.slug}.`)
      }
      await ctx.db.patch(version._id, {
        supersedesVersionId: historicalVersionId,
        tracks: toTracks(fixture),
        sealedPolicy: {
          mode: 'author_runner',
          itemCount: fixture.sealedItemCount,
          datasetDigest: datasetDigestFor(fixtureIndex),
          rotationPolicy: 'Create a successor version when the set changes.',
          endpointExposureNote: fixture.sealedSet.endpointExposure,
        },
        manifestDigest: manifestDigestFor(fixture.slug, fixture.version),
      })
      versionIds.set(fixture.slug, version._id)

      if (benchmark.currentVersionId !== version._id) {
        await ctx.db.patch(benchmark._id, {
          currentVersionId: version._id,
          currentVersion: fixture.version,
        })
      }

      const existingSamples = await ctx.db
        .query('publicSamples')
        .withIndex('by_benchmarkVersionId_position', (query) =>
          query.eq('benchmarkVersionId', version._id),
        )
        .take(100)
      const existingSampleIds = new Set(
        existingSamples.map((sample) => sample.publicSampleId),
      )

      for (const [position, sample] of fixture.samples.entries()) {
        if (existingSampleIds.has(sample.id)) continue

        await ctx.db.insert('publicSamples', {
          benchmarkVersionId: version._id,
          benchmarkId: benchmark._id,
          publicSampleId: sample.id,
          position,
          inputMarkdown: sample.input,
          expectedMarkdown: sample.expectedAnswer,
          explanationMarkdown: sample.explanation,
          includedInOfficialScore: false,
          publishedAt: Date.parse(fixture.publishedAt),
        })
        createdSamples += 1
      }
    }

    const modelIds = new Map<string, Id<'models'>>()
    let createdModels = 0

    for (const fixture of receiptFixtures) {
      if (modelIds.has(fixture.model.exactId)) continue

      let model = await ctx.db
        .query('models')
        .withIndex('by_canonicalId', (query) =>
          query.eq('canonicalId', fixture.model.exactId),
        )
        .unique()

      if (!model) {
        const modelId = await ctx.db.insert('models', {
          provider: 'Synthetic Preview',
          canonicalId: fixture.model.exactId,
          displayName: fixture.model.displayName,
          aliases: [fixture.model.slug],
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        model = await ctx.db.get('models', modelId)
        createdModels += 1
      }

      if (!model) {
        throw new Error(`Could not seed model ${fixture.model.exactId}.`)
      }
      modelIds.set(fixture.model.exactId, model._id)
    }

    let createdReceipts = 0
    const receiptIds = new Map<string, Id<'receipts'>>()
    for (const [receiptIndex, fixture] of receiptFixtures.entries()) {
      const existing = await ctx.db
        .query('receipts')
        .withIndex('by_publicId', (query) => query.eq('publicId', fixture.id))
        .unique()

      const benchmarkId = benchmarkIds.get(fixture.benchmark.slug)
      const isHistoricalReceipt = receiptIndex === benchmarkFixtures.length
      const receiptVersion = isHistoricalReceipt
        ? '0.9.0'
        : fixture.benchmark.version
      const versionId = versionIds.get(
        isHistoricalReceipt
          ? `${fixture.benchmark.slug}@${receiptVersion}`
          : fixture.benchmark.slug,
      )
      const modelId = modelIds.get(fixture.model.exactId)

      if (!benchmarkId || !versionId || !modelId) {
        throw new Error(`Missing seed dependency for receipt ${fixture.id}.`)
      }

      const verification = verificationFields(fixture.verification.status)
      const status =
        receiptIndex === 5
          ? ('disputed' as const)
          : receiptIndex === 10
            ? ('invalid' as const)
            : receiptIndex === 4
              ? ('superseded' as const)
              : ('valid' as const)
      const receiptFields = {
        publicId: fixture.id,
        protocolVersion: '0.synthetic-preview',
        benchmarkId,
        benchmarkVersionId: versionId,
        trackId: fixture.trackId,
        modelId,
        submittedModelId: fixture.model.exactId,
        submittedByUserId: owner._id,
        source: verification.source,
        verificationLevel: verification.verificationLevel,
        maintainerOfficial: verification.maintainerOfficial,
        independentlyReproduced: verification.independentlyReproduced,
        status,
        primaryMetricKey: 'score',
        primaryMetricValue: fixture.primaryMetric.value,
        metrics: [
          {
            key: 'score',
            label: fixture.primaryMetric.label,
            value: fixture.primaryMetric.value,
            unit: fixture.primaryMetric.unit,
            direction: 'maximize' as const,
          },
          {
            key: 'item_count',
            label: 'Items evaluated',
            value: fixture.itemCount,
            unit: ' items',
            direction: 'neutral' as const,
          },
          {
            key: 'retries',
            label: 'Retries',
            value: 0,
            direction: 'neutral' as const,
          },
        ],
        itemCount: fixture.itemCount,
        scorerVersion: '1.0.0',
        configurationSummary:
          'Synthetic preview configuration used only to demonstrate the public receipt format.',
        configurationDigest: fixture.configurationDigest,
        datasetDigest: fixture.datasetDigest,
        manifestDigest: manifestDigestFor(
          fixture.benchmark.slug,
          receiptVersion,
        ),
        endpointExposure: 'operator_provider_account' as const,
        completedAt: Date.parse(fixture.submittedAt),
        submittedAt: Date.parse(fixture.submittedAt),
        artifactRefs:
          verification.source === 'artifact'
            ? [
                {
                  label: 'Synthetic public run summary',
                  url: `https://example.invalid/artifacts/${fixture.id}`,
                  digest: fixture.configurationDigest,
                },
              ]
            : [],
        ...(status === 'disputed'
          ? {
              disputeSummary:
                'The displayed configuration digest is under review. The receipt remains visible while disputed.',
            }
          : {}),
        ...(status === 'invalid'
          ? {
              compatibilityStatus: 'incompatible' as const,
              compatibilityIssues: [
                'synthetic example: submitted track configuration did not match',
              ],
              moderationReason:
                'Synthetic example: the submitted result did not match the declared track configuration.',
            }
          : {
              compatibilityStatus: 'compatible' as const,
              compatibilityIssues: [],
            }),
        ...(verification.signatureValid
          ? {
              signatureFingerprint: `ed25519:synthetic:${String(receiptIndex + 1).padStart(4, '0')}`,
            }
          : {}),
        signatureValid: verification.signatureValid,
        synthetic: true,
      }

      let receiptId: Id<'receipts'>
      if (existing) {
        await ctx.db.patch(existing._id, receiptFields)
        receiptId = existing._id
      } else {
        receiptId = await ctx.db.insert('receipts', receiptFields)
        createdReceipts += 1
      }
      receiptIds.set(fixture.id, receiptId)
    }

    const supersededReceiptId = receiptIds.get(receiptFixtures[4]?.id ?? '')
    const successorReceiptId = receiptIds.get(receiptFixtures[16]?.id ?? '')
    if (supersededReceiptId && successorReceiptId) {
      await ctx.db.patch(successorReceiptId, {
        supersedesReceiptId: supersededReceiptId,
      })
    }

    for (const fixture of benchmarkFixtures) {
      const benchmarkId = benchmarkIds.get(fixture.slug)
      if (!benchmarkId) continue
      const versions = await ctx.db
        .query('benchmarkVersions')
        .withIndex('by_benchmarkId_publishedAt', (query) =>
          query.eq('benchmarkId', benchmarkId),
        )
        .take(50)
      const receiptDocuments = (
        await Promise.all(
          versions.flatMap((version) =>
            version.tracks.map((track) =>
              ctx.db
                .query('receipts')
                .withIndex('by_benchmarkVersionId_trackId', (query) =>
                  query
                    .eq('benchmarkVersionId', version._id)
                    .eq('trackId', track.id),
                )
                .take(100),
            ),
          ),
        )
      ).flat()
      const validReceipts = receiptDocuments.filter(
        (receipt) => receipt.status === 'valid',
      )
      await ctx.db.patch(benchmarkId, {
        receiptCount: receiptDocuments.length,
        hasReceipts: receiptDocuments.length > 0,
        distinctModelCount: new Set(
          validReceipts.map((receipt) => receipt.modelId),
        ).size,
        independentReproductionCount: validReceipts.filter(
          (receipt) => receipt.independentlyReproduced,
        ).length,
      })
    }

    return {
      created: {
        benchmarks: createdBenchmarks,
        versions: createdVersions,
        samples: createdSamples,
        models: createdModels,
        receipts: createdReceipts,
      },
      totals: {
        benchmarks: benchmarkFixtures.length,
        versions: benchmarkFixtures.length + HISTORICAL_VERSION_COUNT,
        samples:
          benchmarkFixtures.reduce(
            (total, benchmark) => total + benchmark.samples.length,
            0,
          ) +
          benchmarkFixtures
            .slice(0, HISTORICAL_VERSION_COUNT)
            .reduce((total, benchmark) => total + benchmark.samples.length, 0),
        models: modelIds.size,
        receipts: receiptFixtures.length,
      },
    }
  },
})
