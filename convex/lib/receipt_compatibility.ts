import type { Doc } from '../_generated/dataModel'

export function getReceiptCompatibilityIssues({
  version,
  model,
  trackId,
  primaryMetricKey,
  scorerVersion,
  manifestDigest,
  datasetDigest,
  generatorDigest,
  itemCount,
}: {
  version: Doc<'benchmarkVersions'>
  model: Doc<'models'>
  trackId: string
  primaryMetricKey: string
  scorerVersion: string
  manifestDigest: string
  datasetDigest?: string | undefined
  generatorDigest?: string | undefined
  itemCount: number
}) {
  const track = version.tracks.find((candidate) => candidate.id === trackId)

  return [
    ...(track ? [] : ['track is not declared by this exact version']),
    ...(track && track.primaryMetricKey !== primaryMetricKey
      ? ['primary metric does not match the track']
      : []),
    ...(track && track.scorerVersion !== scorerVersion
      ? ['scorer version does not match the track']
      : []),
    ...(version.manifestDigest !== manifestDigest
      ? ['manifest digest does not match the exact version']
      : []),
    ...(version.sealedPolicy.itemCount !== undefined &&
    version.sealedPolicy.itemCount !== itemCount
      ? ['item count does not match the disclosed sealed-set size']
      : []),
    ...(version.sealedPolicy.datasetDigest &&
    version.sealedPolicy.datasetDigest !== datasetDigest
      ? ['dataset digest does not match the exact version']
      : []),
    ...(version.sealedPolicy.generatorDigest &&
    version.sealedPolicy.generatorDigest !== generatorDigest
      ? ['generator digest does not match the exact version']
      : []),
    ...(model.status === 'disputed_identity'
      ? ['model identity is ambiguous or disputed']
      : []),
  ]
}

export function hasCompatibleReceiptState(receipt: Doc<'receipts'>) {
  return (
    receipt.status === 'valid' && receipt.compatibilityStatus !== 'incompatible'
  )
}
