# BenchBazaar

> **Odd tests. Useful signals.**

BenchBazaar is an open registry for community-made LLM benchmarks. Authors publish a
benchmark's purpose, public examples, scorer, limitations, and versioned result receipts
while keeping the official scored items outside the public web application.

This repository contains the TanStack Start application. It currently delivers the
public preview vertical slice from a real Convex deployment seeded with an intentionally
synthetic catalog.

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
- Unit, Convex authorization/data-boundary, security-boundary, and component tests

The authenticated editor and real signed-runner workflow are not presented as complete.
Managed WorkOS is configured for the linked development deployment, but browser GitHub
login still needs an end-to-end provider check. CI remains to be added.

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
pnpm build          # production TanStack Start build
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

Published versions will be immutable, receipts append-only, and scoreboards scoped to one
exact benchmark version and track. A signed receipt proves source and integrity; it does
not prove scientific truth.

## Deployment

The scaffold uses Nitro's generic Node adapter:

```bash
pnpm build
node .output/server/index.mjs
```

Choose a concrete hosting target only after validating WorkOS callback behavior, Convex
environment separation, security headers, and secret injection for that provider.
