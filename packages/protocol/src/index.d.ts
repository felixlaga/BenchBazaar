import type { z } from 'zod'

export const PROTOCOL_VERSION: '1.0.0'
export const manifestSchema: z.ZodType<BenchmarkManifest>
export const unsignedReceiptSchema: z.ZodType<UnsignedReceipt>
export const signedReceiptEnvelopeSchema: z.ZodType<SignedReceiptEnvelope>
export const manifestJsonSchema: Readonly<Record<string, unknown>>
export const receiptJsonSchema: Readonly<Record<string, unknown>>

export type ProtocolMetric = {
  key: string
  value: number
  unit?: string
}

export type BenchmarkManifest = {
  protocolVersion: '1.0.0'
  benchmark: {
    publicRef: string
    version: string
    manifestDigest: string
  }
  tracks: Array<{
    id: string
    primaryMetricKey: string
    scorerVersion: string
    itemCount: number
    datasetDigest?: string
    generatorDigest?: string
  }>
}

export type UnsignedReceipt = {
  protocolVersion: '1.0.0'
  receiptId: string
  runnerId: string
  nonce: string
  benchmarkPublicRef: string
  benchmarkVersion: string
  trackId: string
  modelId: string
  metrics: ProtocolMetric[]
  primaryMetricKey: string
  primaryMetricValue: number
  itemCount: number
  scorerVersion: string
  configurationDigest: string
  manifestDigest: string
  datasetDigest?: string
  generatorDigest?: string
  completedAt: string
  endpointExposure:
    | 'trusted_local_model'
    | 'operator_provider_account'
    | 'site_provider_account'
    | 'requester_endpoint'
}

export type SignedReceiptEnvelope = {
  payload: UnsignedReceipt
  algorithm: 'Ed25519'
  signature: string
}

export function canonicalize(value: unknown): string
export function utf8(value: string): Uint8Array
export function bytesToBase64Url(value: Uint8Array): string
export function base64UrlToBytes(value: string): Uint8Array
export function sha256Hex(value: string | Uint8Array): Promise<string>
export function publicKeyFingerprint(spkiBase64Url: string): Promise<string>
export function verifySignedReceipt(
  envelope: SignedReceiptEnvelope,
  publicKeySpkiBase64Url: string,
): Promise<boolean>
