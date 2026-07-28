# MVP acceptance criteria

The MVP is complete only when all required criteria below pass. “Looks good in a demo” is not sufficient.

## 1. Public understanding

- [ ] The homepage states that BenchBazaar is for community-made LLM benchmarks.
- [ ] The homepage explains that official scored sets can remain sealed.
- [ ] The homepage includes browse, publish, and mystery-crate actions.
- [ ] A first-time visitor can reach a benchmark, a free sample, and a receipt without signing in.
- [ ] Market-themed labels include clear plain-language context.

## 2. Browse and discovery

- [ ] Published benchmarks can be searched by title, summary, tags, aisle, and author handle.
- [ ] Browse filters are represented in the URL.
- [ ] Results paginate.
- [ ] Empty and error states exist.
- [ ] Mystery crate never returns drafts, hidden content, or suspended listings.
- [ ] Homepage ranking rules are visible and do not use pageviews as quality.

## 3. Benchmark pages

- [ ] Every published benchmark page shows exact version.
- [ ] Historical versions have stable URLs.
- [ ] At least three public samples can be displayed.
- [ ] Every sample says it is public and excluded from official scoring.
- [ ] Purpose, method, tracks, scoring, and limitations are visible.
- [ ] Sealed-set mode and endpoint exposure caveat are visible.
- [ ] Version history and changelog work.
- [ ] Deprecated versions remain inspectable.

## 4. Authentication and profiles

- [ ] WorkOS AuthKit is integrated through current official TanStack Start guidance.
- [ ] AuthKit middleware does not disable CSRF protection for server functions.
- [ ] GitHub social login works in development and production configuration.
- [ ] Convex validates the WorkOS token.
- [ ] First sign-in creates or updates a local user profile.
- [ ] Public stall pages never expose email or WorkOS IDs.
- [ ] Suspended users cannot write.
- [ ] Safe internal return paths survive sign-in; external open redirects are rejected.

## 5. Drafts and publishing

- [ ] A signed-in user can create a benchmark draft.
- [ ] Only the owner can read or edit the draft.
- [ ] Draft autosave has visible success/error state.
- [ ] The contributor supplies a title, short card description, full explanation, and
      exactly three public samples.
- [ ] Slugs, versions, and public sample IDs are generated automatically.
- [ ] An optional repository URL must identify a valid public GitHub repository.
- [ ] Public samples have display-only confirmation.
- [ ] The form warns against pasting hidden test items.
- [ ] At least one valid track and primary metric are required.
- [ ] Publishing creates an immutable version snapshot.
- [ ] A published version cannot be patched by client mutation.
- [ ] A correction creates a successor version.
- [ ] Publish writes an audit event.

## 6. Receipts and scoreboards

- [ ] Manual receipts support exact benchmark version, track, model ID, metrics, item count, scorer version, and date.
- [ ] Manual receipts are labeled self-reported by default.
- [ ] A valid public artifact can produce artifact-linked status through server logic.
- [ ] A submitter cannot assign runner-signed or independently reproduced status.
- [ ] Every scoreboard row links to a receipt.
- [ ] Default scoreboards compare one exact version and track only.
- [ ] Tool-enabled and no-tool tracks are not mixed.
- [ ] Invalid and superseded receipts do not rank.
- [ ] Disputed receipts are excluded by default but remain historically visible.
- [ ] Exact model IDs are preserved.
- [ ] Ambiguous mutable aliases receive a warning.

## 7. Signed runner

- [ ] A user can register an Ed25519 public key.
- [ ] Private keys are never uploaded or stored.
- [ ] A reference CLI can validate a manifest and create a receipt.
- [ ] Receipt JSON is canonicalized with RFC 8785.
- [ ] The CLI signs canonical payload bytes.
- [ ] The Convex HTTP action verifies the signature.
- [ ] Runner scope is checked against benchmark ownership/authorization.
- [ ] Duplicate `(runner, nonce)` receipts are rejected atomically.
- [ ] Revoked or suspended runner keys cannot submit new receipts.
- [ ] A valid signed receipt displays runner identity and key fingerprint.
- [ ] Signature validity is explained without implying scientific endorsement.

## 8. Sealed-data protection

- [ ] Real hidden prompts and answers are not stored in the MVP Convex database.
- [ ] No browser query or route loader contains sealed content.
- [ ] No client bundle or committed fixture contains hidden content.
- [ ] No runner-ingestion logs capture request bodies.
- [ ] No receipt or social card contains hidden prompt text.
- [ ] Public samples are distinct from hidden items by policy and ID.
- [ ] The UI states that a model endpoint may observe prompts.
- [ ] No browser-side decryption design is used.
- [ ] No hidden asset is exposed through `storage.getUrl()`.
- [ ] A documented rotation/incident path exists.

## 9. Moderation

- [ ] Signed-in users can report a benchmark or receipt.
- [ ] Reports are rate-limited.
- [ ] Moderators can hide a benchmark from discovery.
- [ ] Moderators can dispute or invalidate a receipt with a reason.
- [ ] Moderators can suspend a runner key.
- [ ] All moderation actions create audit events.
- [ ] Moderation tools do not expose sealed content.

## 10. Design and accessibility

- [ ] The interface has a coherent market visual identity.
- [ ] Benchmark cards, price tags, stamps, free samples, receipts, and aisle signs use shared components.
- [ ] The site is usable on mobile, tablet, and desktop.
- [ ] Core flows work by keyboard.
- [ ] Focus states are visible.
- [ ] Status is not communicated by color alone.
- [ ] Free-sample reveal has correct accessible state.
- [ ] Motion respects reduced-motion preferences.
- [ ] Receipt text is selectable and follows semantic reading order.
- [ ] Contrast passes accessibility checks for normal text and controls.

## 11. Security

- [ ] Every public Convex function validates arguments.
- [ ] Owner and role checks occur server-side.
- [ ] User IDs are derived from validated auth identity.
- [ ] Markdown raw HTML is disabled or safely sanitized.
- [ ] External links reject unsafe schemes.
- [ ] File uploads enforce size and type limits.
- [ ] Secrets are server-only and absent from logs.
- [ ] HTTP ingestion uses size limits, content-type checks, and rate limits.
- [ ] Replay, signature, authorization, and redaction tests pass.
- [ ] Production security headers are configured.

## 12. Reliability and operations

- [ ] Development and production WorkOS environments are separate.
- [ ] Development and production Convex deployments are separate.
- [ ] Required environment variables are documented.
- [ ] CI runs type checking, linting, unit tests, Convex tests, and selected end-to-end tests.
- [ ] Seed data can be loaded reproducibly.
- [ ] Counter reconciliation exists for receipt/save counts.
- [ ] Error monitoring redacts sensitive payloads.
- [ ] A backup/export procedure is documented.
- [ ] A rollback procedure is documented.

## 13. Launch content

- [ ] At least 12 polished seeded benchmarks exist.
- [ ] Every aisle has content.
- [ ] Seeded benchmarks include useful and funny examples.
- [ ] Each seeded benchmark has honest limitations.
- [ ] Receipt pages demonstrate all important evidence states.
- [ ] No seed content is represented as a real model result unless it actually is one.
- [ ] Synthetic demo results are labeled synthetic outside production launch data.

## 14. Final launch gate

The project may launch when:

- all critical security and sealed-data criteria pass;
- no high-severity known issue remains in auth, authorization, receipt signatures, or data exposure;
- one complete author journey and one complete visitor journey pass end-to-end;
- the public explanation makes modest, accurate claims;
- the site is delightful enough that a benchmark or receipt screenshot is recognizable as BenchBazaar.
