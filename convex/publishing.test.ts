// @vitest-environment edge-runtime

import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

const validDraft = {
  proposedVersion: '1.0.0',
  slug: 'tiny-reality-check',
  title: 'Tiny Reality Check',
  summary:
    'Checks whether a model notices a small but consequential false premise.',
  aisle: 'robustness-booth' as const,
  tags: ['premises', 'calibration'],
  modalities: ['text'],
  capabilityStatement:
    'Measures whether the model identifies an invalid premise before attempting an answer.',
  whyItMatters:
    'Confident answers to broken questions create avoidable downstream failures.',
  intendedUse:
    'Use this benchmark to compare premise-checking behavior under one exact track.',
  supportedClaims:
    'A strong result suggests reliable detection of the tested false-premise patterns.',
  unsupportedClaims:
    'The score does not establish general truthfulness or factual reliability.',
  methodMarkdown:
    'Each item contains one declared premise. The model must classify it and briefly explain any defect.',
  limitationsMarkdown: '',
  license: 'CC-BY-4.0',
  repositoryUrl: 'https://github.com/example/tiny-reality-check',
  sealedPolicy: {
    mode: 'author_runner' as const,
    itemCount: 30,
    datasetDigest: 'sha256:public-contract-only',
    rotationPolicy: 'Publish a successor whenever the scored set changes.',
    endpointExposureNote:
      'A remote model endpoint may retain prompts sent during evaluation; sealed only limits public download.',
  },
  tracks: [
    {
      id: 'standard',
      label: 'Standard · no tools',
      description:
        'One response per item with no external tools and no hidden retries.',
      promptPolicy: 'One instruction and one premise per item.',
      toolPolicy: 'No tools.',
      retryPolicy: 'One attempt per item.',
      primaryMetricKey: 'score',
      metricDirection: 'maximize' as const,
      scorerType: 'exact' as const,
      scorerVersion: '1.0.0',
    },
  ],
  changelogMarkdown: 'Initial public version.',
}

const validSamples = [1, 2, 3].map((number) => ({
  publicSampleId: `sample-${number}`,
  inputMarkdown: `Public example prompt ${number} with a deliberately visible premise.`,
  expectedMarkdown: `Public expected answer ${number}.`,
  explanationMarkdown: 'This is an intentionally public display example.',
  confirmedDisplayOnly: true,
}))

const confirmations = {
  samplesArePublic: true as const,
  samplesExcludedFromScore: true as const,
  noHiddenItems: true as const,
  rightsConfirmed: true as const,
}

async function setupMember(
  t: ReturnType<typeof convexTest>,
  subject: string,
  handle: string,
) {
  const member = t.withIdentity({
    subject,
    name: handle,
    email: `${handle}@example.com`,
    preferredUsername: handle,
  })
  await member.mutation(api.users.syncCurrent, {})
  await member.mutation(api.users.updateProfile, {
    handle,
    displayName: handle,
    bio: 'Public test profile.',
    githubUsername: handle,
    avatarUrl: '',
  })
  return member
}

describe('authenticated publishing', () => {
  it('enforces draft ownership from authenticated identity', async () => {
    const t = convexTest(schema, modules)
    const owner = await setupMember(t, 'workos_owner', 'draft-owner')
    const stranger = await setupMember(t, 'workos_stranger', 'draft-stranger')
    const created = await owner.mutation(api.drafts.create, {})

    await expect(
      stranger.query(api.drafts.get, { draftId: created.draftId }),
    ).rejects.toThrow()
    await expect(
      stranger.mutation(api.drafts.save, {
        draftId: created.draftId,
        draft: validDraft,
        samples: validSamples,
      }),
    ).rejects.toThrow()
  })

  it('publishes atomically, idempotently, and keeps successor history immutable', async () => {
    const t = convexTest(schema, modules)
    const owner = await setupMember(t, 'workos_publisher', 'careful-publisher')
    const created = await owner.mutation(api.drafts.create, {})
    await owner.mutation(api.drafts.save, {
      draftId: created.draftId,
      draft: validDraft,
      samples: validSamples,
    })

    const first = await owner.mutation(api.drafts.publish, {
      draftId: created.draftId,
      confirmations,
    })
    const repeated = await owner.mutation(api.drafts.publish, {
      draftId: created.draftId,
      confirmations,
    })
    expect(repeated).toEqual(first)
    await expect(
      owner.mutation(api.drafts.save, {
        draftId: created.draftId,
        draft: validDraft,
        samples: validSamples,
      }),
    ).rejects.toThrow()

    const successor = await owner.mutation(api.drafts.createSuccessor, {
      slug: first.slug,
    })
    const successorView = await owner.query(api.drafts.get, {
      draftId: successor.draftId,
    })
    if (!successorView) throw new Error('Missing successor draft')
    await owner.mutation(api.drafts.save, {
      draftId: successor.draftId,
      draft: {
        ...validDraft,
        proposedVersion: '1.0.1',
        title: 'Tiny Reality Check, Clarified',
        changelogMarkdown:
          'Clarified the method without rewriting version 1.0.0.',
      },
      samples: successorView.samples.map((sample) => ({
        publicSampleId: sample.publicSampleId,
        inputMarkdown: sample.inputMarkdown,
        ...(sample.expectedMarkdown
          ? { expectedMarkdown: sample.expectedMarkdown }
          : {}),
        ...(sample.explanationMarkdown
          ? { explanationMarkdown: sample.explanationMarkdown }
          : {}),
        confirmedDisplayOnly: sample.confirmedDisplayOnly,
      })),
    })
    await owner.mutation(api.drafts.publish, {
      draftId: successor.draftId,
      confirmations,
    })

    const versions = await t.run(async (ctx) =>
      ctx.db.query('benchmarkVersions').collect(),
    )
    expect(versions).toHaveLength(2)
    expect(
      versions.find((version) => version.version === '1.0.0'),
    ).toMatchObject({
      title: 'Tiny Reality Check',
      status: 'historical',
    })
    expect(
      versions.find((version) => version.version === '1.0.1'),
    ).toMatchObject({
      title: 'Tiny Reality Check, Clarified',
      status: 'current',
    })
    const auditEvents = await t.run(async (ctx) =>
      ctx.db.query('auditEvents').collect(),
    )
    expect(auditEvents.map((event) => event.action)).toEqual([
      'benchmark.version.published_initial',
      'benchmark.version.published_successor',
    ])
  })

  it('autosaves incomplete optional URLs but rejects them at publish time', async () => {
    const t = convexTest(schema, modules)
    const owner = await setupMember(t, 'workos_url_editor', 'url-editor')
    const created = await owner.mutation(api.drafts.create, {})
    const incompleteDraft = {
      ...validDraft,
      repositoryUrl: 'https://',
      writeupUrl: 'github.com/url-editor/writeup',
    }

    await expect(
      owner.mutation(api.drafts.save, {
        draftId: created.draftId,
        draft: incompleteDraft,
        samples: validSamples,
      }),
    ).resolves.toMatchObject({ updatedAt: expect.any(Number) })
    await expect(
      owner.mutation(api.drafts.publish, {
        draftId: created.draftId,
        confirmations,
      }),
    ).rejects.toThrow('INVALID_REPOSITORY_URL')
    await owner.mutation(api.drafts.save, {
      draftId: created.draftId,
      draft: {
        ...validDraft,
        repositoryUrl: 'https://example.com/not-a-github-repository',
      },
      samples: validSamples,
    })
    await expect(
      owner.mutation(api.drafts.publish, {
        draftId: created.draftId,
        confirmations,
      }),
    ).rejects.toThrow('INVALID_REPOSITORY_URL')
    const { repositoryUrl: _repositoryUrl, ...draftWithoutRepository } =
      validDraft
    await owner.mutation(api.drafts.save, {
      draftId: created.draftId,
      draft: draftWithoutRepository,
      samples: validSamples,
    })
    await expect(
      owner.query(api.drafts.get, { draftId: created.draftId }),
    ).resolves.not.toHaveProperty('repositoryUrl')
  })

  it('derives the public slug from the title instead of trusting draft input', async () => {
    const t = convexTest(schema, modules)
    const owner = await setupMember(t, 'workos_slug_editor', 'slug-editor')
    const created = await owner.mutation(api.drafts.create, {})

    await expect(
      owner.mutation(api.drafts.save, {
        draftId: created.draftId,
        draft: validDraft,
        samples: validSamples.slice(0, 2),
      }),
    ).rejects.toThrow('PUBLIC_SAMPLE_COUNT_INVALID')
    await expect(
      owner.mutation(api.drafts.save, {
        draftId: created.draftId,
        draft: {
          ...validDraft,
          proposedVersion: '99.0.0',
          slug: 'browser-supplied-slug',
          supportedClaims: '',
          unsupportedClaims: '',
          sealedPolicy: {
            mode: 'none',
            endpointExposureNote:
              'This public benchmark has no sealed scored material.',
          },
          tracks: [
            {
              ...validDraft.tracks[0],
              id: 'browser-track',
              label: 'Browser-supplied track',
            },
          ],
        },
        samples: validSamples.map((sample) => ({
          ...sample,
          publicSampleId: 'browser-supplied-id',
          confirmedDisplayOnly: false,
        })),
      }),
    ).resolves.toMatchObject({ slug: 'tiny-reality-check' })
    const published = await owner.mutation(api.drafts.publish, {
      draftId: created.draftId,
      confirmations,
    })
    expect(published).toMatchObject({
      slug: 'tiny-reality-check',
      version: '1.0.0',
    })

    const publicPage = await t.query(api.catalog.benchmarkBySlug, {
      slug: 'tiny-reality-check',
    })
    expect(publicPage?.benchmark).toMatchObject({
      repositoryUrl: validDraft.repositoryUrl,
      limitations: [],
      sealedSet: { mode: 'public' },
      samples: [
        { id: 'sample-1', includedInOfficialScore: false },
        { id: 'sample-2', includedInOfficialScore: false },
        { id: 'sample-3', includedInOfficialScore: false },
      ],
      tracks: [{ id: 'standard' }],
    })
  })

  it('normalizes public profiles and rejects handle collisions atomically', async () => {
    const t = convexTest(schema, modules)
    await setupMember(t, 'workos_first', 'shared-handle')
    const second = t.withIdentity({ subject: 'workos_second', name: 'Second' })
    await second.mutation(api.users.syncCurrent, {})

    await expect(
      second.mutation(api.users.updateProfile, {
        handle: 'shared-handle',
        displayName: 'Second member',
        bio: '',
        githubUsername: '',
        avatarUrl: '',
      }),
    ).rejects.toThrow()
    await expect(
      second.mutation(api.users.updateProfile, {
        handle: 'Not Normalized',
        displayName: 'Second member',
        bio: '',
        githubUsername: '',
        avatarUrl: '',
      }),
    ).rejects.toThrow()
  })

  it('keeps basket uniqueness and listing counts in one mutation', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.seed.loadSyntheticCatalog, {
      confirmSynthetic: true,
    })
    const member = await setupMember(t, 'workos_basket', 'basket-member')

    expect(
      await member.mutation(api.basket.toggle, {
        slug: 'calendar-gymnastics',
      }),
    ).toEqual({ saved: true })
    expect(await member.query(api.basket.mine, {})).toHaveLength(1)
    expect(
      await member.mutation(api.basket.toggle, {
        slug: 'calendar-gymnastics',
      }),
    ).toEqual({ saved: false })
    expect(await member.query(api.basket.mine, {})).toHaveLength(0)

    const benchmark = await t.run(async (ctx) =>
      ctx.db
        .query('benchmarks')
        .withIndex('by_slug', (query) =>
          query.eq('slug', 'calendar-gymnastics'),
        )
        .unique(),
    )
    expect(benchmark?.saveCount).toBe(0)
  })
})
