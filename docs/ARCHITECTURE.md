# BenchBazaar application architecture

The application is organized around product domains rather than pages. TanStack Start
route files own URL parsing, metadata, loaders, and composition; feature modules own
domain types, data access, and reusable behavior.

## Current shape

```text
src/
  components/
    brand/              Product identity primitives
    layout/             Global shell and route-level states
    ui/                 Small cross-feature UI primitives
  features/
    catalog/
      components/       Catalog-specific presentational components
      data/             Explicitly synthetic public preview fixtures
      domain/           Framework-independent domain types
      server/           Catalog repository boundary and focused tests
  lib/                  Cross-cutting helpers and security utilities
  routes/               Thin TanStack Start route modules
convex/
  auth.config.ts        WorkOS JWT validation for Convex
  catalog.ts            Purpose-built public catalog queries
  users.ts              Protected current-user query and identity synchronization
  seed.ts               Internal-only synthetic development seed loader
  schema.ts             Public MVP schema subset; no sealed-content fields
```

## Data path

Public route loaders preload validated Convex queries through TanStack Query for SSR, and
components resume them as live Convex subscriptions in the browser. Cursor pagination is
owned by Convex for browse, stall, and model discovery. Exact benchmark-version and track
IDs define scoreboard compatibility; disputed, invalid, and superseded receipts remain
public but never rank. The synthetic fixture module is a seed/test input, not an application
database or production read path. Public queries return explicit view models rather than
whole Convex documents.

Thin TanStack Start server routes expose public receipt JSON and SVG social cards by calling
the same purpose-built public Convex queries. They never receive whole database documents,
private user fields, or any sealed content.

WorkOS AuthKit owns the browser session. Its access token is forwarded to Convex during
SSR and through `ConvexProviderWithAuth` in the browser. Convex validates the token, derives
the subject with `ctx.auth.getUserIdentity()`, and synchronizes the local profile without
accepting a browser-supplied user ID.

Convex owns application data, authorization, draft/publish state transitions, search,
receipt ingestion, and audit events. TanStack Start owns rendering, route metadata,
authentication routes, and thin server-only adapters. A separate trusted runner owns
hidden items, model calls, scoring, redaction, and receipt signing.

## Protected-data rule

The web application and MVP Convex schema contain no official hidden prompts, expected
answers, generator secrets, provider keys, or signing private keys. Public samples are
separate records with stable IDs and `includedInOfficialScore: false`.

## Adding a feature

1. Add or extend a domain type without importing React or framework code.
2. Put data access behind a feature `server/` module.
3. Build small feature components with explicit loading, empty, error, and success states.
4. Keep route files focused on URL validation, loaders, metadata, and composition.
5. Add tests at the repository, component, and security-boundary level as appropriate.
6. Do not introduce a browser path for sealed content to make a demo easier.
