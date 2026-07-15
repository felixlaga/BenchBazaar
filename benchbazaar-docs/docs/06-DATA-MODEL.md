# Convex data model

## 1. Modeling principles

- Use explicit Convex schemas and validators.
- Separate mutable drafts from immutable published snapshots.
- Keep hidden test content out of the MVP database entirely.
- Store public samples in their own table so lists can paginate and media can evolve before publish.
- Keep receipt history append-only.
- Use exact benchmark version and track IDs for compatibility.
- Denormalize small public card fields where it reduces read complexity.
- Add indexes for every potentially unbounded query.
- Never use a client-provided actor ID as authorization evidence.

## 2. Data classifications

| Classification    | Examples                                             | Browser-readable?                    |
| ----------------- | ---------------------------------------------------- | ------------------------------------ |
| `PUBLIC`          | titles, summaries, public samples, receipts, handles | Yes                                  |
| `AUTHENTICATED`   | draft content, basket saves, private report status   | Only to authorized user              |
| `SEALED_METADATA` | hidden-set digest, item-count range, rotation date   | Public or restricted depending field |
| `SEALED_CONTENT`  | official prompts, answers, generator secrets         | Never in MVP Convex data             |
| `SECRET`          | WorkOS secrets, signing private keys, provider keys  | Environment/runner only              |

The `sealedAssets` table described later is a future extension and must not be implemented casually.

## 3. Core identifiers

Use Convex document IDs internally and stable public IDs externally.

Recommended public IDs:

- benchmark slug: `emoji-accountant`
- version: semantic or calendar string chosen by owner, such as `1.2.0`
- benchmark reference: `owner-handle/emoji-accountant@1.2.0`
- model canonical ID: provider-qualified, such as `provider/model-version`
- receipt public ID: random URL-safe identifier, such as `BB-RCP-7J4M2Q`
- runner public ID: random URL-safe identifier, such as `BB-RUN-K8D2`

Do not expose raw sequential counters.

## 4. Tables

The field lists below are the implementation contract, not copy-paste code. Agents should translate them into strict Convex validators and shared TypeScript types.

### 4.1 `users`

Application profile mapped to WorkOS identity.

```text
externalId                 string, WorkOS subject, private
handle                     string, normalized unique public handle
displayName                string
avatarUrl                  optional string
bio                        optional string
githubUsername             optional string
email                      optional string, private
role                       member | curator | moderator | admin
status                     active | suspended | deleted
createdAt                  number
updatedAt                  number
lastSeenAt                 optional number
```

Indexes:

```text
by_externalId              [externalId]
by_handle                  [handle]
by_status                  [status]
```

Rules:

- email is never returned by public queries;
- handle normalization is lowercase and collision-checked;
- deleted accounts keep tombstone identity where receipts require attribution.

### 4.2 `benchmarks`

Stable identity across versions.

```text
ownerId                    Id<users>
slug                       string
publicRef                  string, owner/slug
status                     draft | published | hidden | suspended | archived
currentVersionId           optional Id<benchmarkVersions>
latestDraftId              optional Id<benchmarkDrafts>
title                      string, denormalized current public title
summary                    string, denormalized current public summary
aisle                      string, denormalized current aisle
tags                       array<string>, denormalized current tags
modalities                 array<string>
searchText                 string
coverImageStorageId        optional Id<_storage>, public asset only
receiptCount               number
independentReproductionCount number
saveCount                  number
publishedAt                optional number
updatedAt                  number
createdAt                  number
```

Indexes:

```text
by_ownerId                 [ownerId]
by_ownerId_slug            [ownerId, slug]
by_publicRef               [publicRef]
by_status_publishedAt      [status, publishedAt]
by_aisle_publishedAt       [aisle, publishedAt]
by_status_updatedAt        [status, updatedAt]
by_status_receiptCount     [status, receiptCount]
```

Search index:

```text
search_public              searchField: searchText
                           filterFields: status, aisle
```

Rules:

- `slug` cannot change after first publish;
- public card fields update only when a new version becomes current;
- count fields are maintained by internal mutations.

### 4.3 `benchmarkDrafts`

Mutable working copy for a new benchmark or successor version.

```text
benchmarkId                Id<benchmarks>
ownerId                    Id<users>
baseVersionId              optional Id<benchmarkVersions>
proposedVersion            string
title                      string
summary                    string
aisle                      string
tags                       array<string>
modalities                 array<string>
capabilityStatement        string
whyItMatters               string
intendedUse                string
supportedClaims            string
unsupportedClaims          string
methodMarkdown             string
limitationsMarkdown        string
license                    optional string
repositoryUrl              optional string
writeupUrl                 optional string
sealedPolicy               object
tracks                     array<trackDefinition>
status                     editing | ready | publishing | abandoned
createdAt                  number
updatedAt                  number
```

`sealedPolicy` public metadata:

```text
mode                       none | manual_signed | author_runner | remote_runner | managed_later
itemCountDisclosure        optional number or range object
datasetDigest              optional string
generatorDigest            optional string
rotationPolicy             optional string
endpointExposureNote       string
```

Indexes:

```text
by_ownerId_updatedAt       [ownerId, updatedAt]
by_benchmarkId_status      [benchmarkId, status]
```

Rules:

- only owner or future collaborator can read/write;
- never place hidden prompts, answers, or secrets in this table;
- publish operation snapshots allowed fields into an immutable version.

### 4.4 `draftSamples`

Mutable public examples associated with a draft.

```text
draftId                    Id<benchmarkDrafts>
ownerId                    Id<users>
publicSampleId             string, stable within benchmark
position                   number
inputMarkdown              string
expectedMarkdown           optional string
explanationMarkdown        optional string
media                      optional array<publicMediaRef>
confirmedDisplayOnly       boolean
createdAt                  number
updatedAt                  number
```

Indexes:

```text
by_draftId_position        [draftId, position]
```

Rules:

- these are public-intent examples even while draft is private;
- publishing requires `confirmedDisplayOnly = true`;
- IDs must not match any hidden item identifier supplied in private tooling.

### 4.5 `benchmarkVersions`

Immutable public snapshot.

```text
benchmarkId                Id<benchmarks>
ownerId                    Id<users>
version                    string
publicRef                  string, owner/slug@version
status                     current | historical | deprecated | suspended
supersedesVersionId        optional Id<benchmarkVersions>
title                      string
summary                    string
aisle                      string
tags                       array<string>
modalities                 array<string>
capabilityStatement        string
whyItMatters               string
intendedUse                string
supportedClaims            string
unsupportedClaims          string
methodMarkdown             string
limitationsMarkdown        string
license                    optional string
repositoryUrl              optional string
writeupUrl                 optional string
tracks                     array<trackDefinition>
sealedPolicy               publishedSealedPolicy
manifestProtocolVersion    string
manifestDigest             string
changelogMarkdown          string
comparability              compatible | partially_compatible | incompatible
publishedAt                number
```

Indexes:

```text
by_benchmarkId_publishedAt [benchmarkId, publishedAt]
by_benchmarkId_version     [benchmarkId, version]
by_publicRef               [publicRef]
by_status_publishedAt      [status, publishedAt]
```

Rules:

- no public mutation patches a published document;
- deprecation changes should live in a separate status/event record if strict bitwise immutability is desired;
- exact manifest digest is computed from canonical public manifest;
- hidden digest changes require a new version.

### 4.6 `publicSamples`

Immutable public examples for one published version.

```text
benchmarkVersionId         Id<benchmarkVersions>
benchmarkId                Id<benchmarks>
publicSampleId             string
position                   number
inputMarkdown              string
expectedMarkdown           optional string
explanationMarkdown        optional string
media                      optional array<publicMediaRef>
includedInOfficialScore    literal false
publishedAt                number
```

Indexes:

```text
by_benchmarkVersionId_position [benchmarkVersionId, position]
```

Rules:

- insert only during publish;
- no hidden sample ID or source record is stored;
- public media is intentionally public.

### 4.7 `models`

Canonical model identity.

```text
provider                   string
canonicalId                string, provider/model-version
displayName                string
family                     optional string
releaseDate                optional number
aliases                    array<string>
status                     active | legacy | disputed_identity
metadataUrl                optional string
createdAt                  number
updatedAt                  number
```

Indexes:

```text
by_canonicalId             [canonicalId]
by_provider_displayName    [provider, displayName]
```

Rules:

- exact dated/versioned model IDs are preferred;
- aliases never erase the submitted raw model identifier;
- ambiguous “latest” aliases receive a warning and should not rank as exact comparisons.

### 4.8 `runners`

Registered machine identity and signing key.

```text
ownerId                    Id<users>
publicId                   string
name                       string
description                optional string
runnerType                 local_cli | author_service | site_managed
publicKeyAlgorithm         literal ed25519
publicKey                  string, encoded
keyFingerprint             string
sourceUrl                  optional string
softwareVersion            optional string
authorizedBenchmarkIds     array<Id<benchmarks>> or owner-scope flag
status                     pending | active | suspended | revoked
createdAt                  number
activatedAt                optional number
revokedAt                  optional number
lastSeenAt                 optional number
```

Indexes:

```text
by_publicId                [publicId]
by_ownerId_status          [ownerId, status]
by_keyFingerprint          [keyFingerprint]
```

Rules:

- private key is never stored;
- key scope is checked during every receipt ingestion;
- revocation blocks future ingestion but preserves historical verification.

### 4.9 `receipts`

Immutable run result.

```text
publicId                   string
protocolVersion            string
benchmarkId                Id<benchmarks>
benchmarkVersionId         Id<benchmarkVersions>
trackId                    string
modelId                    Id<models>
submittedModelId           string
submittedByUserId          optional Id<users>
runnerId                   optional Id<runners>
source                     manual | artifact | runner
verificationLevel          self_reported | artifact_linked | runner_signed
maintainerOfficial         boolean
independentlyReproduced    boolean
status                     valid | disputed | invalid | superseded
primaryMetricKey           string
primaryMetricValue         number
metrics                    array<metricValue>
itemCount                  number
scorerVersion              string
configurationDigest        string
datasetDigest              optional string
generatorDigest            optional string
manifestDigest             string
endpointExposure           trusted_local_model | operator_provider_account | site_provider_account | requester_endpoint | unknown_or_legacy
completedAt                number
submittedAt                number
nonce                      optional string
signature                  optional string
signatureValid             boolean
artifactRefs               array<publicArtifactRef>
notesMarkdown              optional string
supersedesReceiptId        optional Id<receipts>
disputeSummary             optional string
```

Indexes:

```text
by_publicId                         [publicId]
by_benchmarkVersionId_trackId       [benchmarkVersionId, trackId]
by_benchmarkVersionId_trackId_modelId [benchmarkVersionId, trackId, modelId]
by_modelId_completedAt              [modelId, completedAt]
by_runnerId_nonce                   [runnerId, nonce]
by_status_submittedAt               [status, submittedAt]
by_submittedByUserId_submittedAt    [submittedByUserId, submittedAt]
```

Rules:

- `runner_signed` can only be assigned by verified ingestion logic;
- exact compatibility is checked against version tracks;
- manual submission cannot set `signatureValid`, `maintainerOfficial`, or `independentlyReproduced` directly;
- status transitions create audit events;
- raw hidden item results are not stored here.

### 4.10 `runRequests`

Human-facing request for a controlled run.

```text
requesterId                Id<users>
benchmarkId                Id<benchmarks>
benchmarkVersionId         Id<benchmarkVersions>
trackId                    string
modelId                    optional Id<models>
modelTargetType            catalog_model | requester_endpoint | other
publicNote                 optional string
status                     requested | approved | queued | running | succeeded | receipt_published | declined | failed | canceled
assignedRunnerId           optional Id<runners>
receiptId                  optional Id<receipts>
coarseFailureCode          optional string
createdAt                  number
updatedAt                  number
```

Indexes:

```text
by_requesterId_createdAt            [requesterId, createdAt]
by_benchmarkVersionId_status        [benchmarkVersionId, status]
by_assignedRunnerId_status          [assignedRunnerId, status]
by_status_updatedAt                 [status, updatedAt]
```

Rules:

- contains no provider secret;
- endpoint URL and token handling requires a separate reviewed design;
- state transitions occur through dedicated mutations.

### 4.11 `runJobs` — post-MVP

Machine lease state, separate from user request.

```text
runRequestId               Id<runRequests>
runnerId                   Id<runners>
status                     queued | leased | running | succeeded | failed | expired
leaseTokenDigest           optional string
leaseExpiresAt             optional number
attempt                    number
idempotencyKey             string
createdAt                  number
updatedAt                  number
```

Indexes:

```text
by_runnerId_status         [runnerId, status]
by_idempotencyKey          [idempotencyKey]
by_status_leaseExpiresAt   [status, leaseExpiresAt]
```

No hidden items or credentials are stored in this table.

### 4.12 `basketSaves`

```text
userId                     Id<users>
benchmarkId                Id<benchmarks>
createdAt                  number
```

Indexes:

```text
by_userId_createdAt        [userId, createdAt]
by_userId_benchmarkId      [userId, benchmarkId]
by_benchmarkId             [benchmarkId]
```

Enforce uniqueness through the composite index inside the mutation.

### 4.13 `reports`

```text
reporterId                 Id<users>
targetType                 benchmark | version | receipt | stall | runner
targetId                   string or typed target object
reasonCode                 spam | harmful | misleading | copyright | privacy | invalid_result | other
details                    string
status                     open | reviewing | resolved | rejected
assignedModeratorId        optional Id<users>
resolutionNote             optional string
createdAt                  number
updatedAt                  number
resolvedAt                 optional number
```

Indexes:

```text
by_status_createdAt        [status, createdAt]
by_reporterId_createdAt    [reporterId, createdAt]
by_target                  [targetType, targetId]
```

Do not allow report details to contain sealed test content. Add a warning in the form and moderation UI.

### 4.14 `curationEntries`

```text
collectionKey              fresh_override | curators_cart | launch_collection | seasonal
benchmarkId                Id<benchmarks>
benchmarkVersionId         optional Id<benchmarkVersions>
position                   number
editorialNote              optional string
startsAt                   optional number
endsAt                     optional number
createdBy                  Id<users>
createdAt                  number
```

Indexes:

```text
by_collectionKey_position  [collectionKey, position]
by_benchmarkId             [benchmarkId]
```

### 4.15 `auditEvents`

Append-only operational history.

```text
actorType                  user | runner | system
actorId                    optional string
action                     string
targetType                 string
targetId                   string
metadata                   small redacted object
createdAt                  number
```

Indexes:

```text
by_target_createdAt        [targetType, targetId, createdAt]
by_actor_createdAt         [actorType, actorId, createdAt]
by_action_createdAt        [action, createdAt]
```

Rules:

- metadata contains IDs and state changes, never hidden content or secrets;
- public audit views use a curated subset, not the raw table.

### 4.16 `sealedAssets` — future, guarded

Do not create this table in the MVP unless managed encrypted storage is deliberately approved.

```text
benchmarkVersionId         Id<benchmarkVersions>
ownerId                    Id<users>
ciphertextStorageId        Id<_storage>
wrappedDataKey             string
algorithm                  string
bundleDigest               string
plaintextSizeBucket        optional string
status                     active | rotating | retired | destroyed
createdAt                  number
retiredAt                  optional number
```

Rules:

- ciphertext only;
- no public query returns `ciphertextStorageId` or `wrappedDataKey`;
- no generated storage URL;
- only internal actions can fetch the blob;
- key unwrap and plaintext use happen in a reviewed server-only path.

## 5. Shared value types

### Track definition

```text
id                         stable machine key
label                      public display label
description                string
promptPolicy               string
toolPolicy                 string
retryPolicy                string
primaryMetricKey           string
metricDirection            maximize | minimize
scorerType                 exact | code | human | llm_judge | hybrid
scorerVersion              string
judgeModel                 optional exact model ID
judgeRubric                 optional public string
```

### Metric value

```text
key                        string
label                      string
value                      number
unit                       optional string
direction                  maximize | minimize | neutral
```

### Public media reference

```text
kind                       image | audio | video | file
storageId                  optional public storage ID
url                        optional safe external URL
alt                        string
caption                    optional string
```

### Public artifact reference

```text
kind                       results | config | logs_redacted | workflow | source
url                        string
label                      string
digest                     optional string
```

## 6. State transitions

### Benchmark

```text
draft → published → archived
published → hidden → published
published → suspended
```

A current version can become historical when a successor is published.

### Draft

```text
editing → ready → publishing → published snapshot
editing/ready → abandoned
publishing → ready on recoverable failure
```

### Receipt

```text
valid → disputed → valid
valid/disputed → invalid
valid → superseded
```

Verification facts can be added through dedicated evidence operations, not arbitrary patching.

### Runner

```text
pending → active → suspended → active
active/suspended → revoked
```

Revoked is terminal for new signatures.

## 7. Publish transaction

The publish mutation should perform, in one controlled server operation or tightly bounded series:

1. authenticate owner;
2. load draft and public samples;
3. validate required content;
4. validate no suspicious sealed-content fields exist;
5. enforce unique version;
6. normalize and canonicalize public manifest;
7. compute manifest digest;
8. insert immutable version;
9. insert immutable public samples;
10. update stable benchmark and current-version fields;
11. mark previous current version historical;
12. mark draft published or remove active pointer;
13. write audit event.

If all steps cannot fit safely in one mutation, preserve an idempotent publish token and never expose a partially current version.

## 8. Scoreboard query

Input:

```text
benchmarkVersionId
trackId
pagination options
includeDisputed = false by default
```

Behavior:

- load only compatible receipts by composite index;
- exclude invalid and superseded receipts;
- group by exact `modelId`;
- choose best primary score according to track metric direction;
- apply transparent tie-breakers: higher verification evidence, then newer completion date;
- return all selected receipt IDs so the UI links to provenance;
- never compare across versions or tracks.

For initial scale, grouping in a bounded query result is acceptable. If receipt volume grows, maintain a materialized `leaderboardEntries` table through internal mutations.

## 9. Counter maintenance

Denormalized counts must be changed only by internal functions:

- `receiptCount` when a receipt enters or leaves valid ranking status;
- `independentReproductionCount` when reproduction evidence changes;
- `saveCount` when basket save is added or removed.

Add reconciliation scripts or internal admin functions to recompute counters from source data.

## 10. Deletion policy

- Drafts can be deleted by owners after a grace period.
- Public benchmarks are archived or hidden, not hard-deleted, when receipts depend on them.
- Published versions and receipts remain as historical records unless law or safety requires removal.
- User deletion replaces public attribution with a tombstone where necessary.
- Public media can be removed for policy reasons while preserving metadata that it was removed.
- Sealed ciphertext, if introduced, can be destroyed when a version retires; its digest remains for receipt interpretation.
