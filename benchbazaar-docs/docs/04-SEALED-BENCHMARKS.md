# Sealed benchmarks

This document defines the most important architectural feature in BenchBazaar: official scored items are usable for controlled evaluation without being published as a downloadable dataset.

## 1. Why the set is sealed

Once a complete benchmark appears in a public repository, webpage, package, or downloadable file, it can be copied into search indexes, dataset mirrors, synthetic-data pipelines, and future model-training corpora. That makes later scores harder to interpret.

BenchBazaar therefore separates:

- **public understanding material** — description, method, public samples, scoring explanation, limitations, and metadata;
- **sealed scoring material** — official prompts, expected answers, private fixtures, generator secrets, and hidden rubrics;
- **public result evidence** — aggregate metrics, digests, configuration facts, signatures, and deliberately redacted artifacts.

The public interface should describe this as **open method, sealed exam**.

## 2. Precise security goal

The initial security goal is:

> Official scored benchmark items are not published, sent to the browser, or exposed through public BenchBazaar APIs. They remain in an author-controlled or trusted runner, which returns only aggregate and explicitly redacted result data.

This protects against:

- ordinary web crawling;
- public repository ingestion;
- bulk downloading by visitors;
- accidental inclusion in social cards or page source;
- casual extraction through application APIs;
- accidental leakage through normal product use.

## 3. Explicit non-guarantees

The initial system does **not** guarantee that:

- a malicious model endpoint cannot log prompts sent to it;
- a malicious runner operator cannot copy the hidden set;
- a benchmark author created a fair test;
- a signed runner is honest merely because its signature is valid;
- a model was never previously exposed to equivalent examples;
- repeated authorized runs can never reveal information about the set;
- an infrastructure administrator with sufficient access cannot inspect server-side data;
- encrypted data is protected from the service that holds its decryption key;
- the benchmark is cryptographically contamination-proof.

These limits must appear in product copy and documentation. Do not market the system as “unleakable.”

## 4. Threat model

### 4.1 Public crawler or training-data collector

Goal: collect benchmark prompts and answers at scale from public web surfaces.

Mitigation:

- hidden items never appear in public pages, API responses, repositories, social images, sitemaps, logs, or file URLs;
- only purpose-built public samples are indexed;
- receipts omit hidden content.

Expected result: the official set is not available through ordinary crawling.

### 4.2 Curious signed-in user

Goal: inspect network requests, route data, Convex calls, bundles, source maps, or storage identifiers to recover the test set.

Mitigation:

- no browser-callable query returns sealed content;
- no client-side decryption path exists;
- no generated storage URL exists for sealed assets;
- authorization does not rely on hiding UI controls;
- hidden content is absent from client error payloads.

Expected result: signing in does not provide a download path.

### 4.3 Malicious run requester

Goal: submit many model endpoints or repeated runs and log prompts to reconstruct the set.

Mitigation:

- per-user, per-model, per-endpoint, and per-benchmark run quotas;
- manual approval for new endpoints in early releases;
- random subsets from a larger reserve pool;
- generated or parameterized variants where possible;
- no item-level correctness feedback;
- no prompt replay or arbitrary retry control;
- canary and fingerprint items;
- rotation and retirement policies;
- anomaly detection for endpoint churn and repeated requests.

Expected result: extraction becomes slower, detectable, and less useful, but is not impossible.

### 4.4 Model endpoint operator

Goal: log every evaluation prompt received by the endpoint.

Mitigation options:

- use provider APIs with appropriate no-training or low-retention controls;
- use a benchmark-owner or BenchBazaar-owned provider account;
- run open-weight models inside the trusted runner rather than sending prompts to the model owner's endpoint;
- disclose endpoint exposure in every receipt;
- limit run frequency and item disclosure;
- eventually use confidential compute for stronger isolation.

Expected result: risk can be reduced, not eliminated, when prompts leave the runner.

### 4.5 Malicious benchmark author or runner

Goal: fabricate scores, selectively test models, or publish a misleading benchmark.

Mitigation:

- signatures identify the runner but do not automatically endorse it;
- public methodology and limitations;
- exact version and dataset/generator digests;
- independent reproduction status;
- curator review and dispute workflow;
- append-only receipts and audit events;
- no silent deletion of unfavorable results.

Expected result: provenance and disagreement are visible; truth is not assumed from authorship.

### 4.6 Accidental operator leakage

Goal is not malicious; risk comes from logging, support tools, backups, analytics, exceptions, or debugging.

Mitigation:

- sealed data is absent from the web app in the default runner mode;
- structured redaction at every boundary;
- no request-body logging on runner routes;
- synthetic fixtures in tests and staging;
- explicit data classification;
- incident response and key rotation.

## 5. Data split

Every published benchmark version has at least two conceptual packages.

### 5.1 Public package

Safe to publish and index:

- benchmark ID, title, summary, aisle, tags;
- author and version;
- capability statement;
- public free samples;
- track definitions;
- metric definitions and direction;
- public scoring description;
- tool and retry rules;
- limitations;
- repository and write-up links;
- license information;
- hidden-set item count or count range;
- hidden-set digest;
- rotation date or freshness statement;
- supported runner mode.

### 5.2 Sealed package

Never sent to the public application client:

- official prompts;
- expected answers;
- private rubrics;
- hidden scorer fixtures;
- generator seed or secret;
- canary mapping;
- per-run transformations;
- decryption keys;
- unreleased raw traces that reveal prompts.

### 5.3 Public samples

Public samples are not a slice of the official test set. They are separately authored examples with separate IDs and an explicit field such as:

```yaml
purpose: display_only
included_in_official_score: false
```

Once a sample is public, treat it as permanently contaminated and never rotate it into the hidden pool.

## 6. Evaluation modes

BenchBazaar supports a ladder of modes. The interface must label the mode used by each benchmark and receipt.

### Mode 0: Public demo

- Public samples only
- No official score
- Useful for explaining an idea
- No claim of contamination resistance

This lets a creator publish before they have runner infrastructure.

### Mode 1: Author-run sealed evaluation — MVP default

- Hidden set remains on the author's machine or private infrastructure
- Author runs a reference CLI or compatible evaluator
- Runner emits a canonical receipt
- Runner signs the receipt with a registered key
- BenchBazaar verifies and publishes the receipt

Advantages:

- easiest secure architecture for a side project;
- BenchBazaar never stores the hidden set;
- no arbitrary code runs in the web backend;
- author can use existing evaluation frameworks.

Tradeoff:

- not immediately self-service for every visitor;
- trust remains with the author or runner operator.

### Mode 2: Author-hosted remote sealed runner — post-MVP

- Author deploys a small open-source runner service
- The service holds the hidden set
- BenchBazaar queues approved run requests
- Runner leases jobs, evaluates the target, and returns a signed receipt
- Browser never receives test items

This mode improves usability while keeping data outside BenchBazaar.

### Mode 3: BenchBazaar-managed encrypted set — later

- Author encrypts a sealed bundle before upload
- Ciphertext is stored in private application storage
- A server-only evaluator unwraps and decrypts it
- Runs are chunked and orchestrated because backend actions have duration limits
- Plaintext never reaches the browser and is never exposed through a bearer file URL

This mode increases operational and trust burden. It is not required for launch.

### Mode 4: Confidential model execution — research/future

- Open-weight model or private model service runs inside a trusted execution environment or cryptographic protocol
- Benchmark owner and model owner receive stronger isolation guarantees

This is outside the side-project MVP. Do not block useful releases on it.

## 7. Chosen MVP architecture

The MVP uses **Mode 1**.

```text
Author's private environment
  ├─ hidden benchmark bundle or generator
  ├─ existing evaluation framework or simple adapter
  ├─ BenchBazaar runner CLI
  └─ Ed25519 signing private key
               │
               │ canonical signed receipt only
               ▼
Convex HTTP action
  ├─ validates schema
  ├─ finds active runner registration
  ├─ verifies signature and replay nonce
  ├─ checks version, track, and digest compatibility
  └─ creates immutable receipt
               │
               ▼
Public receipt and scoped scoreboard
```

The hidden set never enters the BenchBazaar web application or Convex deployment in this mode.

## 8. Runner registration

A benchmark owner registers a runner with:

- display name;
- runner type;
- Ed25519 public key;
- supported benchmark IDs or owner scope;
- optional public source repository;
- optional build/version string;
- created timestamp;
- status: pending, active, suspended, revoked;
- key fingerprint;
- last-seen metadata later.

The private signing key remains with the runner operator.

### Registration rules

- A human owner must be authenticated.
- A key can only sign for explicitly authorized benchmark versions or owner scope.
- Key rotation creates a new registration; old receipts remain verifiable against the historical public key.
- Revocation blocks new receipts but does not erase old signature facts.
- The public UI shows who operates the runner and what a signature proves.

## 9. Signed receipt flow

### 9.1 Prepare run

The runner loads:

- exact public manifest version;
- private bundle with matching dataset/generator digest;
- exact track configuration;
- exact model target;
- scorer version.

### 9.2 Execute

The runner:

1. chooses the allowed hidden subset or generates instances;
2. randomizes order;
3. sends one item at a time or in bounded batches;
4. records model outputs privately;
5. scores locally;
6. produces aggregate metrics;
7. redacts traces according to the benchmark policy;
8. computes configuration and artifact digests;
9. creates a unique nonce and completion timestamp.

### 9.3 Sign

The runner serializes the receipt using the canonical format in `09-MANIFEST-AND-RECEIPTS.md`, then signs the canonical bytes with its private key.

### 9.4 Ingest

The Convex HTTP action:

1. limits payload size;
2. validates content type and schema;
3. rejects unknown fields where practical;
4. looks up the runner key;
5. checks key status and scope;
6. verifies the signature;
7. rejects reused nonces and duplicate receipt IDs;
8. checks benchmark version, track, metric, and digest compatibility;
9. stores the receipt and an audit event;
10. returns a public receipt identifier.

### 9.5 Publish

The receipt becomes visible with a `runner_signed` label. It does not automatically become `maintainer_official` or `independently_reproduced`.

## 10. Remote runner flow

Mode 2 adds job orchestration.

```text
Requester
  └─ creates run request
       └─ owner approves
            └─ Convex creates queued job
                 └─ registered runner leases job
                      └─ runner evaluates target
                           └─ runner signs receipt
                                └─ Convex publishes receipt
```

### Job safety properties

- Lease duration is finite.
- Jobs use idempotency keys.
- Only one active lease may produce the authoritative receipt.
- Retries do not reveal item-level feedback.
- Secrets are not stored in scheduled function arguments.
- A job references model-target credentials indirectly, never embeds long-lived keys in public state.
- Failed jobs publish status and coarse error categories, not hidden content.

### Credential policy

For early remote runs, prefer this order:

1. benchmark operator uses their own provider account;
2. BenchBazaar uses a site-owned provider account with quotas;
3. requester supplies a short-lived, narrowly scoped endpoint token;
4. requester supplies a general provider key only after a separate, reviewed secret-broker design exists.

Do not persist raw provider keys in Convex documents.

## 11. Anti-extraction controls

No single control is sufficient. Use a layered policy.

### 11.1 Leakage budget

Each benchmark version defines a leakage budget:

- maximum official runs per model target per time window;
- maximum runs per requester;
- maximum runs per endpoint fingerprint;
- percentage or count of pool exposed per run;
- number of retries;
- whether the same item may be reused;
- when the pool rotates.

The UI may show a friendly message such as “This stall limits official runs to protect fresh stock.”

### 11.2 Large reserve pool

Where practical, maintain more hidden items than a single official run uses. Sample deterministically from a run seed committed into the receipt.

The receipt may disclose the seed digest, not a secret that permits reconstruction.

### 11.3 Procedural generation

Prefer parameterized or generated tasks for benchmarks that support it. Keep secret generator material in the runner. Record:

- generator version;
- generator digest;
- public constraints;
- generation timestamp or epoch;
- validation procedure.

Generation is not automatically fair. Generated items still need quality checks.

### 11.4 No item-level feedback

Official run responses should not reveal:

- prompt text;
- expected answer;
- per-item correctness by default;
- which exact items were sampled;
- detailed scorer exceptions containing content.

Authors may choose to release a small post-run diagnostic sample, but it becomes public and cannot return to the hidden pool.

### 11.5 Canaries and fingerprints

A benchmark may include non-scoring or low-weight canary patterns to detect suspicious reuse or public appearance.

Canaries must not create user harm or deceptive claims. Their presence and policy can be public even when exact values are secret.

### 11.6 Rotation

A benchmark version can remain immutable while a new version rotates the pool. Rotation should create:

- new version;
- new digest;
- changelog;
- comparability statement;
- retirement date for the old official track.

Do not silently replace hidden content under the same version and digest.

## 12. Managed encrypted storage design

This is a later option, not an MVP dependency.

### 12.1 Upload

1. The author creates a sealed bundle locally.
2. The browser or local CLI encrypts it with a fresh per-version data-encryption key.
3. Only ciphertext is uploaded to storage.
4. The data key is wrapped with a server-side master key or external KMS.
5. Convex stores ciphertext storage ID, wrapped key, algorithm metadata, and digest.

### 12.2 Storage rules

- Never call `storage.getUrl()` for a sealed asset.
- Never return the storage ID as proof of authorization.
- Only an internal server action may call `ctx.storage.get()`.
- Do not expose a download route to owners by default. Owners should keep their source copy.
- Do not place plaintext in Convex database documents.
- Do not log file bytes or decrypted examples.
- Delete abandoned upload ciphertext after a retention period.

### 12.3 Execution

Because individual backend actions have finite duration, managed runs should be split into bounded chunks with durable workflow state. Each chunk:

- fetches ciphertext server-side;
- decrypts only the required segment where format permits;
- evaluates a bounded number of items;
- stores encrypted or redacted intermediate results;
- updates aggregate counters through an internal mutation;
- schedules the next chunk;
- zeroes references and avoids logging plaintext.

A simpler alternative is to stream the bundle to a dedicated runner service. Do not force long evaluations into one web request.

### 12.4 Trust statement

Managed encryption protects data at rest and from accidental public serving. It does not hide plaintext from the server runtime that performs evaluation. Say so explicitly.

## 13. Hidden bundle guidance

BenchBazaar does not invent a universal task DSL. A private bundle can wrap any existing evaluator, but should include enough private metadata to bind a receipt:

```text
sealed-bundle/
  bundle.json                private bundle metadata
  items.*                    hidden prompts or source records
  answers.*                  hidden targets or rubrics
  scorer/                    optional private fixtures
  generators/                optional generator assets
  canaries.*                 optional private mapping
```

`bundle.json` should contain:

- benchmark ID and version;
- track IDs;
- item count;
- dataset/generator digest;
- scorer version;
- bundle format version;
- public manifest digest;
- creation timestamp;
- optional expiry or rotation date.

Do not commit this directory to the public repository.

## 14. Receipt disclosure policy

### Always public

- benchmark/version;
- track;
- exact model ID;
- aggregate metrics;
- item count;
- run date;
- runner identity;
- verification and signature facts;
- dataset/generator digest;
- configuration digest;
- endpoint exposure classification;
- known run notes.

### Public only when safe

- redacted model outputs;
- aggregated failure categories;
- latency and token totals;
- public artifact links;
- a small diagnostic sample that is permanently retired from hidden use.

### Never public by default

- hidden prompts;
- expected answers;
- per-item sample IDs that map to private data;
- secret seeds;
- canary mapping;
- provider credentials;
- raw exception messages containing content.

## 15. Endpoint exposure labels

Every official receipt should state one of:

- `trusted_local_model` — model ran inside the trusted runner boundary;
- `operator_provider_account` — runner called a provider using operator credentials;
- `site_provider_account` — BenchBazaar-managed provider integration;
- `requester_endpoint` — prompts were sent to a requester-controlled endpoint;
- `unknown_or_legacy` — exposure cannot be determined.

This helps users interpret contamination risk.

## 16. Product copy

Recommended concise explanation:

> **Sealed set**  
> The scored questions are not publicly downloadable. A controlled runner presents them to the model and publishes only a result receipt. The model service may still observe inputs sent to it, so this reduces public leakage rather than guaranteeing perfect secrecy.

For public samples:

> **Free sample**  
> This example is intentionally public and is never used in the official score.

For rate limits:

> **Fresh-stock limit**  
> Official runs are limited so repeated requests cannot cheaply reconstruct the hidden set.

## 17. Incident response for suspected leakage

When hidden content is suspected to have leaked:

1. disable new official runs for the affected version;
2. revoke or suspend relevant runner keys;
3. preserve audit evidence without copying hidden content into tickets;
4. identify the exposure boundary;
5. mark affected receipts with a visible warning when interpretation changes;
6. create a new benchmark version with a rotated pool or generator;
7. update the changelog and comparability statement;
8. rotate secrets and endpoint credentials;
9. publish an incident note proportionate to the impact;
10. add a regression test or operational control.

Do not rewrite the old version or silently remove history.

## 18. Acceptance checklist

A sealed benchmark implementation is acceptable only if:

- public queries contain no hidden item text or answers;
- public samples are distinct from the hidden pool;
- the official version records a dataset or generator digest;
- receipts bind to exact version, track, scorer, and digest;
- signatures are checked server-side;
- replayed receipts are rejected;
- run limits exist before remote self-service is enabled;
- errors and logs are content-redacted;
- no bearer file URL exists for sealed storage;
- the UI states the model-endpoint visibility limitation;
- an incident rotation path exists.
