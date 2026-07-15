# Roadmap

The roadmap is ordered by risk and product learning. Each phase should leave a useful, deployable product. Do not begin later infrastructure merely because an earlier phase lacks polish.

## Phase 0 — Foundation and design contract

### Outcome

A working repository skeleton and a shared understanding of the product.

### Deliverables

- TanStack Start project initialized
- Convex development deployment connected
- WorkOS development environment connected
- GitHub social login configured
- strict TypeScript, linting, formatting, and tests
- root providers and auth callback routes
- design tokens and base layout
- repository docs and agent instructions committed
- synthetic seed-data format
- CI checks

### Exit gate

- anonymous homepage renders;
- GitHub sign-in completes in development;
- authenticated identity reaches a protected Convex query;
- no product data schema beyond a minimal user profile is required yet;
- CI is green.

## Phase 1 — The read-only bazaar

### Outcome

A polished public site that already feels worth sharing, using seeded data.

### Deliverables

- homepage hero and market sections
- browse/search route
- aisle pages
- benchmark card system
- exact benchmark-version page
- free sample interaction
- scoped scoreboard from seeded receipts
- receipt page
- stall page
- model page
- mystery crate
- responsive and accessible states
- social-card routes
- public “How sealed evaluation works” explainer

### Seed content

Launch development with at least:

- 12 benchmark listings;
- all initial aisles represented;
- 3 public samples per listing;
- multiple tracks across the collection;
- 20+ synthetic receipts;
- examples of self-reported, runner-signed, reproduced, disputed, and historical states.

### Exit gate

A visitor can understand, browse, inspect, and share the product without authentication. No page contains real hidden test items.

## Phase 2 — Identity, stalls, drafts, and publishing

### Outcome

Community members can publish immutable benchmark versions.

### Deliverables

- first-login local user synchronization
- handle setup and stall profile
- protected profile settings
- benchmark stable identity
- mutable drafts
- autosave
- public sample editor
- track/scoring editor
- sealed-set policy editor
- limitations and source fields
- live card preview
- publish validation
- immutable version snapshot
- version history and successor drafts
- basket saves
- owner dashboard or draft list
- audit events for publish actions

### Exit gate

A GitHub-authenticated user can create a complete benchmark page without code, and cannot mutate the published version afterward.

## Phase 3 — Manual receipts and trustworthy scoreboards

### Outcome

People can attach results with explicit evidence levels.

### Deliverables

- canonical model registry
- exact model ID entry and ambiguity warnings
- manual receipt form
- public artifact links
- self-reported versus artifact-linked labels
- compatibility validation
- scoped scoreboard query
- all-receipts view
- supersession flow
- owner official designation
- dispute flow
- receipt social cards and Markdown badge
- counters and reconciliation tool

### Exit gate

Every ranking row links to a receipt with exact version, track, model ID, method, item count, metrics, and evidence label. Incompatible runs do not rank together.

## Phase 4 — Signed local runner protocol

### Outcome

Benchmark authors can keep scored sets private and publish machine-signed receipts.

### Deliverables

- `packages/protocol`
- manifest and receipt runtime schemas
- JSON Schemas
- RFC 8785 canonicalization
- SHA-256 digest helpers
- Ed25519 test vectors
- runner registration UI
- local key generation instructions
- reference runner CLI
- signed receipt generation
- Convex HTTP ingestion action
- signature, scope, and nonce verification
- key suspension, revocation, and rotation
- runner-signed UI label
- sanitized audit events

### Exit gate

An author can run a benchmark entirely in a private environment and publish a signed aggregate receipt. BenchBazaar never receives the hidden set.

## Phase 5 — Community trust and moderation

### Outcome

The site can accept broader submissions without becoming unmanageable.

### Deliverables

- report forms
- moderation queue
- benchmark hide/suspend actions
- receipt dispute/invalid actions
- runner suspension
- public moderation notes
- curator's cart management
- unreviewed versus curated labels
- independent reproduction detection and review
- transparent ranking definitions
- content and privacy policies
- account suspension/deletion handling

### Exit gate

One moderator can resolve common abuse and provenance problems without accessing hidden data or editing history silently.

## Phase 6 — Run requests without automatic secrets

### Outcome

Visitors can request tests against specific models while execution remains operator-controlled.

### Deliverables

- request form
- request status page
- owner approval/decline
- run assignment to a registered runner
- reactive status timeline
- quotas and leakage budgets
- owner/provider-account execution path
- receipt linkage
- failure codes and retries
- no requester provider-key storage

### Exit gate

A requester can ask for a model run, an owner can execute it privately, and the resulting receipt closes the request.

## Phase 7 — Author-hosted remote runners

### Outcome

Approved requests can be executed automatically by an author-operated service.

### Deliverables

- runner health and capability metadata
- run job table
- atomic lease protocol
- idempotency keys
- signed job/receipt binding
- durable retry behavior
- per-benchmark leakage policy enforcement
- model-target adapters that do not require permanent general-purpose keys in Convex
- endpoint exposure labels
- anomaly and extraction controls

### Exit gate

A remote runner can lease a job, evaluate a model target, and publish one signed receipt without exposing the hidden set to the website or returning item-level feedback.

## Phase 8 — Managed API-model runs

### Outcome

BenchBazaar can offer a small curated set of official API-model runs.

### Deliverables

- site-owned provider accounts
- per-provider adapter layer
- budgets and quotas
- no-training/retention policy documentation per provider
- durable chunked workflows
- token and cost accounting
- run cancellation
- provider-specific exact model identity
- incident and key-rotation procedures

### Exit gate

A small number of supported models can be evaluated safely within explicit budget and data-use policies. Arbitrary user keys remain out of scope unless separately reviewed.

## Phase 9 — Managed encrypted sealed bundles

### Outcome

Authors may optionally store encrypted test bundles for a site-operated runner.

### Prerequisite

A dedicated security review and a clear operational need.

### Deliverables

- local encryption CLI
- envelope encryption design
- ciphertext upload
- key wrapping or KMS integration
- sealed-asset table
- internal-only blob access
- chunked decryption/evaluation
- rotation and destruction
- backup/key policy
- leak regression tests
- owner-facing trust statement

### Exit gate

Ciphertext can be stored and evaluated without creating a public download path. Documentation clearly states that the server runtime still sees plaintext during evaluation.

## Phase 10 — Stronger private evaluation research

Possible directions:

- trusted execution environments;
- bring-model-to-data workflows for open weights;
- reproducible runner images and attestations;
- benchmark generation with secret parameterization;
- watermark or canary tooling;
- third-party trusted evaluators;
- confidential-computing collaborations.

These are optional. BenchBazaar is useful without them.

## Ongoing workstreams

### Content

- seed high-quality benchmarks;
- improve limitation templates;
- publish curator collections;
- highlight reproducibility stories.

### Design

- refine market illustrations;
- tune social cards;
- test mobile publishing;
- keep motion restrained;
- improve accessibility.

### Reliability

- reconcile counters;
- backup and restore drills;
- monitor ingestion failures;
- review dependency updates;
- test auth preview environments.

### Security

- leak regression suite;
- key rotation drills;
- abuse-rate tuning;
- incident tabletop exercises;
- review external runner protocol.

## Features intentionally absent from the roadmap

Until real demand proves otherwise:

- comments;
- follower counts;
- DMs;
- paid stalls;
- advertising;
- engagement feed;
- global model intelligence score;
- arbitrary code upload;
- browser-side hidden-set execution;
- general GPU cloud;
- benchmark NFT or token mechanics.
