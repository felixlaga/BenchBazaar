# BenchBazaar

> **Odd tests. Useful signals.**

**Live site: [www.benchbazaar.dev](https://www.benchbazaar.dev/)**

BenchBazaar is an open registry for community-made LLM benchmarks. Authors publish a
title, a short card description, a full explanation, three public examples, an optional
GitHub repository, and versioned result receipts while keeping official scored items
outside the public web application.

This repository contains the TanStack Start application. The linked development
deployment intentionally uses a synthetic preview catalog; production launch is
fail-closed until real entries have recorded owner consent and all synthetic records are
absent.

## What is implemented

- TanStack Start, React 19, strict TypeScript, Tailwind CSS 4, and pnpm
- Feature-oriented architecture with thin route modules and a catalog repository boundary
- Responsive, keyboard-friendly global shell and bespoke BenchBazaar design system
- Homepage, cursor-paginated browse/search with shareable filters, editorial aisle pages,
  exact current and historical benchmark-version pages, public samples, and compatible
  per-track scoreboards
- Public stall and canonical model pages, receipt history/state pages, machine-readable
  receipt JSON, social-card images, receipt badges, trust-model, and mystery-crate routes
- Twelve synthetic public benchmark listings, fourteen immutable version snapshots,
  forty-two explicitly public samples, and twenty explicitly synthetic receipts
- Convex public MVP schema, bounded public queries, and an internal idempotent seed loader
  with no sealed-content fields
- WorkOS AuthKit login/logout UI, token forwarding to Convex on server and client, and
  first-access user synchronization keyed by validated token subject
- Protected profile setup, owner dashboard, a focused autosaving benchmark editor with
  automatic identifiers and system-owned evaluation defaults, and an atomic immutable
  publish transaction
- Successor-version drafts, authenticated basket saves, centralized ownership checks,
  and private publish audit events
- Canonical model resolution, manual and artifact-linked receipt submission, persisted
  compatibility validation, complete exact-version receipt history, and scoped ranking
- Append-only receipt supersession, maintainer-official designation, public disputes,
  private audit events, and an internal counter-reconciliation command
- Shared protocol schemas, RFC 8785-compatible canonical JSON, Ed25519 signing and
  verification, runner key registration/lifecycle, a reference CLI, and signed receipt
  HTTP ingestion with replay, scope, size, and rate-limit enforcement
- Reports, role-protected moderation, benchmark/receipt/runner status actions,
  independent reproduction review, and public curator collections
- Operator-controlled run requests with exact version/track/model binding, a narrow state
  machine, leakage budgets, runner assignment, and signed-receipt completion
- Public-image upload validation, save/receipt counter reconciliation, redacted
  operational logs, CSP/security headers, health checks, and a production launch-content
  gate
- GitHub Actions CI, leak regression scanning, unit/Convex security tests, and Playwright
  visitor, security-header, keyboard, and reduced-motion coverage

Current evidence and external gates are tracked in
[docs/IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md). In particular, provider
inspection on 2026-07-28 found the staging GitHub OAuth credential invalid and the
production WorkOS application not yet configured. Real consented launch records also have
not been supplied; the application does not substitute invented content.

## Local development

Requirements: Node.js 22 or newer and pnpm 10.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality commands

```bash
pnpm format:check   # Prettier verification
pnpm lint           # ESLint
pnpm typecheck      # strict TypeScript
pnpm test           # Vitest
pnpm test:e2e:smoke # Playwright browser/security smoke
pnpm build          # production TanStack Start build
pnpm leak:scan      # sealed-content sentinel scan
pnpm check          # format, lint, typecheck, and tests
```

## Provider setup

### Convex

The committed schema is ready for a development deployment. Run:

```bash
pnpm convex:dev
```

Convex will create `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` in `.env.local`, generate its
typed API, and configure the development AuthKit environment when the Convex team enables
managed WorkOS provisioning. Then load the public preview data:

```bash
pnpm convex:seed
```

The seed mutation is internal-only, requires an explicit synthetic-data confirmation, and
is safe to rerun. TanStack Start routes render through Convex queries; the fixture module is
only an input to tests and the development seed loader.

If denormalized receipt or save counters drift, repair them with the internal-only
reconciliation mutations:

```bash
pnpm convex:reconcile
```

### WorkOS AuthKit

Either let `pnpm convex:dev` provision a development AuthKit environment after accepting
the WorkOS terms, or set all four server-only values together:

```bash
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
WORKOS_COOKIE_PASSWORD=<32-or-more-characters>
```

In the WorkOS dashboard, register the callback URI above and set the sign-in endpoint to
`http://localhost:3000/api/auth/sign-in`. Enable GitHub as the social-login provider.
AuthKit middleware is paired with TanStack Start's CSRF middleware; partial WorkOS
configuration fails fast. The same `WORKOS_CLIENT_ID` must be set in the Convex deployment
so `convex/auth.config.ts` can validate access tokens. Secrets must never use the `VITE_`
prefix.

## Architecture and security

Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) before adding features.

The hard boundary is simple: the browser never receives official scored prompts, hidden
answers, private scoring fixtures, generator secrets, model-provider keys, or signing
private keys. Public free samples are separate records and always carry
`includedInOfficialScore: false`. The future sealed runner—not TanStack Start or a public
Convex function—owns hidden items and scoring.

Published versions are immutable, receipts are append-only, and scoreboards are scoped to one
exact benchmark version and track. A signed receipt proves source and integrity; it does
not prove scientific truth.

## Deployment

The application uses Nitro's Node adapter. Fly.io is the selected host; the committed
container runs as a non-root user and `fly.toml` checks `/api/health`.

```bash
pnpm build
node .output/server/index.mjs
```

See [docs/OPERATIONS.md](./docs/OPERATIONS.md) for environment isolation, deployment,
backup/restore, rollback, monitoring, and incident procedures. Production must not be
opened until WorkOS callback/logout/GitHub login, separate Convex production, and the
real-content gate have all been verified.
