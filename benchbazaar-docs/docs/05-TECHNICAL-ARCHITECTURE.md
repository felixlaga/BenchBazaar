# Technical architecture

## 1. Architecture objective

Build BenchBazaar as one small web application plus one separable runner package.

The application should be easy to deploy and cheap to operate. The sealed runner should be isolated enough that hidden benchmark content never needs to enter a browser-rendering path or arbitrary web request handler.

## 2. Fixed stack

### Web

- TanStack Start
- TanStack Router
- React
- TypeScript in strict mode
- TanStack Query where required by the Convex integration
- Tailwind CSS

### Backend and data

- Convex database
- Convex queries and mutations
- Convex actions for bounded external calls
- Convex HTTP actions for runner ingestion and narrowly scoped integrations
- Convex scheduling or workflow components only when a durable async process is actually needed
- Convex File Storage for public assets and later encrypted sealed ciphertext, never public plaintext hidden sets

### Identity

- WorkOS AuthKit
- GitHub social login enabled in the WorkOS dashboard
- Server-side WorkOS middleware and callback handling in TanStack Start
- WorkOS access token passed to Convex through the documented AuthKit integration

### Protocol and runner

- Shared TypeScript package for manifest and receipt schemas
- Node.js reference CLI for author-run sealed evaluations
- Ed25519 signatures for runner receipts
- Existing evaluation frameworks remain supported behind adapters; BenchBazaar does not replace them

## 3. Repository shape

Recommended single-repository layout:

```text
/
  src/
    routes/                    TanStack Start file routes
    components/                Shared presentational components
    features/
      auth/
      benchmarks/
      browse/
      receipts/
      runners/
      stalls/
      models/
      moderation/
    lib/
      env.server.ts
      seo.ts
      analytics.ts
      copy.ts
    styles/
      app.css

  convex/
    schema.ts
    auth.config.ts
    users.ts
    benchmarks.ts
    benchmarkVersions.ts
    publicSamples.ts
    browse.ts
    models.ts
    receipts.ts
    runners.ts
    runRequests.ts
    baskets.ts
    reports.ts
    curation.ts
    audit.ts
    http.ts
    lib/
      auth.ts
      authorization.ts
      validation.ts
      canonicalJson.ts
      signatures.ts
      redaction.ts
      rateLimits.ts

  packages/
    protocol/
      src/
        manifest.ts
        receipt.ts
        canonicalize.ts
        verification.ts
      package.json

    runner/
      src/
        cli.ts
        run.ts
        sign.ts
        adapters/
        redact.ts
      package.json

  public/
    illustrations/
    icons/

  docs/
  AGENTS.md
  README.md
```

Keep the web app at repository root unless the chosen starter already creates a workspace. Do not create a large monorepo merely for aesthetics.

## 4. System boundaries

```text
┌────────────────────────────────────────────────────────────┐
│ Browser                                                    │
│  Public pages, forms, search, basket, interactive samples  │
└─────────────────────┬──────────────────────────────────────┘
                      │ WorkOS session + Convex client calls
                      ▼
┌────────────────────────────────────────────────────────────┐
│ TanStack Start                                             │
│  SSR, routes, auth redirects, metadata, social images      │
│  No sealed test items                                      │
└─────────────────────┬──────────────────────────────────────┘
                      │ authenticated Convex requests
                      ▼
┌────────────────────────────────────────────────────────────┐
│ Convex                                                     │
│  Catalog, versions, samples, receipts, jobs, moderation    │
│  External runner ingress                                   │
│  No sealed content in MVP                                  │
└──────────────┬────────────────────────────┬────────────────┘
               │ signed receipt             │ later: job lease
               ▲                            ▼
┌────────────────────────────────────────────────────────────┐
│ Sealed runner                                              │
│  Private test set, model calls, scoring, signing           │
└────────────────────────────────────────────────────────────┘
```

## 5. TanStack Start responsibilities

### Routes and rendering

Use file-based routes and route loaders for:

- public page metadata;
- initial catalog data;
- current authenticated user summary;
- canonical URLs;
- social preview metadata;
- not-found and error states.

Use client components only where interactivity is necessary:

- browse filters;
- free-sample answer reveal;
- save-to-basket button;
- publish form editor;
- live benchmark-card preview;
- receipt copy/share actions.

Avoid moving ordinary read paths into client-only rendering.

### Server-only auth integration

Preserve the repository's existing WorkOS integration when one is already working. When bootstrapping, use the current official WorkOS package for TanStack Start. At the time this specification was reviewed, the TanStack Start SDK documentation uses:

```text
@workos/authkit-tanstack-react-start
```

WorkOS package namespaces and setup APIs have changed over time. Do not install two competing AuthKit SDKs. Verify the current official SDK, the Convex bridge guidance, and the versions already present in the repository before changing authentication dependencies.

Expected routes and integration points for the current SDK shape:

```text
src/start.ts                          AuthKit + CSRF request middleware
src/routes/api/auth/callback.tsx      OAuth callback handler
src/routes/api/auth/sign-in.tsx       begin WorkOS sign-in
src/routes/api/auth/sign-out.tsx      sign out, if implemented as a route
```

The exact route names may differ in an existing app, but `WORKOS_REDIRECT_URI` and the WorkOS dashboard callback must match exactly. Register the AuthKit middleware together with TanStack Start's CSRF middleware for server-function RPC endpoints; do not accidentally remove CSRF protection while adding session middleware.

GitHub is configured as a WorkOS social-login provider. Do not implement a separate GitHub OAuth flow in parallel.

Because TanStack Start and its AuthKit integration evolve, agents must verify current official package APIs before copying integration code. Pin known-working dependency versions and update them deliberately.

### Social images

Create a server-rendered social image route that accepts only public identifiers and fetches only public metadata. It may return SVG or PNG depending on the deployment adapter.

Social image generation must never receive:

- sealed prompts;
- hidden answers;
- private artifacts;
- provider credentials;
- unredacted runner errors.

## 6. Convex integration

### Client and SSR

Use the official TanStack Start + Convex pattern with:

- `convex`;
- `@convex-dev/react-query`;
- TanStack Query integration;
- WorkOS AuthKit access tokens applied to Convex on server and client;
- `useConvexAuth()` or Convex auth-aware components for authenticated backend readiness.

Do not infer backend authentication solely from a client-side WorkOS user object. Convex must validate the token.

### Function types

Use:

- **queries** for reads;
- **mutations** for transactional state changes;
- **internal queries/mutations** for logic that must not be callable by clients;
- **actions** for external APIs, signature libraries requiring Node APIs, or storage blob operations;
- **HTTP actions** for runner receipt ingestion, webhooks, and documented public machine endpoints.

Every public function must have argument validation. Internal functions are preferred for implementation steps that should not be directly callable from a browser.

### Authorization helpers

Centralize helpers in `convex/lib/authorization.ts`:

```text
getOptionalUser(ctx)
requireUser(ctx)
requireRole(ctx, role)
requireBenchmarkOwner(ctx, benchmarkId)
requireVersionOwner(ctx, versionId)
requireActiveRunner(ctx, runnerId)
requireModerator(ctx)
```

Never accept a client-provided owner ID as proof of authority.

### Search

Use Convex full-text search for the MVP.

Maintain one denormalized public `searchText` string on each published benchmark containing:

- title;
- summary;
- aisle label;
- tags;
- capability terms;
- owner handle.

Define a search index on `searchText` with equality filter fields for common filters such as status and aisle.

For an empty search query, use ordinary indexes for newest, curated, or most-run ordering. Do not force an empty string through full-text search.

No vector search is needed for launch.

### Pagination

Use cursor pagination for browse results, stall benchmarks, model receipts, and moderation queues. Avoid loading all documents and filtering in the browser.

## 7. WorkOS identity model

### Source of identity

WorkOS is the identity authority. Convex stores an application profile keyed by the external subject from the validated token.

Suggested mapping:

```text
WorkOS user ID / JWT subject  → users.externalId
GitHub handle                 → users.githubUsername
Public stall handle           → users.handle
```

A public handle can differ from GitHub username but must be unique and moderated.

### User synchronization

For the MVP, create or update the local user document on first authenticated application access. A WorkOS component or webhook can be added later for lifecycle sync.

Only copy fields required by the product:

- external ID;
- email where operationally needed and not public;
- display name;
- avatar URL;
- GitHub username where provided;
- account timestamps.

Do not expose email addresses on public stall pages.

### Roles

Application roles live in Convex:

- member;
- curator;
- moderator;
- admin.

Do not rely solely on a client-side WorkOS role claim unless the architecture deliberately maps and validates it.

## 8. Public read architecture

Public benchmark pages should read from publish-time snapshots, not draft tables assembled ad hoc.

Publish operation:

1. validate draft completeness;
2. normalize public fields;
3. create immutable `benchmarkVersions` document;
4. copy public samples into version-bound documents;
5. compute manifest digest;
6. update `benchmarks.currentVersionId`;
7. update denormalized browse/search fields;
8. write audit event;
9. schedule social-card cache invalidation if needed.

This keeps public reads fast and historical versions stable.

## 9. Receipt ingestion architecture

### Browser/manual path

Authenticated members submit a structured form to a Convex mutation. The receipt is stored with `self_reported` or `artifact_linked` status after validation.

The browser cannot select a verification level that requires server evidence.

### Runner path

A registered runner sends a small canonical payload to a Convex HTTP action.

```text
POST /runner/v1/receipts
Content-Type: application/json
X-BenchBazaar-Runner: runner_public_id
X-BenchBazaar-Signature: base64url_signature
```

The HTTP action must:

- enforce a small request limit;
- never log the raw body;
- parse once;
- validate against the shared receipt schema;
- verify the signature over canonical bytes;
- check replay nonce;
- call one internal mutation to atomically create receipt and audit event;
- return a minimal response.

Use a stable error code without echoing submitted content.

### Signature implementation

Use Ed25519 through a maintained library compatible with the chosen Convex action runtime. Put canonicalization in `packages/protocol` and use the same test vectors in runner and backend.

Signature input must include:

- protocol version;
- receipt ID or nonce;
- benchmark version;
- track;
- model ID;
- metrics;
- digests;
- completion timestamp;
- runner ID.

## 10. Run request architecture

The MVP can collect requests without automatic execution.

When remote runners are added:

- `runRequests` holds human intent and approval status;
- `runJobs` holds machine lease state;
- runner polls a protected HTTP endpoint or receives a signed callback;
- lease acquisition is atomic;
- job payload contains only public config plus a model-target reference;
- credentials are resolved inside a trusted boundary;
- result ingestion is idempotent.

Do not pass provider secrets through scheduled Convex arguments.

## 11. Sealed data storage modes

### MVP

No sealed content is stored by BenchBazaar. Store only:

- item count or range;
- dataset/generator digest;
- rotation metadata;
- runner identity;
- public method.

### Later managed mode

If encrypted sealed bundles are introduced:

- client or CLI encrypts before upload;
- Convex File Storage holds ciphertext;
- metadata table holds storage ID and wrapped key;
- no query returns a file URL;
- internal action uses `ctx.storage.get()`;
- decryption occurs only in a server-only runner path;
- plaintext is not written back to Convex.

This design must receive a dedicated security review before release.

## 12. Public assets

Use Convex File Storage or ordinary static hosting for:

- profile avatars when not remote;
- benchmark cover illustrations;
- small public artifacts;
- generated social cards if cached;
- public sample media.

Validate:

- MIME type;
- size;
- image dimensions where relevant;
- ownership;
- content policy.

Serve public files intentionally. Do not mix public and sealed assets in the same UI helper.

## 13. Caching and performance

- Prefer server-rendered public pages.
- Use Convex reactive reads where real-time updates add value, such as run status.
- Paginate large lists.
- Denormalize counts used on cards.
- Update counters transactionally when receipts become valid or invalid.
- Avoid N+1 queries by returning card view models from dedicated queries.
- Keep social-card data small and public.
- Do not add Redis for the MVP.

## 14. Observability

Log only structured operational facts:

- function name;
- request ID;
- actor or runner public ID;
- object IDs;
- coarse state transition;
- duration;
- sanitized error code.

Never log:

- hidden prompts or answers;
- complete receipt request bodies;
- provider request/response bodies;
- authorization headers;
- WorkOS tokens;
- encrypted-key material;
- raw artifacts.

Use error monitoring with a `beforeSend`-style redaction layer and disable request-body capture on runner routes.

## 15. Dependency policy

- Pin major framework versions.
- Prefer official integrations over hand-rolled auth bridges.
- Keep the shared protocol dependency-light.
- Avoid packages that execute dynamic code or deserialize unsafe formats.
- Review cryptographic and authentication dependency updates promptly.
- Do not add an evaluation framework dependency to the web application.

## 16. Deployment model

```text
Git repository
  ├─ frontend deploy → chosen TanStack Start-compatible host
  ├─ Convex deploy   → dev / preview / production deployments
  └─ runner package  → npm package, binary, or author-operated service

WorkOS
  ├─ separate development and production environments
  ├─ GitHub social login
  └─ exact callback and logout URLs per environment
```

The frontend host is intentionally not fixed in this document. Choose one with reliable TanStack Start support and server routes. Environment details live in `18-ENVIRONMENT-AND-DEPLOYMENT.md`.

## 17. Architectural non-goals

Do not add in the MVP:

- microservices for ordinary CRUD;
- GraphQL;
- a second database;
- Kafka or a general queue service;
- Kubernetes;
- arbitrary Docker execution;
- GPU scheduling;
- browser-side hidden-set decryption;
- permanent user API-key storage;
- vector search;
- a generic plugin marketplace.
