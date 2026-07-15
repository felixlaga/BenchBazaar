# Security policy

BenchBazaar handles public benchmark metadata, identities, signed evaluation receipts, and—in some future deployment modes—confidential benchmark material. A leak of a hidden scored set can permanently reduce a benchmark's value, so sealed-data reports are treated as high severity.

## Reporting a vulnerability

Use the repository's **private security advisory** feature when available. If that is unavailable, contact the repository owner privately using the contact method listed on the owner's GitHub profile.

Do not open a public issue for a vulnerability involving:

- Authentication or authorization bypass
- Hidden benchmark disclosure
- A direct or indirect sealed-file URL
- Receipt forgery or signature bypass
- Runner private-key exposure
- Provider credential exposure
- Cross-user draft access
- A practical hidden-set extraction technique
- Stored script injection
- Sensitive log or error-report leakage

Include:

- A concise description
- Affected route, function, runner, or protocol version
- Reproduction steps using synthetic data wherever possible
- Security impact
- Logs or screenshots with secrets and hidden content removed
- A suggested fix, when known

Never send a production hidden item merely to prove the report. Use a synthetic sentinel.

## Research guidelines

Good-faith security research is welcome when it:

- Uses your own account and synthetic benchmark
- Avoids accessing another person's data
- Avoids degrading service for others
- Stops after establishing the minimum evidence
- Does not publish details before a fix or coordinated disclosure
- Does not attempt to extract a real author's hidden set

No authorization is granted to test third-party model providers, WorkOS, Convex, hosting platforms, or other services beyond their own published policies.

## Severity guide

### Critical

- Public or cross-tenant access to a production hidden test set
- Remote compromise of a trusted runner
- Runner signing-key theft enabling accepted forged receipts
- Broad authentication bypass
- Exposed production provider credentials

### High

- Cross-user draft access
- Receipt verification bypass with meaningful leaderboard impact
- Persistent injection on public benchmark or receipt pages
- Unauthenticated runner administration
- Logs containing hidden prompts or expected answers

### Medium

- Rate-limit bypass that materially helps hidden-set extraction
- Metadata exposure with privacy impact
- CSRF on meaningful state changes
- Incorrect moderation authorization

### Low

- Minor information exposure with no sealed content
- UI-only permission confusion where backend enforcement is correct
- Security hardening opportunities without a demonstrated exploit

## Response priorities

For a suspected sealed-data incident:

1. Disable the exposed route, runner, or storage path.
2. Preserve audit evidence without copying hidden bodies into general logs.
3. Revoke affected runner credentials or keys.
4. Identify exposed benchmark versions and access scope.
5. Notify affected benchmark owners privately.
6. Mark related receipts or versions as under review.
7. Rotate or retire the hidden set when exposure could affect validity.
8. Repair the boundary and add a regression test.
9. Publish an appropriately scoped incident note after containment.

Do not hide an incident by silently deleting receipts or rewriting a benchmark version.

## Supported scope

The current security-supported scope is the latest production deployment and the current receipt protocol version. Old development branches and local author runners are maintained by their operators unless explicitly distributed by BenchBazaar.

## Core security invariants

- The browser never receives official hidden scored items.
- Public samples are separate, display-only records.
- The MVP keeps hidden sets in author-controlled runners, not in the public application.
- No direct public URL is used to protect a sealed asset.
- Provider API keys and runner private keys are never stored in public Convex documents.
- Published benchmark versions are immutable.
- Receipts bind to an exact benchmark version, track, model ID, scorer configuration, and hidden-set revision.
- Receipt signatures are verified server-side.
- Logs and analytics exclude hidden item and expected-answer bodies.
- A malicious model endpoint may retain prompts; the product must not promise otherwise.

See [`docs/10-SECURITY-AND-PRIVACY.md`](./docs/10-SECURITY-AND-PRIVACY.md) and [`docs/04-SEALED-BENCHMARKS.md`](./docs/04-SEALED-BENCHMARKS.md) for the full model.
