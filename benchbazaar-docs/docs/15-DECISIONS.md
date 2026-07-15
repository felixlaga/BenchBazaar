# Accepted decisions

This file records architectural and product decisions. New decisions should use the template at the end.

## ADR-001 — Product name is BenchBazaar

**Status:** Accepted  
**Decision:** Use BenchBazaar as the product and repository name.  
**Rationale:** “Bench” signals benchmarks; “bazaar” signals an open community where many people bring focused work. The name supports a playful visual identity and has open-source cultural resonance.  
**Consequences:** Use a consistent market vocabulary, but pair it with plain language.

## ADR-002 — Registry and receipts before hosted evaluation cloud

**Status:** Accepted  
**Decision:** The core product is a benchmark registry, versioning system, run-request system, and receipt archive. It is not initially a general hosted execution platform.  
**Rationale:** Arbitrary code, GPUs, provider keys, queues, and sandboxing would overwhelm a side project.  
**Consequences:** The launch can still be useful with author-operated evaluations and signed receipts.

## ADR-003 — Open method, sealed official set

**Status:** Accepted  
**Decision:** Publicly expose purpose, public examples, scoring method, limitations, tracks, and metadata. Keep official scored prompts, answers, and generator secrets off the public web.  
**Rationale:** Full public benchmark releases can enter future training data and weaken evaluation validity.  
**Consequences:** BenchBazaar must explain the trust boundary and cannot call every benchmark fully open-data.

## ADR-004 — Public samples never count toward official scores

**Status:** Accepted  
**Decision:** Public “free samples” are separate display-only records with distinct IDs and `includedInOfficialScore: false`.  
**Rationale:** Once public, an example must be treated as contaminated.  
**Consequences:** Authors need separate public examples and hidden items.

## ADR-005 — Author-run sealed evaluation is the MVP default

**Status:** Accepted  
**Decision:** Hidden sets stay in an author's private environment. A reference runner creates a canonical signed receipt for upload.  
**Rationale:** Strongest useful side-project boundary with the least infrastructure.  
**Consequences:** Initial runs are not universally self-service; run requests can be manual.

## ADR-006 — The model-endpoint limitation is public

**Status:** Accepted  
**Decision:** State that a remote model endpoint can log evaluation prompts. Do not call sealed benchmarks impossible to leak or contamination-proof.  
**Rationale:** The model must receive the input; hiding this fact would be security theater.  
**Consequences:** Receipts carry endpoint-exposure classification, and remote runs are rate-limited.

## ADR-007 — Published versions are immutable

**Status:** Accepted  
**Decision:** A published benchmark version is an immutable public contract. Changes create a successor version.  
**Rationale:** Old receipts must remain interpretable and digest-bound.  
**Consequences:** Publishing requires an explicit irreversible confirmation and changelog workflow.

## ADR-008 — Receipts are append-only provenance records

**Status:** Accepted  
**Decision:** Corrected results supersede old receipts; they do not rewrite them. Disputed and invalid receipts remain historically visible unless policy/legal removal requires a tombstone.  
**Rationale:** Selective deletion undermines trust.  
**Consequences:** The UI needs status banners and history.

## ADR-009 — No global model intelligence score

**Status:** Accepted  
**Decision:** Compare models only within an exact benchmark version and track. Do not average unrelated benchmarks into one universal rank.  
**Rationale:** Different tests measure different capabilities and assumptions.  
**Consequences:** Model pages organize results without a single overall number.

## ADR-010 — Fixed application stack

**Status:** Accepted  
**Decision:** Use TanStack Start, TypeScript, Convex, WorkOS AuthKit with GitHub social login, and Tailwind CSS.  
**Rationale:** These are the project owner's chosen tools and provide a lightweight typed full-stack setup.  
**Consequences:** Agents should use official current integrations and avoid adding a second backend.

## ADR-011 — Convex owns application state and authorization

**Status:** Accepted  
**Decision:** Store catalog, versions, receipts, run requests, moderation, and audit events in Convex. Enforce ownership inside Convex functions.  
**Rationale:** A single backend simplifies the side project and provides reactive status updates.  
**Consequences:** No separate SQL database or general API server in the MVP.

## ADR-012 — WorkOS is the identity authority

**Status:** Accepted  
**Decision:** Use WorkOS AuthKit sessions and GitHub social login. Map validated WorkOS subjects to local Convex user documents.  
**Rationale:** Avoid maintaining passwords/OAuth flows and reduce anonymous spam.  
**Consequences:** Public profiles expose handles, not email or WorkOS identifiers.

## ADR-013 — Ed25519 signatures over RFC 8785 canonical JSON

**Status:** Accepted  
**Decision:** Runner receipts use Ed25519 signatures over RFC 8785 canonical JSON payload bytes.  
**Rationale:** Deterministic, interoperable signed payloads with small keys and signatures.  
**Consequences:** Shared protocol package and cross-language test vectors are mandatory.

## ADR-014 — Signatures identify provenance, not truth

**Status:** Accepted  
**Decision:** Label receipts precisely as runner-signed, maintainer-official, reproduced, disputed, and so on. Do not collapse them into one generic “verified” badge.  
**Rationale:** A signature proves source and integrity, not scientific validity.  
**Consequences:** UI and data model preserve multiple evidence facts.

## ADR-015 — No arbitrary code execution in web or Convex

**Status:** Accepted  
**Decision:** The main application never executes uploaded benchmark code, repositories, packages, shell commands, or containers.  
**Rationale:** Prevent remote-code-execution and operational complexity.  
**Consequences:** Evaluation code runs in separate trusted runners.

## ADR-016 — No permanent user provider-key storage

**Status:** Accepted  
**Decision:** Do not store users' general-purpose model-provider API keys in Convex.  
**Rationale:** Secret custody and abuse risk are disproportionate for the MVP.  
**Consequences:** Use operator accounts, author-run workflows, or later short-lived scoped credential designs.

## ADR-017 — Convex full-text search before vector search

**Status:** Accepted  
**Decision:** Use a denormalized public search field and Convex full-text search for launch.  
**Rationale:** Benchmark catalogs are initially small, and exact words/tags matter.  
**Consequences:** No embedding service or vector index in the MVP.

## ADR-018 — No comments or social feed in the MVP

**Status:** Accepted  
**Decision:** Use reports, disputes, and external issue links rather than comments, DMs, follows, or a feed.  
**Rationale:** Keep moderation bounded and the product focused on artifacts.  
**Consequences:** Community discussion happens in linked repositories or social channels.

## ADR-019 — Light-first paper visual identity

**Status:** Accepted  
**Decision:** Launch with a warm paper and market-sign visual system. Dark mode is optional later.  
**Rationale:** A distinctive, polished identity matters more than immediate theme breadth.  
**Consequences:** Tokens should permit future theming without blocking launch.

## ADR-020 — Managed sealed storage is a later reviewed feature

**Status:** Accepted  
**Decision:** Do not store hidden content in BenchBazaar for MVP. If managed encrypted bundles are added, they require client/CLI encryption, no public file URLs, internal server-only access, and a dedicated security review.  
**Rationale:** External author-run storage creates a cleaner trust boundary.  
**Consequences:** `sealedAssets` remains a future schema section, not default scaffolding.

## Open decisions

These need real product evidence before acceptance:

- Which frontend hosting provider best supports the chosen TanStack Start release?
- Should organization/team stalls exist, or are individual maintainers sufficient initially?
- Which provider-owned API models, if any, should BenchBazaar subsidize?
- What independent reproduction tolerance is appropriate per scorer type?
- Should runner releases use artifact attestations in addition to receipt signatures?
- When is managed encrypted storage worth its additional trust burden?
- Which content categories require age/safety warnings?

## Decision template

```markdown
## ADR-XXX — Title

**Status:** Proposed | Accepted | Rejected | Superseded  
**Date:** YYYY-MM-DD  
**Decision:** One clear sentence.  
**Context:** What problem or constraint prompted the decision?  
**Rationale:** Why this choice?  
**Alternatives considered:** What else was considered?  
**Consequences:** What becomes easier, harder, or required?  
**Supersedes / superseded by:** Optional links.
```
