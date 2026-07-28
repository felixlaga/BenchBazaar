#!/usr/bin/env node
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto'

import {
  bytesToBase64Url,
  canonicalize,
  manifestSchema,
  publicKeyFingerprint,
  signedReceiptEnvelopeSchema,
  unsignedReceiptSchema,
  utf8,
} from '@benchbazaar/protocol'

const [command, ...arguments_] = process.argv.slice(2)

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'))
}

async function writeJson(path, value) {
  const target = resolve(path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  })
}

async function keygen() {
  const privatePath = arguments_[0]
  if (!privatePath) {
    return fail('Usage: bb-runner keygen <private-key.pem>')
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const publicSpki = new Uint8Array(
    publicKey.export({ type: 'spki', format: 'der' }),
  )
  const publicKeySpki = bytesToBase64Url(publicSpki)
  const privateTarget = resolve(privatePath)
  await mkdir(dirname(privateTarget), { recursive: true })
  await writeFile(privateTarget, privatePem, { mode: 0o600 })
  await chmod(privateTarget, 0o600)
  await writeJson(`${privateTarget}.public.json`, {
    algorithm: 'Ed25519',
    publicKeySpki,
    fingerprint: await publicKeyFingerprint(publicKeySpki),
  })
  process.stdout.write(
    `Private key written to ${privateTarget}; public registration written to ${privateTarget}.public.json\n`,
  )
}

async function validateManifest() {
  const path = arguments_[0]
  if (!path) return fail('Usage: bb-runner validate-manifest <manifest.json>')
  const manifest = manifestSchema.parse(await readJson(path))
  process.stdout.write(`${canonicalize(manifest)}\n`)
}

async function signReceipt() {
  const [receiptPath, privatePath, outputPath] = arguments_
  if (!receiptPath || !privatePath || !outputPath) {
    return fail(
      'Usage: bb-runner sign-receipt <receipt.json> <private-key.pem> <signed.json>',
    )
  }
  const payload = unsignedReceiptSchema.parse(await readJson(receiptPath))
  const privateKey = createPrivateKey(await readFile(resolve(privatePath)))
  const signature = sign(null, utf8(canonicalize(payload)), privateKey)
  await writeJson(outputPath, {
    payload,
    algorithm: 'Ed25519',
    signature: bytesToBase64Url(signature),
  })
  process.stdout.write(`Signed receipt written to ${resolve(outputPath)}\n`)
}

async function submitReceipt() {
  const [signedPath, endpoint] = arguments_
  if (!signedPath || !endpoint) {
    return fail(
      'Usage: bb-runner submit-receipt <signed.json> <https-endpoint>',
    )
  }
  const parsedEndpoint = new URL(endpoint)
  if (
    parsedEndpoint.protocol !== 'https:' &&
    parsedEndpoint.hostname !== 'localhost' &&
    parsedEndpoint.hostname !== '127.0.0.1'
  ) {
    return fail('Receipt endpoints must use HTTPS outside local development.')
  }
  const envelope = signedReceiptEnvelopeSchema.parse(await readJson(signedPath))
  const response = await fetch(parsedEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(envelope),
  })
  const body = await response.text()
  process.stdout.write(`${body}\n`)
  if (!response.ok) process.exitCode = 1
}

async function showPublicKey() {
  const privatePath = arguments_[0]
  if (!privatePath) {
    return fail('Usage: bb-runner public-key <private-key.pem>')
  }
  const privateKey = createPrivateKey(await readFile(resolve(privatePath)))
  const publicKey = createPublicKey(privateKey)
  const publicKeySpki = bytesToBase64Url(
    new Uint8Array(publicKey.export({ type: 'spki', format: 'der' })),
  )
  process.stdout.write(
    `${JSON.stringify({
      algorithm: 'Ed25519',
      publicKeySpki,
      fingerprint: await publicKeyFingerprint(publicKeySpki),
    })}\n`,
  )
}

const commands = {
  keygen,
  'public-key': showPublicKey,
  'validate-manifest': validateManifest,
  'sign-receipt': signReceipt,
  'submit-receipt': submitReceipt,
}

if (!command || !(command in commands)) {
  fail(
    'Usage: bb-runner <keygen|public-key|validate-manifest|sign-receipt|submit-receipt> ...',
  )
} else {
  await commands[command]().catch((error) => {
    fail(error instanceof Error ? error.message : String(error))
  })
}
