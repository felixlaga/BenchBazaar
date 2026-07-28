import {
  base64UrlToBytes,
  bytesToBase64Url,
  canonicalize,
  manifestJsonSchema,
  manifestSchema,
  publicKeyFingerprint,
  receiptJsonSchema,
  signedReceiptEnvelopeSchema,
  unsignedReceiptSchema,
  verifySignedReceipt,
} from '@benchbazaar/protocol'
import { generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'

const digest = `sha256:${'a'.repeat(64)}`
const receipt = {
  protocolVersion: '1.0.0' as const,
  receiptId: 'BBR-TEST-0001',
  runnerId: 'runner-test',
  nonce: 'nonce-1234567890abcdef',
  benchmarkPublicRef: 'benchmark:test',
  benchmarkVersion: '1.0.0',
  trackId: 'default',
  modelId: 'provider/model-1',
  metrics: [{ key: 'accuracy', value: 0.91 }],
  primaryMetricKey: 'accuracy',
  primaryMetricValue: 0.91,
  itemCount: 100,
  scorerVersion: 'scorer-1',
  configurationDigest: digest,
  manifestDigest: digest,
  completedAt: '2026-07-28T12:00:00.000Z',
  endpointExposure: 'trusted_local_model' as const,
}

describe('protocol', () => {
  it('canonicalizes object keys and rejects non-finite numbers', () => {
    expect(canonicalize({ z: 1, a: ['é', true] })).toBe(
      '{"a":["é",true],"z":1}',
    )
    expect(canonicalize({ minusZero: -0, number: 1e30 })).toBe(
      '{"minusZero":0,"number":1e+30}',
    )
    expect(() => canonicalize({ value: Number.NaN })).toThrow('non-finite')
    expect(() => canonicalize('\ud800')).toThrow('Unicode surrogates')
    expect(() => canonicalize(new Date())).toThrow('plain objects')
  })

  it('exports complete strict JSON Schemas', () => {
    expect(manifestJsonSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      properties: {
        tracks: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
          },
        },
      },
    })
    expect(receiptJsonSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      properties: {
        payload: {
          type: 'object',
          additionalProperties: false,
          properties: {
            receiptId: { type: 'string' },
            metrics: { type: 'array' },
          },
        },
      },
    })
  })

  it('validates manifests and exact primary metrics', () => {
    expect(
      manifestSchema.parse({
        protocolVersion: '1.0.0',
        benchmark: {
          publicRef: 'benchmark:test',
          version: '1.0.0',
          manifestDigest: digest,
        },
        tracks: [
          {
            id: 'default',
            primaryMetricKey: 'accuracy',
            scorerVersion: 'scorer-1',
            itemCount: 100,
          },
        ],
      }).tracks,
    ).toHaveLength(1)
    expect(unsignedReceiptSchema.parse(receipt)).toEqual(receipt)
    expect(() =>
      unsignedReceiptSchema.parse({ ...receipt, primaryMetricValue: 0.5 }),
    ).toThrow('Primary metric')
  })

  it('verifies Ed25519 signatures and rejects tampering', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const publicKeySpki = bytesToBase64Url(
      new Uint8Array(publicKey.export({ type: 'spki', format: 'der' })),
    )
    const signature = bytesToBase64Url(
      sign(null, Buffer.from(canonicalize(receipt)), privateKey),
    )
    const envelope = signedReceiptEnvelopeSchema.parse({
      payload: receipt,
      algorithm: 'Ed25519',
      signature,
    })
    expect(await verifySignedReceipt(envelope, publicKeySpki)).toBe(true)
    expect(
      await verifySignedReceipt(
        {
          ...envelope,
          payload: { ...receipt, modelId: 'provider/model-tampered' },
        },
        publicKeySpki,
      ),
    ).toBe(false)
    expect(
      base64UrlToBytes(bytesToBase64Url(new Uint8Array([1, 2, 3]))),
    ).toEqual(new Uint8Array([1, 2, 3]))
    expect(await publicKeyFingerprint(publicKeySpki)).toMatch(
      /^ed25519:[0-9a-f]{64}$/,
    )
  })
})
