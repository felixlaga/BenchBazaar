import { useNavigate } from '@tanstack/react-router'
import type { FunctionReturnType } from 'convex/server'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, Save, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type DraftFormState = {
  title: string
  summary: string
  explanation: string
  repositoryUrl: string
}

type Aisle =
  | 'reasoning-row'
  | 'code-corner'
  | 'agent-alley'
  | 'vision-arcade'
  | 'language-lane'
  | 'robustness-booth'
  | 'oddities-tent'

type SampleState = {
  inputMarkdown: string
  expectedMarkdown: string
}

const publishConfirmationLabels = {
  samples:
    'These three samples are intentionally public and excluded from official scoring.',
  noHiddenItems:
    'I did not paste hidden questions, answers, fixtures, credentials, or signing keys.',
  rights: 'I have the right to publish this explanation and these samples.',
  immutable:
    'I understand that publishing creates an immutable version; corrections require a successor.',
} as const

function automaticSlug(title: string) {
  return title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

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
  const [draft, setDraft] = useState<DraftFormState>(() => ({
    title: initial.title,
    summary: initial.summary,
    explanation: initial.methodMarkdown,
    repositoryUrl: initial.repositoryUrl ?? '',
  }))
  const [samples, setSamples] = useState<Array<SampleState>>(() =>
    Array.from({ length: 3 }, (_, index) => ({
      inputMarkdown: initial.samples[index]?.inputMarkdown ?? '',
      expectedMarkdown: initial.samples[index]?.expectedMarkdown ?? '',
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
    const initialSealedPolicy = initial.baseVersionId
      ? initial.sealedPolicy
      : {
          mode: 'none' as const,
          endpointExposureNote: initial.sealedPolicy.endpointExposureNote,
        }

    return {
      proposedVersion: initial.proposedVersion || '1.0.0',
      slug: initial.slug,
      title: draft.title,
      summary: draft.summary,
      aisle: initial.aisle as Aisle,
      tags: initial.tags,
      modalities: initial.modalities.length ? initial.modalities : ['text'],
      capabilityStatement: draft.summary,
      whyItMatters: initial.whyItMatters,
      intendedUse: initial.intendedUse,
      supportedClaims: initial.supportedClaims,
      unsupportedClaims: initial.unsupportedClaims,
      methodMarkdown: draft.explanation,
      limitationsMarkdown: '',
      ...(initial.license ? { license: initial.license } : {}),
      ...(draft.repositoryUrl.trim()
        ? { repositoryUrl: draft.repositoryUrl.trim() }
        : {}),
      ...(initial.writeupUrl ? { writeupUrl: initial.writeupUrl } : {}),
      sealedPolicy: initialSealedPolicy,
      tracks: initial.tracks,
      changelogMarkdown:
        initial.changelogMarkdown.trim() ||
        (initial.baseVersionId ? 'Updated version.' : 'Initial version.'),
    }
  }

  function mutationSamples() {
    return samples.map((sample, index) => ({
      publicSampleId: `sample-${index + 1}`,
      inputMarkdown: sample.inputMarkdown,
      ...(sample.expectedMarkdown.trim()
        ? { expectedMarkdown: sample.expectedMarkdown }
        : {}),
      confirmedDisplayOnly: true,
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

  function updateDraft<TKey extends keyof DraftFormState>(
    key: TKey,
    value: DraftFormState[TKey],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateSample(index: number, key: keyof SampleState, value: string) {
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
  const contentComplete =
    draft.title.trim().length >= 3 &&
    draft.summary.trim().length >= 20 &&
    draft.explanation.trim().length >= 30 &&
    samples.every((sample) => sample.inputMarkdown.trim().length > 0)
  const previewSlug = initial.baseVersionId
    ? initial.slug
    : automaticSlug(draft.title)

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
        <AlertTriangle aria-hidden="true" size={18} /> Everything entered here
        may be published and indexed. Never paste hidden benchmark material or
        credentials.
      </StatusBanner>

      <div className="draft-editor__layout">
        <div className="draft-editor__forms">
          <EditorSection number="01" title="Describe the benchmark">
            <div className="editor-fields">
              <Field label="Title" wide>
                <input
                  maxLength={100}
                  minLength={3}
                  onChange={(event) => updateDraft('title', event.target.value)}
                  placeholder="Calendar Gymnastics"
                  value={draft.title}
                />
              </Field>
              <Field label="Automatic slug" wide>
                <output>
                  <code>{previewSlug || 'generated-from-title'}</code>
                </output>
              </Field>
              <Field label="Card description · two or three sentences" wide>
                <textarea
                  maxLength={500}
                  minLength={20}
                  onChange={(event) =>
                    updateDraft('summary', event.target.value)
                  }
                  placeholder="Explain what the benchmark measures in the short description shown on cards."
                  rows={4}
                  value={draft.summary}
                />
              </Field>
              <Field label="Full explanation · what the benchmark does" wide>
                <textarea
                  maxLength={8000}
                  minLength={30}
                  onChange={(event) =>
                    updateDraft('explanation', event.target.value)
                  }
                  placeholder="Describe how the benchmark works and what a result means."
                  rows={10}
                  value={draft.explanation}
                />
              </Field>
              <Field label="Public GitHub repository · optional" wide>
                <input
                  inputMode="url"
                  onChange={(event) =>
                    updateDraft('repositoryUrl', event.target.value)
                  }
                  placeholder="https://github.com/owner/repository"
                  type="url"
                  value={draft.repositoryUrl}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection number="02" title="Add three public samples">
            <p>
              Sample IDs are generated automatically. These examples are public
              and never count toward the official score.
            </p>
            {samples.map((sample, index) => (
              <article className="sample-editor" key={index}>
                <header>
                  <strong>Sample {index + 1}</strong>
                  <code>sample-{index + 1}</code>
                </header>
                <div className="editor-fields">
                  <Field label="Public sample input" wide>
                    <textarea
                      maxLength={4000}
                      onChange={(event) =>
                        updateSample(index, 'inputMarkdown', event.target.value)
                      }
                      required
                      rows={5}
                      value={sample.inputMarkdown}
                    />
                  </Field>
                  <Field label="Expected behavior or answer · optional" wide>
                    <textarea
                      maxLength={4000}
                      onChange={(event) =>
                        updateSample(
                          index,
                          'expectedMarkdown',
                          event.target.value,
                        )
                      }
                      rows={4}
                      value={sample.expectedMarkdown}
                    />
                  </Field>
                </div>
              </article>
            ))}
          </EditorSection>

          <EditorSection number="03" title="Review and publish">
            <StatusBanner
              variant="warning"
              title={`Publish version ${initial.proposedVersion || '1.0.0'}?`}
            >
              Version, track, scorer settings, identifiers, and the initial
              changelog are managed automatically.
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
              disabled={
                !allConfirmed ||
                !contentComplete ||
                publishing ||
                saveState === 'saving'
              }
              onClick={() => void publish()}
              type="button"
            >
              <Send aria-hidden="true" size={17} />{' '}
              {publishing
                ? 'Publishing atomically…'
                : `Publish version ${initial.proposedVersion || '1.0.0'}`}
            </button>
          </EditorSection>
        </div>

        <aside className="draft-live-preview">
          <p className="eyebrow">Card preview</p>
          <article className="market-card">
            <div aria-hidden="true" className="awning awning--oddities-tent" />
            <div className="market-card__body">
              <h2>{draft.title || 'Untitled benchmark'}</h2>
              <p>
                {draft.summary ||
                  'The short card description will appear here.'}
              </p>
              <div className="price-tags">
                <span className="price-tag">
                  v{initial.proposedVersion || '1.0.0'}
                </span>
                <span className="price-tag">3 public samples</span>
              </div>
              <footer className="market-card__footer">
                by <strong>@{initial.owner.handle}</strong>
              </footer>
            </div>
          </article>
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
      <span>{label}</span>
      {children}
    </label>
  )
}
