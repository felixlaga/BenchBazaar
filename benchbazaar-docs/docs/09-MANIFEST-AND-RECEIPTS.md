# Manifest and receipt protocol

## 1. Purpose

BenchBazaar needs a small machine-readable format for two things:

1. describing the **public contract** of a benchmark version;
2. publishing a **result receipt** that binds a model run to that contract.

The protocol is an interoperability envelope, not a new evaluation framework or task DSL.

## 2. Package layout

```text
packages/protocol/
  src/
    manifest.ts
    receipt.ts
    canonicalize.ts
    digests.ts
    signatures.ts
    errors.ts
  test-vectors/
    manifest-v1.json
    receipt-v1.json
    receipt-v1.canonical.json
    ed25519-public-key.txt
    ed25519-signature.txt
```

Export:

- TypeScript types;
- runtime validators;
- JSON Schemas;
- canonicalization helpers;
- digest helpers;
- signature verification helpers;
- protocol error codes.

Avoid dependencies on TanStack, Convex, React, or a specific evaluation framework.

## 3. Public benchmark manifest

Suggested filename:

```text
benchbazaar.yml
```

The website may create the manifest from form data. Technical users may import one.

### Example

```yaml
schema: https://benchbazaar.dev/schemas/benchmark/v1
protocolVersion: '1'

id: felix/emoji-accountant
version: 1.2.0

title: Emoji Accountant
summary: Can an LLM reconcile expenses written entirely in emoji?

authors:
  - handle: felix
    role: maintainer

aisle: reasoning-row
tags:
  - instruction-following
  - accounting
  - emoji

modalities:
  - text

purpose:
  capability: Reconcile semi-structured expense records and follow category rules.
  whyItMatters: Real workflows often contain shorthand, symbols, and inconsistent formatting.
  intendedUse: Compare model robustness on a narrow data-cleaning task.
  supportsClaims: Relative performance on this benchmark version and track.
  doesNotSupportClaims: General accounting competence or financial reliability.

publicSamples:
  - id: display-001
    purpose: display_only
    includedInOfficialScore: false
    input: |-
      🛫🍕 €18
      🚕🏨 €42
      ☕👥 €11
    expected: Hotel transport
    explanation: The taxi-to-hotel line is the largest single expense.

tracks:
  - id: zero-shot-no-tools
    label: Zero-shot, no tools
    description: One instruction, no examples, no tool calls.
    promptPolicy: Public system prompt template v1.
    toolPolicy: No tools.
    retryPolicy: One attempt per item.
    scorer:
      type: exact
      version: exact-normalized-v1
    primaryMetric:
      key: accuracy
      label: Accuracy
      direction: maximize

sealedSet:
  mode: author_runner
  itemCount:
    exact: 120
  datasetDigest:
    algorithm: sha256
    value: 5e4d...redacted-example
  rotationPolicy: New version when more than 25 official external-endpoint runs occur.
  endpointExposureNotice: Model services may observe prompts sent during evaluation.

source:
  repository: https://github.com/example/emoji-accountant
  writeup: https://example.org/emoji-accountant

licenses:
  method: MIT
  publicSamples: CC-BY-4.0
  sealedData: private-evaluation-only

limitations:
  - Small and intentionally narrow.
  - Emoji interpretation may vary by platform and culture.
  - Does not assess real financial safety.

changelog: Initial published version.
comparability: incompatible
```

## 4. Manifest rules

### Required

- schema/protocol version;
- stable benchmark ID;
- version;
- title and summary;
- at least one author;
- aisle;
- purpose fields;
- at least one track;
- limitations;
- sealed-set mode;
- public-sample declarations if samples exist.

### Forbidden

The public manifest must reject or flag fields that contain:

- official hidden prompts;
- official expected answers;
- private generator seeds;
- private canary mappings;
- provider credentials;
- signing private keys;
- encrypted bundle decryption keys;
- file URLs to the full hidden set.

Schema validation cannot determine semantic secrecy perfectly. The publish UI must warn authors and use content-size heuristics for suspicious bulk pastes.

### Public sample invariant

Every public sample must include:

```yaml
purpose: display_only
includedInOfficialScore: false
```

The protocol library rejects `includedInOfficialScore: true`.

## 5. Versioning

### Protocol versions

`protocolVersion` changes when parsing or signature semantics change.

### Benchmark versions

A benchmark version changes when any score-affecting part changes, including:

- hidden items or generator;
- scorer behavior;
- prompt policy;
- tool policy;
- retry policy;
- primary metric;
- judge model or rubric;
- material data correction.

Editorial typo fixes can be handled through a narrow metadata correction record if they do not change interpretation. Prefer a new version when uncertain.

### Immutability

Once published:

- canonical manifest bytes remain fixed;
- manifest digest remains fixed;
- receipts continue to reference that digest;
- a successor version receives a new digest and comparability statement.

## 6. Digests

Use SHA-256 for protocol digests unless a future version deliberately changes it.

Recommended digest fields:

- public manifest digest;
- sealed dataset or generator digest;
- runner configuration digest;
- public artifact digest;
- optional model-output artifact digest.

A digest proves byte equality, not dataset quality or secrecy.

## 7. Canonical JSON

Signatures and digests require deterministic bytes.

Use JSON Canonicalization Scheme, RFC 8785, for canonical JSON payloads. YAML is a human authoring format only; parse and normalize it into the protocol's JSON shape before canonicalization.

Canonicalization rules:

- validate against the protocol schema first;
- disallow non-finite numbers;
- normalize timestamps to RFC 3339 strings or integer milliseconds as specified per field;
- do not sign unknown extension fields unless the protocol explicitly preserves them;
- canonicalize the complete `payload` object without the detached signature envelope;
- use UTF-8 bytes.

Store cross-language test vectors in the repository.

## 8. Receipt payload

### Example

```json
{
  "schema": "https://benchbazaar.dev/schemas/receipt/v1",
  "protocolVersion": "1",
  "receiptId": "BB-RCP-7J4M2Q",
  "nonce": "01J2Y5F2K99V2VYQ8N5D1A7T4C",
  "benchmark": {
    "id": "felix/emoji-accountant",
    "version": "1.2.0",
    "manifestDigest": {
      "algorithm": "sha256",
      "value": "0f4a..."
    },
    "sealedSetDigest": {
      "algorithm": "sha256",
      "value": "5e4d..."
    },
    "trackId": "zero-shot-no-tools"
  },
  "model": {
    "provider": "example-provider",
    "id": "model-family-2026-07-01",
    "displayName": "Model Family July 2026"
  },
  "run": {
    "completedAt": "2026-07-11T14:31:00Z",
    "itemCount": 120,
    "scorerVersion": "exact-normalized-v1",
    "configurationDigest": {
      "algorithm": "sha256",
      "value": "67ab..."
    },
    "endpointExposure": "operator_provider_account"
  },
  "metrics": [
    {
      "key": "accuracy",
      "label": "Accuracy",
      "value": 0.824,
      "direction": "maximize"
    }
  ],
  "artifacts": [
    {
      "kind": "workflow",
      "label": "CI run",
      "url": "https://github.com/example/runs/123"
    }
  ],
  "runner": {
    "id": "BB-RUN-K8D2",
    "softwareVersion": "benchbazaar-runner/0.1.0"
  },
  "notes": "No retries. Provider default temperature was overridden to 0."
}
```

Detached signature envelope:

```json
{
  "algorithm": "Ed25519",
  "keyFingerprint": "sha256:abc123...",
  "signature": "base64url-encoded-signature"
}
```

The signature covers the RFC 8785 canonical UTF-8 bytes of the receipt payload, not the envelope.

## 9. Receipt required fields

- protocol version;
- unique receipt ID;
- unique nonce;
- benchmark ID and exact version;
- manifest digest;
- sealed-set digest or generator digest when official;
- track ID;
- exact model provider and model ID;
- completion timestamp;
- item count;
- scorer version;
- configuration digest;
- endpoint exposure classification;
- at least one metric;
- runner ID for signed receipts.

## 10. Receipt forbidden fields

Runner ingestion rejects payload fields containing:

- hidden prompts;
- expected answers;
- per-item private records;
- provider API keys or authorization headers;
- signing private keys;
- secret seeds;
- raw unbounded logs;
- embedded binary artifacts;
- arbitrary HTML.

Public notes have strict size limits and are rendered as sanitized Markdown or plain text.

## 11. Signature scheme

Use Ed25519 as specified in RFC 8032.

### Key lifecycle

- runner generates keypair locally;
- public key is registered through authenticated UI;
- private key remains on runner;
- public key fingerprint is displayed;
- key may be suspended or revoked;
- rotation registers a new key;
- historical receipts preserve the original key relationship.

### What a valid signature proves

- the payload bytes were signed by the holder of the registered private key;
- the payload was not changed after signing;
- the runner key was known to BenchBazaar.

### What it does not prove

- the runner used honest code;
- the hidden set was high quality;
- the model endpoint did not log prompts;
- the metrics were independently reproduced;
- the benchmark author is unbiased.

## 12. Replay protection

Each signed receipt includes a unique nonce.

Ingestion must atomically reject an existing `(runnerId, nonce)` pair. The receipt ID must also be unique.

Optional later protections:

- short-lived ingestion challenge issued by BenchBazaar;
- expected job ID for remote runner jobs;
- maximum accepted clock skew;
- signed job assignment digest.

Manual author-run receipts should not require an online challenge in the MVP, because offline execution is useful. The unique nonce still prevents identical replay.

## 13. Compatibility validation

A receipt can rank only when all are true:

- benchmark ID exists;
- version exists and is not suspended;
- manifest digest matches;
- track ID exists in that version;
- scorer version is permitted by the track;
- primary metric key exists and direction matches;
- sealed-set or generator digest matches the official version policy;
- model ID is exact enough for comparison;
- item count satisfies the track policy;
- receipt is not invalid or superseded.

A structurally valid but incompatible receipt may be stored as historical evidence with a visible warning, but it does not enter the default scoreboard.

## 14. Verification mapping

Protocol evidence maps to product labels:

```text
manual form only                    → self_reported
manual + valid public artifact      → artifact_linked
valid registered runner signature   → runner_signed
owner action on compatible receipt  → maintainerOfficial = true
independent compatible receipt pair → independentlyReproduced = true
moderation action                    → disputed or invalid
```

The submitter cannot assign higher evidence labels in their payload.

## 15. Independent reproduction

Two receipts may count as an independent reproduction when:

- exact benchmark version and track match;
- exact model ID and material configuration match;
- different trusted runner operators produced them;
- sealed-set digest matches;
- metric values are within an explicit benchmark tolerance;
- neither is disputed or invalid.

Do not mark reproduction solely because the same author ran twice.

## 16. Public receipt JSON

Expose a read-only machine endpoint:

```text
GET /api/v1/receipts/:publicId
```

It returns public receipt data plus resolved public labels. It never returns internal user IDs, report details, hidden artifacts, or secrets.

The endpoint may include:

```json
{
  "receipt": { "...": "public protocol payload" },
  "verification": {
    "level": "runner_signed",
    "signatureValid": true,
    "maintainerOfficial": false,
    "independentlyReproduced": false,
    "status": "valid"
  },
  "links": {
    "html": "...",
    "benchmark": "...",
    "model": "..."
  }
}
```

## 17. Import behavior

When importing `benchbazaar.yml`:

1. parse YAML with safe mode and no arbitrary tags;
2. validate schema;
3. normalize IDs and URLs;
4. reject hidden-content-shaped fields;
5. show a human preview;
6. require ownership confirmation;
7. import into a draft;
8. publish only after explicit confirmation.

Never auto-publish from an unreviewed repository URL.

## 18. Extensions

Future protocol versions may support namespaced extensions:

```json
{
  "extensions": {
    "org.example.latency": { "p95Ms": 812 }
  }
}
```

Rules:

- extension keys are namespaced;
- extension values have strict size limits;
- extensions are included in canonical signatures if present;
- unknown extensions do not affect default ranking;
- extensions cannot override core fields.

Do not add extensions before a real use case exists.

## 19. Error codes

Machine endpoints return stable codes without echoing sensitive data.

Suggested codes:

```text
BB_PROTOCOL_UNSUPPORTED
BB_PAYLOAD_INVALID
BB_PAYLOAD_TOO_LARGE
BB_RUNNER_UNKNOWN
BB_RUNNER_INACTIVE
BB_RUNNER_SCOPE_DENIED
BB_SIGNATURE_INVALID
BB_NONCE_REUSED
BB_BENCHMARK_UNKNOWN
BB_VERSION_UNKNOWN
BB_MANIFEST_DIGEST_MISMATCH
BB_SEALED_DIGEST_MISMATCH
BB_TRACK_INCOMPATIBLE
BB_SCORER_INCOMPATIBLE
BB_MODEL_ID_AMBIGUOUS
BB_RATE_LIMITED
BB_INTERNAL_ERROR
```

Human-readable details should remain coarse.

## 20. Test vectors

The protocol package must include deterministic test vectors proving:

- YAML and JSON inputs normalize to the same manifest shape;
- RFC 8785 canonical bytes are stable;
- SHA-256 digests match expected values;
- a known Ed25519 signature verifies;
- one-byte payload changes fail verification;
- reordered JSON keys still canonicalize identically;
- duplicate nonce ingestion is rejected;
- hidden-content fields are rejected;
- non-finite metrics are rejected;
- unknown protocol versions fail clearly.
