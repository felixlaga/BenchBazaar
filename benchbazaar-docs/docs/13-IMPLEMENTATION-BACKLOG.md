# Implementation backlog

Tasks are ordered to create vertical slices. Each task should be small enough for one focused agent change. Do not skip security tasks because the UI is more visible.

Status notation for the repository once implementation begins:

```text
[ ] not started
[~] in progress
[x] complete
[!] blocked
```

## Epic A — Repository foundation

### BB-001 Initialize TanStack Start application

- Create TypeScript strict project.
- Add TanStack Router/Start structure.
- Add base document, metadata, error boundary, and not-found route.
- Acceptance: public index route renders server-side.

### BB-002 Connect Convex

- Initialize Convex.
- Add current official TanStack Start + Convex query integration.
- Add development environment validation.
- Acceptance: seeded public query renders through route.

### BB-003 Configure WorkOS AuthKit

- Add current TanStack Start AuthKit package.
- Configure middleware, callback, sign-in, sign-up if enabled, and sign-out.
- Pair AuthKit request middleware with TanStack Start CSRF middleware for server-function RPC endpoints.
- Enable GitHub social login in documented environment setup.
- Acceptance: user can authenticate and return safely.

### BB-004 Bridge WorkOS identity to Convex

- Add `convex/auth.config.ts`.
- Pass server/client access token correctly.
- Add protected query returning safe current-user summary.
- Acceptance: Convex validates signed-in identity.

### BB-005 Add quality tooling

- Type check, lint, format, Vitest, and browser test runner.
- Add no-floating-promises and Convex-relevant lint rules where practical.
- Add CI workflow.
- Acceptance: empty baseline CI passes.

### BB-006 Add environment validation

- Create server/public environment modules.
- Fail clearly when required values are absent.
- Prevent secrets from public imports.
- Acceptance: secret variables cannot be imported by client modules.

## Epic B — Design foundation

### BB-007 Add design tokens and typography

- Implement CSS variables, font loading, body styles, focus styles.
- Acceptance: accessible base page with no layout shift beyond acceptable font behavior.

### BB-008 Build global shell

- Header, mobile menu, footer, search entry, auth state.
- Acceptance: responsive and keyboard accessible.

### BB-009 Build core branded components

- `MarketCard`
- `AwningHeader`
- `PriceTag`
- `InspectorStamp`
- `StatusBanner`
- Acceptance: component examples cover states and reduced motion.

### BB-010 Build sample and receipt components

- `FreeSampleCard`
- `Receipt`
- `Scoreboard`
- Acceptance: semantic HTML and mobile layouts pass accessibility checks.

## Epic C — Public data and seed catalog

### BB-011 Implement public schema subset

- `users`, `benchmarks`, `benchmarkVersions`, `publicSamples`, `models`, `receipts`.
- Add required indexes and validators.
- Acceptance: schema deploys; no sealed content fields exist.

### BB-012 Create synthetic seed loader

- At least 12 benchmarks and 20 receipts.
- Label data as synthetic in nonproduction.
- Acceptance: repeatable and idempotent seed command.

### BB-013 Build public card queries

- Homepage and browse view models.
- No N+1 client reads.
- Acceptance: bounded, indexed queries.

### BB-014 Build homepage

- Hero, aisles, fresh stock, curator cart, receipts, best sellers, sealed explainer.
- Acceptance: works with seeded data and empty fallbacks.

### BB-015 Build browse/search

- Search index, URL filters, pagination, sorts.
- Acceptance: search and filter combinations are shareable.

### BB-016 Build aisle page

- Editorial heading, newest, reproduced, browse link.
- Acceptance: unknown aisle returns 404.

### BB-017 Build mystery crate

- Eligible random benchmark selection.
- Rate-limit if endpoint is server-based.
- Acceptance: never returns ineligible content.

## Epic D — Public detail pages

### BB-018 Build benchmark version query

- Exact current and historical version view models.
- Include samples, tracks, compatible receipts, version history.
- Acceptance: only public fields returned.

### BB-019 Build benchmark page

- Header, tags, sealed explainer, samples, scoreboard, method, limits, versions.
- Acceptance: exact version is always visible.

### BB-020 Build scoped scoreboard

- Exact version + track grouping.
- Best valid receipt per exact model.
- Acceptance: incompatible receipts cannot appear together.

### BB-021 Build receipt page

- Thermal-paper design and plain interpretation.
- Signature/evidence facts and disputes.
- Acceptance: no hidden data in page or social metadata.

### BB-022 Build stall page

- Public profile, authored benchmarks, receipts.
- Acceptance: email and external auth ID absent.

### BB-023 Build model page

- Canonical identity and grouped receipts.
- No aggregate score.
- Acceptance: mutable aliases visibly warned.

### BB-024 Build social image routes

- Benchmark and receipt cards using public data only.
- Acceptance: static screenshot tests; no sealed content inputs.

## Epic E — Users and profiles

### BB-025 Implement local user synchronization

- First authenticated request creates/updates local user.
- Acceptance: idempotent by WorkOS external ID.

### BB-026 Implement handle setup

- Normalize, validate, check uniqueness.
- Acceptance: race-safe uniqueness check in mutation.

### BB-027 Build profile settings

- Display name, avatar, bio, GitHub link.
- Acceptance: private fields never enter public query.

### BB-028 Build basket saves

- Save/remove and basket route.
- Acceptance: uniqueness and count updates are atomic.

## Epic F — Drafts and publishing

### BB-029 Add draft tables and authorization helpers

- `benchmarkDrafts`, `draftSamples`.
- `requireUser`, `requireBenchmarkOwner`.
- Acceptance: non-owner tests fail access.

### BB-030 Build draft creation and autosave

- Create on first meaningful save.
- Narrow field update mutations.
- Acceptance: visible save status and recovery from errors.

### BB-031 Build listing and purpose editor

- Title, slug, summary, aisle, tags, capability fields.
- Live card preview.
- Acceptance: validation and responsive editor.

### BB-032 Build public sample editor

- Add/reorder/delete samples.
- Display-only confirmation.
- Hidden-data warning.
- Acceptance: minimum sample rule and stable IDs.

### BB-033 Build track and scoring editor

- Track IDs, prompt/tool/retry policy, scorer, metric direction.
- Acceptance: duplicate IDs rejected.

### BB-034 Build sealed policy editor

- Mode, digest, item-count disclosure, rotation, endpoint caveat.
- No hidden data fields.
- Acceptance: form cannot upload/paste full set.

### BB-035 Build source, license, and limitations editor

- Require limitation.
- Validate safe URLs.
- Acceptance: unsafe schemes rejected.

### BB-036 Implement publish mutation

- Validate, canonicalize manifest, digest, snapshot version/samples, update stable benchmark, audit.
- Acceptance: atomic and idempotent enough to prevent partial current version.

### BB-037 Build publish confirmation and successor flow

- Immutable warning.
- Clone current version into new draft.
- Acceptance: old version unchanged.

## Epic G — Manual receipts

### BB-038 Implement model registry

- Canonical ID lookup/create with moderation rules.
- Acceptance: submitted exact string preserved.

### BB-039 Build manual receipt form

- Exact version, track, model, metrics, count, date, artifact.
- Acceptance: status always server-assigned.

### BB-040 Implement receipt compatibility validation

- Manifest, track, metric, scorer, item-count checks.
- Acceptance: incompatible receipt stored warning or rejected according to policy, never ranked.

### BB-041 Add artifact-linked evidence

- Validate safe public artifact metadata without risky server fetch in MVP.
- Acceptance: label means link is present/structured, not content truth.

### BB-042 Add receipt supersession

- New receipt references old; old becomes superseded.
- Acceptance: history remains visible.

### BB-043 Add owner official designation

- Owner-only evidence action.
- Acceptance: cannot change signature facts.

## Epic H — Protocol package and signed runner

### BB-044 Create protocol schemas

- Manifest and receipt validators and JSON Schemas.
- Acceptance: shared between web, Convex, and runner.

### BB-045 Implement RFC 8785 canonicalization and digests

- Add deterministic test vectors.
- Acceptance: key order changes do not alter canonical bytes.

### BB-046 Implement Ed25519 helpers

- Generate, sign, verify, fingerprint.
- Acceptance: RFC-compatible test vectors and tamper failure.

### BB-047 Add runner schema and registration UI

- Public key only, scope, status.
- Acceptance: private-key warning and no private field.

### BB-048 Build reference runner CLI skeleton

Commands:

```text
bb-runner keygen
bb-runner validate-manifest
bb-runner sign-receipt
bb-runner submit-receipt
```

- Acceptance: local sample workflow works against development.

### BB-049 Implement receipt HTTP action

- Body limit, schema, signature, scope, nonce, internal insert.
- Acceptance: no raw-body logs; stable error codes.

### BB-050 Implement replay and revocation tests

- Duplicate nonce, duplicate ID, suspended key, revoked key.
- Acceptance: all rejected atomically.

### BB-051 Add runner-signed receipt UI

- Fingerprint, runner profile, precise explanation.
- Acceptance: signature does not display as generic scientific verification.

## Epic I — Moderation and trust

### BB-052 Add reports

- Benchmark and receipt forms, rate limits.
- Acceptance: no sealed content requested.

### BB-053 Build moderation queue

- Role-protected pages and indexed queries.
- Acceptance: nonmoderator inaccessible server-side.

### BB-054 Add benchmark hide/suspend

- Discovery exclusion and visible owner state.
- Acceptance: direct historical URLs follow policy.

### BB-055 Add receipt dispute/invalid states

- Reason, audit event, scoreboard exclusion.
- Acceptance: history remains visible or tombstoned.

### BB-056 Add runner suspension/revocation

- Key lifecycle UI and backend enforcement.
- Acceptance: old receipts still show historical signature validity.

### BB-057 Add independent reproduction workflow

- Candidate detection, tolerance, separate operators, moderator/owner review.
- Acceptance: same runner cannot self-reproduce.

### BB-058 Add curator collection management

- Ordered entries and editorial notes.
- Acceptance: ranking rule is public.

## Epic J — Run requests

### BB-059 Add run-request schema and state machine

- Dedicated transition mutations.
- Acceptance: invalid transitions rejected.

### BB-060 Build request form and status page

- No provider key fields.
- Endpoint exposure acknowledgement.
- Acceptance: reactive status timeline.

### BB-061 Build owner approval workflow

- Approve, decline, assign runner, link receipt.
- Acceptance: only authorized owners/operators act.

### BB-062 Add leakage-budget rate limits

- Per user, benchmark, model, endpoint category.
- Acceptance: policy tests and friendly errors.

## Epic K — Operations and hardening

### BB-063 Add structured redacted logging

- Request IDs and safe error codes.
- Acceptance: automated secret/content redaction test.

### BB-064 Add security headers and CSP

- Compatible with WorkOS and deployment.
- Acceptance: no blocked required auth flow; security scan clean enough for launch.

### BB-065 Add upload validation

- Public images only in MVP.
- Acceptance: active SVG/HTML and oversized files rejected.

### BB-066 Add counter reconciliation

- Internal admin actions for saves and receipts.
- Acceptance: seeded corruption can be repaired.

### BB-067 Add backup and rollback runbook

- Export, restore boundaries, secret separation.
- Acceptance: documented rehearsal in nonproduction.

### BB-068 Run leak regression audit

- Search bundles, queries, logs, snapshots, social cards.
- Acceptance: checklist signed off before launch.

### BB-069 Complete end-to-end launch suite

- Visitor journey, publisher journey, receipt journey, runner journey, moderator journey.
- Acceptance: stable in CI or documented controlled test environment.

### BB-070 Launch-content pass

- Replace synthetic production content with real, consented entries.
- Verify limitations and claims.
- Acceptance: no demo score presented as real.
