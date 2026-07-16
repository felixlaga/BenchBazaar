import { useNavigate } from '@tanstack/react-router'
import type { FunctionReturnType } from 'convex/server'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertTriangle,
  Check,
  FileCheck2,
  Plus,
  ReceiptText,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type Options = FunctionReturnType<typeof api.receipts.submissionOptions>
type MetricState = {
  key: string
  label: string
  value: string
  unit: string
  direction: 'maximize' | 'minimize' | 'neutral'
}
type ArtifactState = { label: string; url: string; digest: string }

const endpointOptions = [
  {
    value: 'trusted_local_model',
    label: 'Trusted local model · prompts stayed in the operator environment',
  },
  {
    value: 'operator_provider_account',
    label: 'Operator provider account · provider may retain prompts',
  },
  {
    value: 'site_provider_account',
    label: 'Site provider account · managed execution disclosure',
  },
  {
    value: 'requester_endpoint',
    label: 'Requester endpoint · requester infrastructure saw prompts',
  },
  {
    value: 'unknown_or_legacy',
    label: 'Unknown or legacy exposure',
  },
] as const

function toDateTimeLocal(timestamp: number) {
  const offset = new Date(timestamp).getTimezoneOffset() * 60_000
  return new Date(timestamp - offset).toISOString().slice(0, 16)
}

function errorMessage(cause: unknown) {
  if (!(cause instanceof Error)) return 'Could not submit this receipt.'
  const match = cause.message.match(/"code":"([A-Z0-9_]+)"/)
  const code = match?.[1]
  const messages: Record<string, string> = {
    INVALID_ARTIFACT_URL:
      'Artifact links must use HTTPS and cannot contain credentials.',
    PRIMARY_METRIC_REQUIRED:
      'The metrics must include the selected track’s exact primary metric key.',
    RECEIPT_NOT_CORRECTABLE:
      'This receipt cannot be corrected by this account or already has a successor.',
    INVALID_MODEL_ID:
      'Use a stable exact model ID containing letters, numbers, dots, slashes, colons, underscores, or hyphens.',
  }
  return (code && messages[code]) || cause.message
}

export function ReceiptSubmissionForm({
  initialSlug,
  initialVersion,
  initialTrack,
  supersedesReceiptId,
}: {
  initialSlug?: string | undefined
  initialVersion?: string | undefined
  initialTrack?: string | undefined
  supersedesReceiptId?: string | undefined
}) {
  const options = useQuery(api.receipts.submissionOptions, {
    ...(supersedesReceiptId ? { supersedesReceiptId } : {}),
  })
  if (options === undefined) {
    return <p className="save-state">Loading exact versions and models…</p>
  }
  if (options.benchmarks.length === 0) {
    return (
      <StatusBanner variant="warning" title="No published versions available">
        A benchmark version must be published before it can receive a result.
      </StatusBanner>
    )
  }
  return (
    <ReceiptSubmissionEditor
      initialSlug={initialSlug}
      initialTrack={initialTrack}
      initialVersion={initialVersion}
      key={options.correction?.receiptId ?? 'new-receipt'}
      options={options}
    />
  )
}

function ReceiptSubmissionEditor({
  options,
  initialSlug,
  initialVersion,
  initialTrack,
}: {
  options: Options
  initialSlug?: string | undefined
  initialVersion?: string | undefined
  initialTrack?: string | undefined
}) {
  const correction = options.correction
  const versions = useMemo(
    () =>
      options.benchmarks.flatMap((benchmark) =>
        benchmark.versions.map((version) => ({ ...version, benchmark })),
      ),
    [options.benchmarks],
  )
  const preferredVersion =
    versions.find(
      (entry) =>
        entry.id === correction?.benchmarkVersionId ||
        (entry.benchmark.slug === initialSlug &&
          (!initialVersion || entry.version === initialVersion)),
    ) ?? versions[0]
  const preferredTrack =
    preferredVersion.tracks.find(
      (track) => track.id === (correction?.trackId ?? initialTrack),
    ) ?? preferredVersion.tracks[0]
  const [versionId, setVersionId] = useState(String(preferredVersion.id))
  const [trackId, setTrackId] = useState(preferredTrack.id)
  const [modelId, setModelId] = useState(correction?.exactModelId ?? '')
  const [modelProvider, setModelProvider] = useState(
    correction?.modelProvider ?? '',
  )
  const [modelDisplayName, setModelDisplayName] = useState(
    correction?.modelDisplayName ?? '',
  )
  const [metrics, setMetrics] = useState<Array<MetricState>>(() =>
    correction
      ? correction.metrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: String(metric.value),
          unit: metric.unit ?? '',
          direction: metric.direction,
        }))
      : [
          {
            key: preferredTrack.primaryMetricKey,
            label: preferredTrack.primaryMetricKey,
            value: '',
            unit: '%',
            direction: preferredTrack.metricDirection,
          },
        ],
  )
  const [itemCount, setItemCount] = useState(
    String(correction?.itemCount ?? preferredVersion.itemCount ?? ''),
  )
  const [scorerVersion, setScorerVersion] = useState(
    correction?.scorerVersion ?? preferredTrack.scorerVersion,
  )
  const [manifestDigest, setManifestDigest] = useState(
    correction?.manifestDigest ?? preferredVersion.manifestDigest,
  )
  const [datasetDigest, setDatasetDigest] = useState(
    correction?.datasetDigest ?? preferredVersion.datasetDigest ?? '',
  )
  const [generatorDigest, setGeneratorDigest] = useState(
    correction?.generatorDigest ?? preferredVersion.generatorDigest ?? '',
  )
  const [configurationSummary, setConfigurationSummary] = useState(
    correction?.configurationSummary ?? '',
  )
  const [endpointExposure, setEndpointExposure] = useState<
    (typeof endpointOptions)[number]['value']
  >(correction?.endpointExposure ?? 'operator_provider_account')
  const [completedAt, setCompletedAt] = useState(
    toDateTimeLocal(correction?.completedAt ?? Date.now()),
  )
  const [artifacts, setArtifacts] = useState<Array<ArtifactState>>(() =>
    (correction?.artifactRefs ?? []).map((artifact) => ({
      label: artifact.label,
      url: artifact.url,
      digest: artifact.digest ?? '',
    })),
  )
  const [notes, setNotes] = useState(correction?.notesMarkdown ?? '')
  const [confirmations, setConfirmations] = useState({
    aggregateOnly: false,
    noHiddenContent: false,
    publicEvidenceOnly: false,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitReceipt = useMutation(api.receipts.submitManual)
  const navigate = useNavigate()

  const selectedVersion =
    versions.find((entry) => String(entry.id) === versionId) ?? versions[0]
  const selectedTrack =
    selectedVersion.tracks.find((track) => track.id === trackId) ??
    selectedVersion.tracks[0]

  function chooseVersion(nextVersionId: string) {
    const next = versions.find((entry) => String(entry.id) === nextVersionId)
    if (!next || correction) return
    const track = next.tracks[0]
    setVersionId(String(next.id))
    setTrackId(track.id)
    setMetrics([
      {
        key: track.primaryMetricKey,
        label: track.primaryMetricKey,
        value: '',
        unit: '%',
        direction: track.metricDirection,
      },
    ])
    setItemCount(String(next.itemCount ?? ''))
    setScorerVersion(track.scorerVersion)
    setManifestDigest(next.manifestDigest)
    setDatasetDigest(next.datasetDigest ?? '')
    setGeneratorDigest(next.generatorDigest ?? '')
  }

  function chooseTrack(nextTrackId: string) {
    if (correction) return
    const track = selectedVersion.tracks.find(
      (candidate) => candidate.id === nextTrackId,
    )
    if (!track) return
    setTrackId(track.id)
    setScorerVersion(track.scorerVersion)
    setMetrics([
      {
        key: track.primaryMetricKey,
        label: track.primaryMetricKey,
        value: '',
        unit: '%',
        direction: track.metricDirection,
      },
    ])
  }

  function matchKnownModel(value: string) {
    setModelId(value)
    const known = options.models.find(
      (model) => model.canonicalId === value.trim().toLowerCase(),
    )
    if (known) {
      setModelProvider(known.provider)
      setModelDisplayName(known.displayName)
    }
  }

  function updateMetric(index: number, patch: Partial<MetricState>) {
    setMetrics((current) =>
      current.map((metric, metricIndex) =>
        metricIndex === index ? { ...metric, ...patch } : metric,
      ),
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!Object.values(confirmations).every(Boolean)) {
      setError('Confirm all three receipt safety statements before submitting.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await submitReceipt({
        benchmarkVersionId: versionId as Id<'benchmarkVersions'>,
        trackId: selectedTrack.id,
        exactModelId: modelId,
        modelProvider,
        modelDisplayName,
        metrics: metrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: Number(metric.value),
          ...(metric.unit.trim() ? { unit: metric.unit.trim() } : {}),
          direction: metric.direction,
        })),
        itemCount: Number(itemCount),
        scorerVersion,
        manifestDigest,
        ...(datasetDigest.trim()
          ? { datasetDigest: datasetDigest.trim() }
          : {}),
        ...(generatorDigest.trim()
          ? { generatorDigest: generatorDigest.trim() }
          : {}),
        configurationSummary,
        endpointExposure,
        completedAt: new Date(completedAt).getTime(),
        artifactRefs: artifacts
          .filter((artifact) => artifact.url.trim())
          .map((artifact) => ({
            label: artifact.label,
            url: artifact.url,
            ...(artifact.digest.trim()
              ? { digest: artifact.digest.trim() }
              : {}),
          })),
        ...(notes.trim() ? { notesMarkdown: notes.trim() } : {}),
        ...(correction ? { supersedesReceiptId: correction.receiptId } : {}),
        confirmations: {
          aggregateOnly: true,
          noHiddenContent: true,
          publicEvidenceOnly: true,
        },
      })
      await navigate({
        to: '/receipts/$receiptId',
        params: { receiptId: result.receiptId },
      })
    } catch (cause) {
      setError(errorMessage(cause))
      setPending(false)
    }
  }

  return (
    <form className="receipt-form" onSubmit={(event) => void submit(event)}>
      {correction && (
        <StatusBanner variant="warning" title="Append-only correction">
          This creates a new receipt and marks {correction.receiptId} as
          superseded. The original remains public and unchanged.
        </StatusBanner>
      )}

      <section className="receipt-form__section">
        <div className="receipt-form__section-heading">
          <span>01</span>
          <div>
            <h2>Exact benchmark contract</h2>
            <p>One immutable version and one declared track.</p>
          </div>
        </div>
        <div className="editor-fields">
          <label className="editor-field--wide">
            Benchmark version
            <select
              disabled={Boolean(correction)}
              onChange={(event) => chooseVersion(event.target.value)}
              value={versionId}
            >
              {versions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.benchmark.title} · v{entry.version} · {entry.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Track
            <select
              disabled={Boolean(correction)}
              onChange={(event) => chooseTrack(event.target.value)}
              value={selectedTrack.id}
            >
              {selectedVersion.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label} ({track.id})
                </option>
              ))}
            </select>
          </label>
          <label>
            Completed at
            <input
              max={toDateTimeLocal(Date.now() + 5 * 60_000)}
              onChange={(event) => setCompletedAt(event.target.value)}
              required
              type="datetime-local"
              value={completedAt}
            />
          </label>
          <label className="editor-field--wide">
            Submitted manifest digest
            <input
              onChange={(event) => setManifestDigest(event.target.value)}
              required
              value={manifestDigest}
            />
            <small>
              Expected for v{selectedVersion.version}:{' '}
              <code>{selectedVersion.manifestDigest}</code>
            </small>
          </label>
        </div>
      </section>

      <section className="receipt-form__section">
        <div className="receipt-form__section-heading">
          <span>02</span>
          <div>
            <h2>Canonical model identity</h2>
            <p>The exact submitted string is retained even when normalized.</p>
          </div>
        </div>
        <div className="editor-fields">
          <label className="editor-field--wide">
            Exact model ID
            <input
              disabled={Boolean(correction)}
              list="canonical-models"
              onChange={(event) => matchKnownModel(event.target.value)}
              placeholder="provider/model-2026-07-01"
              required
              value={modelId}
            />
            <datalist id="canonical-models">
              {options.models.map((model) => (
                <option key={model.canonicalId} value={model.canonicalId}>
                  {model.displayName} · {model.provider}
                </option>
              ))}
            </datalist>
          </label>
          <label>
            Provider
            <input
              disabled={Boolean(correction)}
              onChange={(event) => setModelProvider(event.target.value)}
              required
              value={modelProvider}
            />
          </label>
          <label>
            Public display name
            <input
              disabled={Boolean(correction)}
              onChange={(event) => setModelDisplayName(event.target.value)}
              required
              value={modelDisplayName}
            />
          </label>
        </div>
      </section>

      <section className="receipt-form__section">
        <div className="receipt-form__section-heading">
          <span>03</span>
          <div>
            <h2>Aggregate result</h2>
            <p>No per-item prompts, answers, outputs, or hidden fixtures.</p>
          </div>
        </div>
        <div className="receipt-metrics-editor">
          {metrics.map((metric, index) => (
            <div className="receipt-metric-row" key={`${index}-${metric.key}`}>
              <label>
                Metric key
                <input
                  disabled={index === 0}
                  onChange={(event) =>
                    updateMetric(index, { key: event.target.value })
                  }
                  required
                  value={metric.key}
                />
              </label>
              <label>
                Label
                <input
                  onChange={(event) =>
                    updateMetric(index, { label: event.target.value })
                  }
                  required
                  value={metric.label}
                />
              </label>
              <label>
                Value
                <input
                  onChange={(event) =>
                    updateMetric(index, { value: event.target.value })
                  }
                  required
                  step="any"
                  type="number"
                  value={metric.value}
                />
              </label>
              <label>
                Unit
                <input
                  onChange={(event) =>
                    updateMetric(index, { unit: event.target.value })
                  }
                  placeholder="%"
                  value={metric.unit}
                />
              </label>
              {index > 0 && (
                <button
                  aria-label={`Remove metric ${metric.label}`}
                  className="icon-button"
                  onClick={() =>
                    setMetrics((current) =>
                      current.filter((_, metricIndex) => metricIndex !== index),
                    )
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              )}
            </div>
          ))}
          <button
            className="text-button"
            disabled={metrics.length >= 10}
            onClick={() =>
              setMetrics((current) => [
                ...current,
                {
                  key: '',
                  label: '',
                  value: '',
                  unit: '',
                  direction: 'neutral',
                },
              ])
            }
            type="button"
          >
            <Plus aria-hidden="true" size={16} /> Add secondary metric
          </button>
        </div>
        <div className="editor-fields">
          <label>
            Evaluated item count
            <input
              min="1"
              onChange={(event) => setItemCount(event.target.value)}
              required
              type="number"
              value={itemCount}
            />
            <small>
              Declared set size: {selectedVersion.itemCount ?? 'none'}.
            </small>
          </label>
          <label>
            Scorer version used
            <input
              onChange={(event) => setScorerVersion(event.target.value)}
              required
              value={scorerVersion}
            />
            <small>Track expects {selectedTrack.scorerVersion}.</small>
          </label>
          <label>
            Dataset digest
            <input
              onChange={(event) => setDatasetDigest(event.target.value)}
              value={datasetDigest}
            />
          </label>
          <label>
            Generator digest
            <input
              onChange={(event) => setGeneratorDigest(event.target.value)}
              value={generatorDigest}
            />
          </label>
          <label className="editor-field--wide">
            Public configuration summary
            <textarea
              maxLength={4000}
              minLength={20}
              onChange={(event) => setConfigurationSummary(event.target.value)}
              placeholder="Prompt template, temperature, retry behavior, tool configuration, and other public run settings. Do not paste test items."
              required
              value={configurationSummary}
            />
          </label>
          <label className="editor-field--wide">
            Endpoint exposure
            <select
              onChange={(event) =>
                setEndpointExposure(
                  event.target.value as typeof endpointExposure,
                )
              }
              value={endpointExposure}
            >
              {endpointOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="receipt-form__section">
        <div className="receipt-form__section-heading">
          <span>04</span>
          <div>
            <h2>Public evidence</h2>
            <p>
              HTTPS links are labeled artifact-linked without claiming the
              linked content is correct.
            </p>
          </div>
        </div>
        {artifacts.map((artifact, index) => (
          <div className="artifact-editor" key={index}>
            <label>
              Label
              <input
                onChange={(event) =>
                  setArtifacts((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, label: event.target.value }
                        : entry,
                    ),
                  )
                }
                required
                value={artifact.label}
              />
            </label>
            <label>
              Public HTTPS URL
              <input
                onChange={(event) =>
                  setArtifacts((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, url: event.target.value }
                        : entry,
                    ),
                  )
                }
                required
                type="url"
                value={artifact.url}
              />
            </label>
            <label>
              Optional digest
              <input
                onChange={(event) =>
                  setArtifacts((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, digest: event.target.value }
                        : entry,
                    ),
                  )
                }
                value={artifact.digest}
              />
            </label>
            <button
              aria-label={`Remove artifact ${artifact.label}`}
              className="icon-button"
              onClick={() =>
                setArtifacts((current) =>
                  current.filter((_, entryIndex) => entryIndex !== index),
                )
              }
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
          </div>
        ))}
        <button
          className="text-button"
          disabled={artifacts.length >= 3}
          onClick={() =>
            setArtifacts((current) => [
              ...current,
              { label: 'Public run artifact', url: '', digest: '' },
            ])
          }
          type="button"
        >
          <Plus aria-hidden="true" size={16} /> Add public artifact
        </button>
        <label className="receipt-notes">
          Public notes
          <textarea
            maxLength={2000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional aggregate-level context or caveats."
            value={notes}
          />
        </label>
      </section>

      <section className="receipt-confirmation">
        <AlertTriangle aria-hidden="true" size={28} />
        <div>
          <p className="eyebrow">Before the receipt becomes public</p>
          <h2>Confirm the evidence boundary.</h2>
          {[
            [
              'aggregateOnly',
              'This submission contains aggregate metrics, not per-item outputs or hidden answers.',
            ],
            [
              'noHiddenContent',
              'I did not paste hidden prompts, private fixtures, credentials, or provider secrets.',
            ],
            [
              'publicEvidenceOnly',
              'Every artifact link is deliberately public and safe to display.',
            ],
          ].map(([key, label]) => (
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
              <Check aria-hidden="true" size={17} />
              {label}
            </label>
          ))}
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}
      <div className="receipt-form__submit">
        <div>
          <FileCheck2 aria-hidden="true" size={21} />
          <p>
            The server assigns self-reported or artifact-linked evidence and
            performs compatibility validation. This form cannot assign trusted
            status.
          </p>
        </div>
        <button
          className="button button--ink button--large"
          disabled={pending}
          type="submit"
        >
          <ReceiptText aria-hidden="true" size={18} />
          {pending
            ? 'Writing append-only receipt…'
            : correction
              ? 'Publish successor receipt'
              : 'Publish manual receipt'}
        </button>
      </div>
    </form>
  )
}
