# BenchBazaar implementation status

As of 2026-07-28, the repository implements Phases 0–6 at the code and automated-test
level. This page separates repository evidence from provider or real-world evidence that
cannot be inferred from code.

## Verified in this checkout

- CI is configured to run formatting, linting, strict TypeScript, 46 unit/Convex tests,
  production build, leak scanning, and selected Playwright smoke tests. The same commands
  pass locally; a GitHub-hosted run requires these uncommitted changes to be published.
- The Playwright suite passes the public visitor journey through browse, an exact
  benchmark version, and a receipt, plus health, security-header, keyboard, and
  reduced-motion checks.
- Publishing preserves immutable versions and public sample separation; manual receipts
  preserve exact compatibility facts and append-only correction history.
- Protocol and runner tests cover complete runtime/JSON schemas, canonical JSON, digest
  and fingerprint behavior, signature tampering, registration, scope, replay,
  suspension, revocation, and signed receipt facts. The sample CLI workflow has been run
  locally from key generation through signature verification.
- Moderation tests cover reporting, authorization, discovery hiding, audit events,
  independent reproduction, and curator collections.
- Run-request tests cover authorization, valid/invalid transitions, exact runner and
  signed-receipt linkage, unsafe endpoint rejection, and user/benchmark/model/endpoint
  leakage-budget records.
- Operational tests cover redaction, upload metadata policy, and save/receipt counter
  repair. Production output passes the sealed-content leak scan.
- Production startup requires explicit, matching WorkOS and Convex environment labels and
  exact same-origin HTTPS callback configuration. Fly.io, backup/restore, rollback,
  monitoring, and incident contracts are committed.
- Production launch readiness rejects fewer than 12 published benchmarks, synthetic
  benchmarks, synthetic receipts, and benchmarks without an admin-recorded owner consent.
  The admin launch workspace lists only non-synthetic published benchmarks, preserves the
  exact attestation, records optional HTTPS evidence, and rejects synthetic consent.

## External gates not yet verified

- `[!]` WorkOS staging GitHub OAuth is currently marked `Invalid`; a live GitHub callback,
  repeat sign-in, cancel, and logout journey therefore cannot pass.
- `[!]` WorkOS production currently has no GitHub OAuth credential, redirect URI, logout
  URI, web origin, or application API key.
- `[!]` No real consented benchmark package has been supplied. The development catalog
  remains visibly synthetic, and no synthetic records should be loaded into production.
- `[!]` A Fly app/domain and production Convex deployment have not been released from
  this checkout. Provider resources must be selected with real account/domain values and
  secret injection; placeholders are intentionally not invented. The connected Stripe
  Projects account is not enabled for provisioning, so it could not create the selected
  hosting resource.
- `[~]` Convex's local test harness cannot emulate storage metadata syscalls. Upload type
  and size policy is unit-tested, but one authenticated real-storage upload must be
  included in the controlled staging journey.
- `[~]` The backup/restore procedure is documented but still needs a recorded isolated
  restore drill before launch.

These are launch gates, not hidden TODOs. The production readiness query and environment
validator fail closed until the underlying evidence exists.
