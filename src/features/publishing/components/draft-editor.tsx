import { useNavigate } from '@tanstack/react-router'
import type { FunctionReturnType } from 'convex/server'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, Check, Plus, Save, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'
import { aisles } from '#/features/catalog/domain/aisles'

import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type TrackState = {
  id: string
  label: string
  description: string
  promptPolicy: string
  toolPolicy: string
  retryPolicy: string
  primaryMetricKey: string
  metricDirection: 'maximize' | 'minimize'
  scorerType: 'exact' | 'code' | 'human' | 'llm_judge' | 'hybrid'
  scorerVersion: string
  judgeModel?: string | undefined
  judgeRubric?: string | undefined
}

type DraftState = {
  proposedVersion: string
  slug: string
  title: string
  summary: string
  aisle: (typeof aisles)[number]['id']
  tags: Array<string>
  modalities: Array<string>
  capabilityStatement: string
  whyItMatters: string
  intendedUse: string
  supportedClaims: string
  unsupportedClaims: string
  methodMarkdown: string
  limitationsMarkdown: string
  license: string
  repositoryUrl: string
  writeupUrl: string
  sealedPolicy: {
    mode:
      | 'none'
      | 'manual_signed'
      | 'author_runner'
      | 'remote_runner'
      | 'managed_later'
    itemCount?: number | undefined
    datasetDigest?: string | undefined
    generatorDigest?: string | undefined
    rotationPolicy?: string | undefined
    endpointExposureNote: string
  }
  tracks: Array<TrackState>
  changelogMarkdown: string
}

type SampleState = {
  publicSampleId: string
  inputMarkdown: string
  expectedMarkdown: string
  explanationMarkdown: string
  confirmedDisplayOnly: boolean
}

const publishConfirmationLabels = {
  samplesArePublic: 'The free samples are intentionally public.',
  samplesExcludedFromScore:
    'The free samples are excluded from the official scored set.',
  noHiddenItems: 'No hidden test items were pasted into public fields.',
  rightsConfirmed: 'I have the right to publish this method and these samples.',
} as const

export function DraftEditor({ draftId }: { draftId: string }) {
  const draft = useQuery(api.drafts.get, {
    draftId: draftId as Id<'benchmarkDrafts'>,
  })
  if (draft === undefined) {
    return <p className="save-state">Loading draft…</p>
  }
  if (draft === null) {
    return (
      <StatusBanner variant="warning" title="Draft unavailable">
        This draft does not exist or is no longer editable.
      </StatusBanner>
    )
  }
  return <DraftEditorForm key={draft.id} initial={draft} />
}

function DraftEditorForm({
  initial,
}: {
  initial: NonNullable<FunctionReturnType<typeof api.drafts.get>>
}) {
  const [draft, setDraft] = useState<DraftState>(() => ({
    proposedVersion: initial.proposedVersion,
    slug: initial.slug,
    title: initial.title,
    summary: initial.summary,
    aisle: initial.aisle as DraftState['aisle'],
    tags: initial.tags,
    modalities: initial.modalities,
    capabilityStatement: initial.capabilityStatement,
    whyItMatters: initial.whyItMatters,
    intendedUse: initial.intendedUse,
    supportedClaims: initial.supportedClaims,
    unsupportedClaims: initial.unsupportedClaims,
    methodMarkdown: initial.methodMarkdown,
    limitationsMarkdown: initial.limitationsMarkdown,
    license: initial.license ?? '',
    repositoryUrl: initial.repositoryUrl ?? '',
    writeupUrl: initial.writeupUrl ?? '',
    sealedPolicy: initial.sealedPolicy,
    tracks: initial.tracks,
    changelogMarkdown: initial.changelogMarkdown,
  }))
  const [samples, setSamples] = useState<Array<SampleState>>(() =>
    initial.samples.map((sample) => ({
      publicSampleId: sample.publicSampleId,
      inputMarkdown: sample.inputMarkdown,
      expectedMarkdown: sample.expectedMarkdown ?? '',
      explanationMarkdown: sample.explanationMarkdown ?? '',
      confirmedDisplayOnly: sample.confirmedDisplayOnly,
    })),
  )
  const [saveState, setSaveState] = useState<
    'saved' | 'dirty' | 'saving' | 'error'
  >('saved')
  const [saveMessage, setSaveMessage] = useState('All changes saved.')
  const [publishing, setPublishing] = useState(false)
  const [confirmations, setConfirmations] = useState(
    Object.fromEntries(
      Object.keys(publishConfirmationLabels).map((key) => [key, false]),
    ) as Record<keyof typeof publishConfirmationLabels, boolean>,
  )
  const saveDraft = useMutation(api.drafts.save)
  const publishDraft = useMutation(api.drafts.publish)
  const navigate = useNavigate()
  const latestPayload = useRef('')

  function mutationDraft() {
    return {
      proposedVersion: draft.proposedVersion,
      slug: draft.slug,
      title: draft.title,
      summary: draft.summary,
      aisle: draft.aisle,
      tags: draft.tags,
      modalities: draft.modalities,
      capabilityStatement: draft.capabilityStatement,
      whyItMatters: draft.whyItMatters,
      intendedUse: draft.intendedUse,
      supportedClaims: draft.supportedClaims,
      unsupportedClaims: draft.unsupportedClaims,
      methodMarkdown: draft.methodMarkdown,
      limitationsMarkdown: draft.limitationsMarkdown,
      ...(draft.license.trim() ? { license: draft.license.trim() } : {}),
      ...(draft.repositoryUrl.trim()
        ? { repositoryUrl: draft.repositoryUrl.trim() }
        : {}),
      ...(draft.writeupUrl.trim()
        ? { writeupUrl: draft.writeupUrl.trim() }
        : {}),
      sealedPolicy: {
        mode: draft.sealedPolicy.mode,
        ...(draft.sealedPolicy.itemCount
          ? { itemCount: draft.sealedPolicy.itemCount }
          : {}),
        ...(draft.sealedPolicy.datasetDigest?.trim()
          ? { datasetDigest: draft.sealedPolicy.datasetDigest.trim() }
          : {}),
        ...(draft.sealedPolicy.generatorDigest?.trim()
          ? { generatorDigest: draft.sealedPolicy.generatorDigest.trim() }
          : {}),
        ...(draft.sealedPolicy.rotationPolicy?.trim()
          ? { rotationPolicy: draft.sealedPolicy.rotationPolicy.trim() }
          : {}),
        endpointExposureNote: draft.sealedPolicy.endpointExposureNote,
      },
      tracks: draft.tracks.map((track) => ({
        id: track.id,
        label: track.label,
        description: track.description,
        promptPolicy: track.promptPolicy,
        toolPolicy: track.toolPolicy,
        retryPolicy: track.retryPolicy,
        primaryMetricKey: track.primaryMetricKey,
        metricDirection: track.metricDirection,
        scorerType: track.scorerType,
        scorerVersion: track.scorerVersion,
        ...(track.judgeModel?.trim()
          ? { judgeModel: track.judgeModel.trim() }
          : {}),
        ...(track.judgeRubric?.trim()
          ? { judgeRubric: track.judgeRubric.trim() }
          : {}),
      })),
      changelogMarkdown: draft.changelogMarkdown,
    }
  }

  function mutationSamples() {
    return samples.map((sample) => ({
      publicSampleId: sample.publicSampleId,
      inputMarkdown: sample.inputMarkdown,
      ...(sample.expectedMarkdown.trim()
        ? { expectedMarkdown: sample.expectedMarkdown }
        : {}),
      ...(sample.explanationMarkdown.trim()
        ? { explanationMarkdown: sample.explanationMarkdown }
        : {}),
      confirmedDisplayOnly: sample.confirmedDisplayOnly,
    }))
  }

  const serialized = JSON.stringify({ draft, samples })
  if (!latestPayload.current) latestPayload.current = serialized

  useEffect(() => {
    if (serialized === latestPayload.current) return
    setSaveState('dirty')
    setSaveMessage('Changes waiting to save…')
    const timeout = window.setTimeout(async () => {
      setSaveState('saving')
      setSaveMessage('Saving to Convex…')
      try {
        await saveDraft({
          draftId: initial.id,
          draft: mutationDraft(),
          samples: mutationSamples(),
        })
        latestPayload.current = serialized
        setSaveState('saved')
        setSaveMessage('All changes saved.')
      } catch (cause) {
        setSaveState('error')
        setSaveMessage(
          cause instanceof Error ? cause.message : 'Autosave failed.',
        )
      }
    }, 900)
    return () => window.clearTimeout(timeout)
  }, [draft, initial.id, samples, saveDraft, serialized])

  function updateDraft<TKey extends keyof DraftState>(
    key: TKey,
    value: DraftState[TKey],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateTrack<TKey extends keyof TrackState>(
    index: number,
    key: TKey,
    value: TrackState[TKey],
  ) {
    setDraft((current) => ({
      ...current,
      tracks: current.tracks.map((track, trackIndex) =>
        trackIndex === index ? { ...track, [key]: value } : track,
      ),
    }))
  }

  function updateSample<TKey extends keyof SampleState>(
    index: number,
    key: TKey,
    value: SampleState[TKey],
  ) {
    setSamples((current) =>
      current.map((sample, sampleIndex) =>
        sampleIndex === index ? { ...sample, [key]: value } : sample,
      ),
    )
  }

  async function publish() {
    setPublishing(true)
    setSaveMessage('Validating and publishing…')
    try {
      await saveDraft({
        draftId: initial.id,
        draft: mutationDraft(),
        samples: mutationSamples(),
      })
      const result = await publishDraft({
        draftId: initial.id,
        confirmations: {
          samplesArePublic: true,
          samplesExcludedFromScore: true,
          noHiddenItems: true,
          rightsConfirmed: true,
        },
      })
      await navigate({
        to: '/b/$slug/v/$version',
        params: { slug: result.slug, version: result.version },
      })
    } catch (cause) {
      setPublishing(false)
      setSaveState('error')
      setSaveMessage(cause instanceof Error ? cause.message : 'Publish failed.')
    }
  }

  const allConfirmed = Object.values(confirmations).every(Boolean)

  return (
    <div className="draft-editor">
      <header className="draft-editor__header">
        <div>
          <p className="eyebrow">
            {initial.baseVersionId ? 'Successor draft' : 'New benchmark draft'}
          </p>
          <h1>{draft.title || 'Untitled benchmark'}</h1>
          <p>
            Publishing as <strong>@{initial.owner.handle}</strong>
          </p>
        </div>
        <div className={`save-state save-state--${saveState}`} role="status">
          <Save aria-hidden="true" size={16} /> {saveMessage}
        </div>
      </header>

      <StatusBanner variant="warning" title="Public fields only">
        <AlertTriangle aria-hidden="true" size={18} /> Everything in this editor
        may be published and indexed. Never paste official hidden questions,
        answers, private fixtures, credentials, or signing keys.
      </StatusBanner>

      <div className="draft-editor__layout">
        <div className="draft-editor__forms">
          <EditorSection number="01" title="Listing">
            <div className="editor-fields">
              <Field label="Title" wide>
                <input
                  maxLength={100}
                  onChange={(event) => updateDraft('title', event.target.value)}
                  placeholder="Calendar Gymnastics"
                  value={draft.title}
                />
              </Field>
              <Field label="Stable slug">
                <input
                  disabled={Boolean(initial.baseVersionId)}
                  maxLength={80}
                  onChange={(event) => updateDraft('slug', event.target.value)}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="calendar-gymnastics"
                  value={draft.slug}
                />
              </Field>
              <Field label="Version">
                <input
                  onChange={(event) =>
                    updateDraft('proposedVersion', event.target.value)
                  }
                  pattern="\d+\.\d+\.\d+"
                  value={draft.proposedVersion}
                />
              </Field>
              <Field label="Summary" wide>
                <textarea
                  maxLength={220}
                  onChange={(event) =>
                    updateDraft('summary', event.target.value)
                  }
                  placeholder="Describe the test in one sentence a developer can understand."
                  value={draft.summary}
                />
              </Field>
              <Field label="Aisle">
                <select
                  onChange={(event) =>
                    updateDraft(
                      'aisle',
                      event.target.value as DraftState['aisle'],
                    )
                  }
                  value={draft.aisle}
                >
                  {aisles.map((aisle) => (
                    <option key={aisle.id} value={aisle.id}>
                      {aisle.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Modality">
                <select
                  onChange={(event) =>
                    updateDraft('modalities', [event.target.value])
                  }
                  value={draft.modalities[0] ?? 'text'}
                >
                  <option value="text">Text</option>
                  <option value="text + image">Text + image</option>
                </select>
              </Field>
              <Field label="Tags, comma separated" wide>
                <input
                  onChange={(event) =>
                    updateDraft(
                      'tags',
                      event.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    )
                  }
                  value={draft.tags.join(', ')}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection number="02" title="Purpose and claims">
            <div className="editor-fields">
              <Field label="Capability statement" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('capabilityStatement', event.target.value)
                  }
                  value={draft.capabilityStatement}
                />
              </Field>
              <Field label="Why it matters" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('whyItMatters', event.target.value)
                  }
                  value={draft.whyItMatters}
                />
              </Field>
              <Field label="Intended use" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('intendedUse', event.target.value)
                  }
                  value={draft.intendedUse}
                />
              </Field>
              <Field label="Supported claims" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('supportedClaims', event.target.value)
                  }
                  value={draft.supportedClaims}
                />
              </Field>
              <Field label="Unsupported claims" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('unsupportedClaims', event.target.value)
                  }
                  value={draft.unsupportedClaims}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection number="03" title="Free public samples">
            <p className="editor-help">
              At least three complete examples are required. IDs are public and
              distinct from every official scored item.
            </p>
            <div className="draft-samples">
              {samples.map((sample, index) => (
                <article key={`${sample.publicSampleId}-${index}`}>
                  <div className="draft-sample__heading">
                    <strong>Sample {index + 1}</strong>
                    {samples.length > 3 && (
                      <button
                        aria-label={`Remove sample ${index + 1}`}
                        className="icon-button"
                        onClick={() =>
                          setSamples((current) =>
                            current.filter(
                              (_, sampleIndex) => sampleIndex !== index,
                            ),
                          )
                        }
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    )}
                  </div>
                  <Field label="Stable public sample ID">
                    <input
                      onChange={(event) =>
                        updateSample(
                          index,
                          'publicSampleId',
                          event.target.value,
                        )
                      }
                      value={sample.publicSampleId}
                    />
                  </Field>
                  <Field label="Public input">
                    <textarea
                      onChange={(event) =>
                        updateSample(index, 'inputMarkdown', event.target.value)
                      }
                      value={sample.inputMarkdown}
                    />
                  </Field>
                  <Field label="Expected public answer">
                    <textarea
                      onChange={(event) =>
                        updateSample(
                          index,
                          'expectedMarkdown',
                          event.target.value,
                        )
                      }
                      value={sample.expectedMarkdown}
                    />
                  </Field>
                  <Field label="Explanation">
                    <textarea
                      onChange={(event) =>
                        updateSample(
                          index,
                          'explanationMarkdown',
                          event.target.value,
                        )
                      }
                      value={sample.explanationMarkdown}
                    />
                  </Field>
                  <label className="confirmation-check">
                    <input
                      checked={sample.confirmedDisplayOnly}
                      onChange={(event) =>
                        updateSample(
                          index,
                          'confirmedDisplayOnly',
                          event.target.checked,
                        )
                      }
                      type="checkbox"
                    />
                    This example is intentionally public and excluded from the
                    official score.
                  </label>
                </article>
              ))}
            </div>
            {samples.length < 10 && (
              <button
                className="button button--paper"
                onClick={() =>
                  setSamples((current) => [
                    ...current,
                    {
                      publicSampleId: `sample-${current.length + 1}`,
                      inputMarkdown: '',
                      expectedMarkdown: '',
                      explanationMarkdown: '',
                      confirmedDisplayOnly: false,
                    },
                  ])
                }
                type="button"
              >
                <Plus aria-hidden="true" size={16} /> Add public sample
              </button>
            )}
          </EditorSection>

          <EditorSection number="04" title="Tracks and scoring">
            <div className="draft-tracks">
              {draft.tracks.map((track, index) => (
                <article key={`${track.id}-${index}`}>
                  <div className="draft-sample__heading">
                    <strong>Track {index + 1}</strong>
                    {draft.tracks.length > 1 && (
                      <button
                        aria-label={`Remove track ${index + 1}`}
                        className="icon-button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            tracks: current.tracks.filter(
                              (_, trackIndex) => trackIndex !== index,
                            ),
                          }))
                        }
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    )}
                  </div>
                  <div className="editor-fields">
                    <Field label="Exact track ID">
                      <input
                        onChange={(event) =>
                          updateTrack(index, 'id', event.target.value)
                        }
                        value={track.id}
                      />
                    </Field>
                    <Field label="Label">
                      <input
                        onChange={(event) =>
                          updateTrack(index, 'label', event.target.value)
                        }
                        value={track.label}
                      />
                    </Field>
                    <Field label="Description" wide>
                      <textarea
                        onChange={(event) =>
                          updateTrack(index, 'description', event.target.value)
                        }
                        value={track.description}
                      />
                    </Field>
                    <Field label="Prompt policy">
                      <textarea
                        onChange={(event) =>
                          updateTrack(index, 'promptPolicy', event.target.value)
                        }
                        value={track.promptPolicy}
                      />
                    </Field>
                    <Field label="Tool policy">
                      <textarea
                        onChange={(event) =>
                          updateTrack(index, 'toolPolicy', event.target.value)
                        }
                        value={track.toolPolicy}
                      />
                    </Field>
                    <Field label="Retry policy">
                      <input
                        onChange={(event) =>
                          updateTrack(index, 'retryPolicy', event.target.value)
                        }
                        value={track.retryPolicy}
                      />
                    </Field>
                    <Field label="Primary metric key">
                      <input
                        onChange={(event) =>
                          updateTrack(
                            index,
                            'primaryMetricKey',
                            event.target.value,
                          )
                        }
                        value={track.primaryMetricKey}
                      />
                    </Field>
                    <Field label="Metric direction">
                      <select
                        onChange={(event) =>
                          updateTrack(
                            index,
                            'metricDirection',
                            event.target.value as TrackState['metricDirection'],
                          )
                        }
                        value={track.metricDirection}
                      >
                        <option value="maximize">Higher is better</option>
                        <option value="minimize">Lower is better</option>
                      </select>
                    </Field>
                    <Field label="Scorer type">
                      <select
                        onChange={(event) =>
                          updateTrack(
                            index,
                            'scorerType',
                            event.target.value as TrackState['scorerType'],
                          )
                        }
                        value={track.scorerType}
                      >
                        <option value="exact">Exact/deterministic</option>
                        <option value="code">Code scorer</option>
                        <option value="human">Human rubric</option>
                        <option value="llm_judge">LLM judge</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </Field>
                    <Field label="Scorer version">
                      <input
                        onChange={(event) =>
                          updateTrack(
                            index,
                            'scorerVersion',
                            event.target.value,
                          )
                        }
                        value={track.scorerVersion}
                      />
                    </Field>
                  </div>
                </article>
              ))}
            </div>
            {draft.tracks.length < 8 && (
              <button
                className="button button--paper"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    tracks: [
                      ...current.tracks,
                      {
                        ...current.tracks[0],
                        id: `track-${current.tracks.length + 1}`,
                        label: `Track ${current.tracks.length + 1}`,
                      },
                    ],
                  }))
                }
                type="button"
              >
                <Plus aria-hidden="true" size={16} /> Add track
              </button>
            )}
          </EditorSection>

          <EditorSection number="05" title="Sealed-set policy">
            <div className="editor-fields">
              <Field label="Policy mode">
                <select
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sealedPolicy: {
                        ...current.sealedPolicy,
                        mode: event.target
                          .value as DraftState['sealedPolicy']['mode'],
                      },
                    }))
                  }
                  value={draft.sealedPolicy.mode}
                >
                  <option value="none">Fully open</option>
                  <option value="manual_signed">Manual signed</option>
                  <option value="author_runner">Author runner</option>
                  <option value="remote_runner">Remote runner</option>
                  <option value="managed_later">Managed later</option>
                </select>
              </Field>
              <Field label="Official item count">
                <input
                  min={1}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sealedPolicy: {
                        ...current.sealedPolicy,
                        itemCount: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      },
                    }))
                  }
                  type="number"
                  value={draft.sealedPolicy.itemCount ?? ''}
                />
              </Field>
              <Field label="Dataset digest" wide>
                <input
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sealedPolicy: {
                        ...current.sealedPolicy,
                        datasetDigest: event.target.value,
                      },
                    }))
                  }
                  placeholder="sha256:…"
                  value={draft.sealedPolicy.datasetDigest ?? ''}
                />
              </Field>
              <Field label="Rotation policy" wide>
                <textarea
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sealedPolicy: {
                        ...current.sealedPolicy,
                        rotationPolicy: event.target.value,
                      },
                    }))
                  }
                  value={draft.sealedPolicy.rotationPolicy ?? ''}
                />
              </Field>
              <Field label="Endpoint exposure caveat" wide>
                <textarea
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sealedPolicy: {
                        ...current.sealedPolicy,
                        endpointExposureNote: event.target.value,
                      },
                    }))
                  }
                  value={draft.sealedPolicy.endpointExposureNote}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection number="06" title="Method, sources, and limitations">
            <div className="editor-fields">
              <Field label="Run method" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('methodMarkdown', event.target.value)
                  }
                  value={draft.methodMarkdown}
                />
              </Field>
              <Field label="Limitations" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('limitationsMarkdown', event.target.value)
                  }
                  placeholder="- Name at least one blind spot."
                  value={draft.limitationsMarkdown}
                />
              </Field>
              <Field label="License">
                <input
                  onChange={(event) =>
                    updateDraft('license', event.target.value)
                  }
                  value={draft.license}
                />
              </Field>
              <Field label="Source repository URL">
                <input
                  onChange={(event) =>
                    updateDraft('repositoryUrl', event.target.value)
                  }
                  placeholder="https://…"
                  type="url"
                  value={draft.repositoryUrl}
                />
              </Field>
              <Field label="Write-up URL">
                <input
                  onChange={(event) =>
                    updateDraft('writeupUrl', event.target.value)
                  }
                  placeholder="https://…"
                  type="url"
                  value={draft.writeupUrl}
                />
              </Field>
              <Field label="Version changelog" wide>
                <textarea
                  onChange={(event) =>
                    updateDraft('changelogMarkdown', event.target.value)
                  }
                  value={draft.changelogMarkdown}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection number="07" title="Publish immutable version">
            <StatusBanner
              variant="warning"
              title={`Put version ${draft.proposedVersion} on the market?`}
            >
              Published versions are immutable. Corrections and changed scored
              sets require a successor version.
            </StatusBanner>
            <div className="publish-confirmations">
              {Object.entries(publishConfirmationLabels).map(([key, label]) => (
                <label className="confirmation-check" key={key}>
                  <input
                    checked={confirmations[key as keyof typeof confirmations]}
                    onChange={(event) =>
                      setConfirmations((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
            <button
              className="button button--ink button--large"
              disabled={!allConfirmed || publishing || saveState === 'saving'}
              onClick={() => void publish()}
              type="button"
            >
              {publishing ? (
                'Publishing atomically…'
              ) : (
                <>
                  <Send aria-hidden="true" size={17} /> Publish version{' '}
                  {draft.proposedVersion}
                </>
              )}
            </button>
          </EditorSection>
        </div>

        <aside className="draft-live-preview">
          <p className="eyebrow">Live card preview</p>
          <article className="market-card">
            <div
              aria-hidden="true"
              className={`awning awning--${draft.aisle}`}
            />
            <div className="market-card__body">
              <p>{aisles.find((aisle) => aisle.id === draft.aisle)?.label}</p>
              <h2>{draft.title || 'Untitled benchmark'}</h2>
              <p>
                {draft.summary || 'Your one-sentence summary appears here.'}
              </p>
              <div className="price-tags">
                <span className="price-tag">v{draft.proposedVersion}</span>
                <span className="price-tag">
                  {draft.sealedPolicy.itemCount ?? 0} sealed items
                </span>
                <span className="price-tag">
                  {draft.tracks.length} track
                  {draft.tracks.length === 1 ? '' : 's'}
                </span>
              </div>
              <footer className="market-card__footer">
                by <strong>@{initial.owner.handle}</strong>
              </footer>
            </div>
          </article>
          <div className="preview-checklist">
            <p>
              <Check aria-hidden="true" size={15} /> {samples.length} public
              samples
            </p>
            <p>
              <Check aria-hidden="true" size={15} /> {draft.tracks.length} exact
              track IDs
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function EditorSection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="editor-section">
      <header>
        <span>{number}</span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  )
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={wide ? 'editor-field--wide' : undefined}>
      {label}
      {children}
    </label>
  )
}
