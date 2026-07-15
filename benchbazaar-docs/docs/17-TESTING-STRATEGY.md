# Testing strategy

BenchBazaar must be pleasant to use and difficult to accidentally leak. Testing therefore covers ordinary product behavior, protocol correctness, authorization, and **absence of sealed content**.

The default rule is:

> Production hidden items never enter the normal development, preview, analytics, or CI environment.

All automated tests use synthetic fixtures with unmistakable sentinel strings.

## Goals

The test suite must establish that:

- Public catalog pages are fast, accessible, and understandable.
- Authentication and authorization boundaries work on the server, not only in the UI.
- Published benchmark versions are immutable.
- Leaderboards compare only compatible receipts.
- Receipt signatures and digests are deterministic and verifiable across implementations.
- Sealed benchmark bytes never appear in browser payloads, generated assets, logs, error reports, search indexes, or public Convex functions.
- A failed or malicious run cannot corrupt benchmark metadata or another user's data.
- Agents can run the relevant checks locally before declaring a task complete.

## Test data classification

Use three fixture classes.

### Public fixtures

Safe to include in the repository:

- Benchmark titles and descriptions
- Display-only free samples
- Fake model identities
- Aggregate fake scores
- Public manifests

### Synthetic sealed fixtures

Safe only because they are deliberately fake:

```text
SEALED_SENTINEL_DO_NOT_EXPOSE_7f91d2e4
```

Synthetic sealed fixtures should resemble the shape of a hidden benchmark item but contain no production or author-supplied material. Each suite receives a unique sentinel so a leak can be traced to its source.

### Production sealed data

Never committed, copied into test fixtures, uploaded to preview deployments, or included in bug reports. Production hidden sets are exercised only by their authorized runner environment.

## Test layers

## 1. Protocol unit tests

Test the manifest and receipt packages without the web application.

Required cases:

- Valid public manifest parses.
- Unknown schema version is rejected safely.
- Required fields cannot be omitted.
- Canonical JSON is byte-for-byte stable.
- Map key ordering does not alter signed bytes.
- Number and Unicode handling follow the canonicalization contract.
- An Ed25519 signature verifies for the exact payload.
- Any payload mutation invalidates the signature.
- A signature from the wrong runner key is rejected.
- Receipt IDs are deterministic where specified and unique where specified.
- Digests include benchmark version, track, scorer configuration, and hidden-set revision.
- Model aliases never replace the exact model identifier stored on the receipt.
- Timestamps outside the accepted replay window are rejected at ingestion.
- Duplicate receipt submission is idempotent.

Keep stable cross-language test vectors under a path such as:

```text
packages/protocol/test-vectors/
  manifest.valid.json
  receipt.unsigned.json
  receipt.canonical.txt
  receipt.signature.hex
  runner.public-key.hex
```

A future Python or Rust runner must be able to verify these same vectors.

## 2. Convex function tests

Use `convex-test` for focused query and mutation behavior. Use a local Convex backend for behavior that depends on the full runtime or HTTP actions.

Required authorization matrix:

| Operation                    | Anonymous | Authenticated user    | Benchmark owner       | Curator/admin      | Registered runner                |
| ---------------------------- | --------- | --------------------- | --------------------- | ------------------ | -------------------------------- |
| Read published benchmark     | Allow     | Allow                 | Allow                 | Allow              | Allow                            |
| Read draft                   | Deny      | Own only              | Own only              | Policy-based       | Deny                             |
| Create draft                 | Deny      | Allow                 | Allow                 | Allow              | Deny                             |
| Edit published version       | Deny      | Deny                  | Deny                  | Deny               | Deny                             |
| Create successor version     | Deny      | Deny                  | Allow                 | Policy-based       | Deny                             |
| Submit unsigned result       | Deny      | Allow to review queue | Allow to review queue | Allow              | Deny                             |
| Submit runner receipt        | Deny      | Deny                  | Deny                  | Deny               | Allow with valid signature       |
| Change another user's basket | Deny      | Deny                  | Deny                  | Deny               | Deny                             |
| Reveal sealed asset          | Deny      | Deny                  | Deny                  | Deny by public API | Runner path only, when supported |

Required domain cases:

- Draft-to-published transition creates an immutable version.
- Creating a new version does not mutate old receipts.
- Deleting a user does not orphan public benchmark attribution.
- An incompatible receipt is stored but excluded from the default leaderboard.
- A superseded receipt remains auditable.
- Search returns only published, visible records.
- Report and moderation actions write audit events.
- Runner key rotation preserves verification of historical receipts.
- Revoked runners cannot submit new receipts.
- Rate limits and replay checks are enforced server-side.

## 3. Web component tests

Test behavior, not implementation details.

High-value components:

- `MarketCard`
- `PriceTag`
- `InspectorStamp`
- `FreeSample`
- `Scoreboard`
- `ReceiptView`
- `PublishForm`
- `RunnerStatus`
- `MysteryCrateButton`

Required checks:

- Playful labels include or expose plain-language meaning.
- Keyboard users can operate every interactive element.
- Focus is visible.
- Reduced-motion preferences disable nonessential movement.
- Loading, empty, error, and permission-denied states are deliberate.
- Receipt metadata remains readable on a narrow viewport.
- Scores are not communicated by color alone.
- Long model IDs and hashes wrap without destroying layout.

## 4. Browser end-to-end tests

Run a small, reliable suite against an isolated environment.

### Anonymous discovery journey

1. Open the homepage.
2. Search for a benchmark.
3. Filter by aisle and modality.
4. Open a listing.
5. Reveal a public free sample.
6. Open a receipt.
7. Confirm the source and limitations are visible.

### Publisher journey

1. Sign in through a test authentication path.
2. Create a vendor profile.
3. Create a benchmark draft.
4. Add public samples and a track.
5. Preview the exact public page.
6. Publish version `1.0.0`.
7. Confirm immutable fields can no longer be edited.
8. Create a successor draft.

### Receipt journey

1. Register a synthetic runner key.
2. Create a run request.
3. Submit a correctly signed synthetic receipt.
4. Confirm it enters the expected verification state.
5. Confirm it appears only on a compatible scoreboard.
6. Resubmit the same receipt and verify idempotency.
7. Tamper with one field and confirm rejection.

### Moderation journey

1. Report a benchmark or receipt.
2. Confirm the report is private.
3. Apply a curator action.
4. Confirm the public status and audit event change together.

Do not make the suite dependent on a live commercial model provider.

## 5. Sealed-data leak regression tests

This is a release gate, not an optional security enhancement.

### Sentinel scan

During CI:

1. Generate a synthetic hidden item with a unique sentinel.
2. Exercise the relevant runner or ingestion path.
3. Build the production web application.
4. Scan generated JavaScript, HTML, CSS, source maps, server bundles, snapshots, logs, test reports, and exported fixtures for the sentinel.
5. Query every public API and public Convex query available to the test principal.
6. Fail the build if the sentinel appears anywhere except the explicitly allowed private runner memory or temporary encrypted fixture.

Suggested scan targets:

```text
.dist/
build/
.output/
coverage/
playwright-report/
test-results/
*.log
*.map
```

### Network assertion

Instrument the browser and assert that no hidden item appears in:

- Page HTML
- Convex WebSocket messages visible to the client
- Fetch responses
- Analytics payloads
- Error-reporting payloads
- Social-card generation requests

### Logging assertion

Send a synthetic hidden item through the runner and deliberately trigger:

- A provider timeout
- A scorer exception
- A malformed model response
- A receipt upload failure

Logs must contain only item IDs, hashes, counts, and sanitized error classes—not prompt or expected-answer bodies.

### Public-file assertion

No route may return a direct public URL for a sealed asset. Tests should fail if a sealed storage identifier is converted into a client-visible download URL.

## 6. Security tests

Required abuse cases:

- Cross-user draft access
- ID enumeration
- Forged WorkOS identity fields
- Missing server-side role checks
- CSRF against state-changing server endpoints
- Replay of signed receipts
- Signature algorithm confusion
- Runner ID/key mismatch
- Oversized receipt payloads
- Path traversal in runner-local bundle loading
- SSRF through artifact or source URLs
- Markdown/script injection
- Malicious SVG uploads
- Search-query abuse
- Request flooding against run creation
- Repeated runs intended to reconstruct a hidden set

The extraction-abuse suite should verify:

- Per-user, per-organization, per-model, and per-benchmark quotas
- Cooldowns
- Randomized subsets where configured
- No item-level correctness feedback
- No stable ordering of hidden items
- Audit events for suspicious run patterns

## 7. Accessibility tests

Automated checks are necessary but insufficient.

Before release, manually test:

- Complete keyboard navigation
- Screen-reader landmarks and heading structure
- Dialog focus trapping and restoration
- Form error association
- Receipt tables on mobile
- 200% browser zoom
- Reduced motion
- High contrast
- Meaning without emoji or color

Target WCAG 2.2 AA for core flows.

## 8. Performance tests

Performance budgets for the public catalog:

- No sealed data is fetched, so public pages should remain cacheable and lightweight.
- Avoid loading editor, cryptography, or runner code on anonymous browse pages.
- Catalog filtering should feel immediate for the expected side-project scale.
- Search and benchmark-page queries must use indexes rather than unbounded scans.
- Dynamic social-card generation must have a deterministic fallback.

Measure at least:

- Homepage and benchmark-page JavaScript payloads
- Server response latency
- Convex query duration and rows scanned
- Search latency
- Largest contentful paint on a mid-range mobile profile

Budgets may be updated after the first production baseline, but regressions need an explicit reason.

## 9. Manual release checklist

Before an MVP release:

- [ ] All protocol vectors pass.
- [ ] Convex authorization matrix passes.
- [ ] Browser journeys pass.
- [ ] Leak-regression scan passes on a production build.
- [ ] No production hidden data exists in local or preview infrastructure.
- [ ] GitHub login succeeds and account linking behavior is understood.
- [ ] A runner key can be registered, rotated, and revoked.
- [ ] A valid receipt is accepted; a tampered receipt is rejected.
- [ ] A published version cannot be edited in UI or backend.
- [ ] Public pages expose limitations and receipt provenance.
- [ ] Rate-limit and abuse controls are active.
- [ ] Error reporting is scrubbed.
- [ ] Accessibility smoke test passes.
- [ ] Backups and rollback are tested.

## CI shape

A practical initial pipeline:

```text
install
  ├─ typecheck
  ├─ lint
  ├─ protocol unit tests
  ├─ component tests
  ├─ convex-test suite
  ├─ production build
  ├─ sealed sentinel scan
  └─ small browser suite
```

Run heavier local-backend and security suites on the default branch and before releases if they are too slow for every pull request.

## Definition of done for coding agents

An agent must not mark a task complete merely because the happy path renders. A completed task includes:

- Tests for its behavior and permissions
- A failure state
- Loading and empty states where applicable
- No new sealed-data exposure path
- Updated docs when behavior changes
- Successful typecheck, relevant tests, and leak scan
