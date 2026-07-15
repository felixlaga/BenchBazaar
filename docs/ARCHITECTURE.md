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
  schema.ts             Public MVP schema subset; no sealed-content fields
```

## Data migration path

The preview uses `catalog.repository.ts` as a narrow read boundary so public pages work
without cloud credentials. The fixture implementation is not a second application
database. When a Convex development deployment is configured, replace the repository
implementation with validated Convex queries while preserving its public view models.

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
