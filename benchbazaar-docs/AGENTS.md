# Instructions for coding agents

This file is the primary implementation contract for BenchBazaar. Read it before changing code, schema, routes, copy, or architecture.

## 1. Mission

Build a lightweight, delightful, open-source website for publishing unusual but useful LLM benchmarks. Authors expose the benchmark's purpose, public examples, method, scorer, limitations, and results while keeping the official scored test items sealed.

The product should feel like a cheerful public market and behave like serious evaluation infrastructure.

## 2. Decision priority

When documents appear to conflict, use this order:

1. Security invariants in this file
2. Accepted decisions in `docs/15-DECISIONS.md`
3. `docs/04-SEALED-BENCHMARKS.md`
4. `docs/03-PRODUCT-SPEC.md`
5. `docs/05-TECHNICAL-ARCHITECTURE.md`
6. `docs/11-ROADMAP.md`
7. Remaining documentation

Do not silently override a higher-priority decision. Record a proposed change in `docs/15-DECISIONS.md` before implementing it.

## 3. Fixed stack

Use these technologies unless an accepted architecture decision changes them:

- TanStack Start
- TanStack Router
- TypeScript with strict mode
- Convex for database, queries, mutations, actions, scheduling, and small file metadata
- WorkOS AuthKit for sessions and identity
- GitHub as the initially enabled social login provider
- Tailwind CSS for styling
- Shared runtime validation schemas for forms, manifests, HTTP actions, and external runner payloads

Do not replace Convex with a second application database. Do not add a separate REST backend unless a narrow external protocol requires an HTTP action or TanStack server route.

## 4. Protected-data invariants

These rules are absolute.

### 4.1 Never expose sealed items

Sealed benchmark prompts, expected answers, private scoring fixtures, generator secrets, and decryption keys must never be:

- returned by a public or authenticated browser query;
- included in HTML, route loader data, hydration state, source maps, or client bundles;
- placed in public Git repositories;
- written to application logs, analytics events, error messages, traces, or exception payloads;
- embedded in social cards, receipts, emails, notifications, or moderation previews;
- passed to a client under the assumption that minification, obfuscation, WebAssembly, or encryption-with-a-client-key prevents extraction;
- exposed through a Convex `storage.getUrl()` bearer URL;
- copied into test snapshots committed to the repository.

### 4.2 Public samples are separate data

Public “free samples” are authored for display and are permanently considered public. They must have distinct stable IDs and must not be members of the official hidden scoring pool.

### 4.3 Scores require provenance

A leaderboard score must point to an immutable receipt containing, at minimum:

- exact benchmark version;
- exact track;
- exact model identifier;
- scorer version;
- run timestamp;
- evaluated item count;
- metrics;
- runner identity or submission source;
- verification level;
- configuration digest;
- dataset or generator digest;
- signature status when runner-signed.

### 4.4 Do not promise impossible secrecy

Use phrases such as **sealed**, **hidden from public download**, or **controlled evaluation**. Do not claim a benchmark is impossible to leak, impossible to train on, cryptographically private, or contamination-proof unless that exact guarantee has been implemented and independently reviewed.

A model endpoint necessarily receives evaluation inputs. A malicious endpoint operator can log them. The product must state this limitation.

### 4.5 No arbitrary code execution in the web app

Do not execute benchmark-author uploads, repositories, packages, containers, shell commands, or arbitrary scorer code inside TanStack Start or Convex production functions.

The initial system accepts structured metadata and signed result payloads. Evaluation code runs in a separate trusted runner controlled by the benchmark author or a trusted operator.

### 4.6 Secret handling

- Never persist user model-provider API keys in Convex documents.
- Never include secrets in function arguments that are scheduled or stored for retries.
- Never put secrets in `VITE_*`, public route data, or browser-readable environment variables.
- Keep WorkOS API keys, cookie secrets, runner signing secrets, and any encryption master keys server-only.
- Redact authorization headers and provider credentials from all logs.

## 5. Product constraints

- The interface must remain understandable without knowing the market metaphor.
- Do not create an opaque global model score across unrelated benchmarks.
- Do not add comments, follows, direct messages, or engagement feeds in the MVP.
- Do not require a paper, package, or evaluation framework to publish a useful benchmark idea.
- Do require enough method and limitation information for visitors to interpret a score.
- Published benchmark versions are immutable. Corrections create a new version.
- Runs are append-only. A corrected run supersedes an old receipt; it does not rewrite history.
- Default scoreboards compare only compatible runs from the same benchmark version and track.

## 6. Architecture boundaries

### TanStack Start owns

- Routes and layouts
- Server rendering and metadata
- Authentication redirect and callback routes
- Client components and forms
- Social image rendering
- Thin server-only helpers where needed

### Convex owns

- Application data and authorization
- Search and reactive queries
- Draft and publish mutations
- Run-request state machine
- Receipt ingestion and verification bookkeeping
- Rate limits, reports, moderation, and audit events
- External runner HTTP actions

### Sealed runner owns

- Hidden item storage or generation
- Prompt construction
- Calls to model targets
- Scoring against hidden answers
- Redaction of traces
- Receipt signing

Do not blur these boundaries merely to make a demo easier.

## 7. Authentication and authorization

- Use WorkOS AuthKit's TanStack Start integration.
- Enable GitHub social login in WorkOS.
- Pass validated WorkOS identity to Convex using the documented integration.
- In Convex functions, derive the current user from `ctx.auth.getUserIdentity()`; never trust a client-provided user ID.
- Centralize helpers such as `requireUser`, `requireBenchmarkOwner`, `requireModerator`, and `requireRunner`.
- Every mutation and action must validate arguments.
- Every owner-only operation must enforce ownership on the server, not only hide a button.

## 8. Data classification

Use these labels in code comments and documentation where appropriate:

- `PUBLIC`: safe for pages, API, search, and social cards
- `AUTHENTICATED`: visible to the signed-in owner or collaborator
- `SEALED_METADATA`: digests, counts, runner IDs, and non-content information
- `SEALED_CONTENT`: hidden prompts, answers, fixtures, generator secrets
- `SECRET`: API keys, signing private keys, encryption keys, session secrets

No Convex query callable from the browser may return `SEALED_CONTENT` or `SECRET` data.

## 9. Implementation style

- Prefer small domain modules over large route files.
- Keep public copy in reusable constants when used in multiple places.
- Use typed IDs and explicit state unions.
- Model state transitions as narrow mutations, not arbitrary patch operations.
- Keep date storage in UTC timestamps and format in the UI.
- Use deterministic slugs with collision handling.
- Add indexes for every production query pattern.
- Keep accessibility semantics intact even when components look whimsical.
- Avoid dependency-heavy animation and chart libraries.
- Do not add a component library solely to obtain generic dashboard styling.

## 10. Required testing

Before marking a feature complete, add tests at the appropriate level.

At minimum, the suite must prove:

- unauthenticated users cannot write;
- non-owners cannot edit drafts or publish versions;
- published versions cannot be mutated;
- sealed content is absent from public query results;
- sealed storage IDs never produce public URLs;
- receipts with invalid signatures or incompatible tracks cannot become verified leaderboard entries;
- repeated run requests are rate-limited;
- hidden data is redacted from errors and logs;
- public samples do not share IDs with sealed items;
- scoreboards group by exact version and track;
- accessibility-critical flows work by keyboard.

See `docs/17-TESTING-STRATEGY.md`.

## 11. Agent workflow

For each task:

1. Read the relevant product, architecture, and security documents.
2. Select one coherent item from `docs/13-IMPLEMENTATION-BACKLOG.md`.
3. State assumptions in the pull request or commit description.
4. Implement the smallest complete vertical slice.
5. Add or update tests.
6. Update documentation when behavior changes.
7. Check the acceptance criteria in `docs/12-MVP-ACCEPTANCE-CRITERIA.md`.
8. Do not leave hidden-data handling as a TODO in a publicly reachable path.

When uncertain, choose the more conservative data-exposure behavior and the simpler product behavior.

## 12. Definition of done

A task is done only when:

- it works in the intended user flow;
- authorization is enforced server-side;
- input and output boundaries are validated;
- loading, empty, error, and success states exist;
- tests cover the important invariant;
- no sealed or secret data reaches the client or logs;
- the design remains responsive and keyboard accessible;
- documentation reflects the result.

## 13. Prohibited shortcuts

Do not:

- put hidden prompts in Convex documents marked with a boolean and assume that is sufficient;
- send encrypted benchmark data to the browser with the decryption code or key;
- expose a temporary file URL and call it private;
- trust model or benchmark IDs submitted by the browser without lookup;
- accept a self-reported score as “verified”;
- compare results across incompatible benchmark versions;
- use pageview counts as a quality score;
- store raw provider responses publicly by default;
- log request bodies on runner ingestion routes;
- invent a new evaluation DSL for the MVP.

## 14. First build target

The first complete vertical slice should be:

1. public homepage;
2. browse/search page;
3. seeded benchmark page with public samples;
4. seeded receipt page;
5. WorkOS GitHub sign-in;
6. owner draft creation;
7. immutable publish action;
8. manually submitted receipt with explicit `self_reported` status;
9. security tests proving no sealed content appears in public queries.

Only after that slice is polished should agents implement runner registration and signed receipt ingestion.
