import { z } from 'zod'

export const PROTOCOL_VERSION = '1.0.0'

const digest = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/, 'Expected a lowercase sha256 digest.')
const identifier = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:/-]+$/)
const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)

export const manifestSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    benchmark: z
      .object({
        publicRef: identifier,
        version: semver,
        manifestDigest: digest,
      })
      .strict(),
    tracks: z
      .array(
        z
          .object({
            id: identifier,
            primaryMetricKey: identifier,
            scorerVersion: identifier,
            itemCount: z.number().int().positive().max(1_000_000),
            datasetDigest: digest.optional(),
            generatorDigest: digest.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(64),
  })
  .strict()
  .superRefine((manifest, context) => {
    const trackIds = new Set()
    for (const [index, track] of manifest.tracks.entries()) {
      if (trackIds.has(track.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate track ID: ${track.id}`,
          path: ['tracks', index, 'id'],
        })
      }
      trackIds.add(track.id)
    }
  })

const metricSchema = z
  .object({
    key: identifier,
    value: z.number().finite(),
    unit: z.string().min(1).max(40).optional(),
  })
  .strict()

export const unsignedReceiptSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    receiptId: identifier,
    runnerId: identifier,
    nonce: z.string().min(16).max(160),
    benchmarkPublicRef: identifier,
    benchmarkVersion: semver,
    trackId: identifier,
    modelId: z.string().min(1).max(240),
    metrics: z.array(metricSchema).min(1).max(64),
    primaryMetricKey: identifier,
    primaryMetricValue: z.number().finite(),
    itemCount: z.number().int().positive().max(1_000_000),
    scorerVersion: identifier,
    configurationDigest: digest,
    manifestDigest: digest,
    datasetDigest: digest.optional(),
    generatorDigest: digest.optional(),
    completedAt: z.string().datetime({ offset: true }),
    endpointExposure: z.enum([
      'trusted_local_model',
      'operator_provider_account',
      'site_provider_account',
      'requester_endpoint',
    ]),
  })
  .strict()
  .superRefine((receipt, context) => {
    const metric = receipt.metrics.find(
      (candidate) => candidate.key === receipt.primaryMetricKey,
    )
    if (!metric || metric.value !== receipt.primaryMetricValue) {
      context.addIssue({
        code: 'custom',
        message: 'Primary metric key and value must match a metrics entry.',
        path: ['primaryMetricValue'],
      })
    }
  })

export const signedReceiptEnvelopeSchema = z
  .object({
    payload: unsignedReceiptSchema,
    algorithm: z.literal('Ed25519'),
    signature: z
      .string()
      .min(80)
      .max(120)
      .regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict()

function assertUnicodeScalarString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError(
          'Canonical JSON cannot contain lone Unicode surrogates.',
        )
      }
      index += 1
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError(
        'Canonical JSON cannot contain lone Unicode surrogates.',
      )
    }
  }
}

export function canonicalize(value) {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') {
    assertUnicodeScalarString(value)
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON cannot contain non-finite numbers.')
    }
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`
  }
  if (typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value)
    const prototype = Object.getPrototypeOf(record)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Canonical JSON objects must be plain objects.')
    }
    return `{${Object.keys(record)
      .sort()
      .map((key) => {
        assertUnicodeScalarString(key)
        const item = record[key]
        if (item === undefined) {
          throw new TypeError('Canonical JSON cannot contain undefined values.')
        }
        return `${JSON.stringify(key)}:${canonicalize(item)}`
      })
      .join(',')}}`
  }
  throw new TypeError(`Unsupported canonical JSON value: ${typeof value}`)
}

export function utf8(value) {
  return new TextEncoder().encode(value)
}

export function bytesToBase64Url(value) {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

export function base64UrlToBytes(value) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export async function sha256Hex(value) {
  const bytes = typeof value === 'string' ? utf8(value) : value
  const digestBytes = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digestBytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function publicKeyFingerprint(spkiBase64Url) {
  return `ed25519:${await sha256Hex(base64UrlToBytes(spkiBase64Url))}`
}

export async function verifySignedReceipt(envelope, publicKeySpkiBase64Url) {
  const parsed = signedReceiptEnvelopeSchema.parse(envelope)
  const key = await crypto.subtle.importKey(
    'spki',
    base64UrlToBytes(publicKeySpkiBase64Url),
    { name: 'Ed25519' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    { name: 'Ed25519' },
    key,
    base64UrlToBytes(parsed.signature),
    utf8(canonicalize(parsed.payload)),
  )
}

export const manifestJsonSchema = Object.freeze({
  ...z.toJSONSchema(manifestSchema),
  $id: 'https://benchbazaar.example/schemas/manifest-1.0.0.json',
})

export const receiptJsonSchema = Object.freeze({
  ...z.toJSONSchema(signedReceiptEnvelopeSchema),
  $id: 'https://benchbazaar.example/schemas/receipt-1.0.0.json',
})
