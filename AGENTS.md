# BenchBazaar implementation rules

Read `docs/ARCHITECTURE.md` and this file before changing routes, data flow, authentication,
or schema.

## Fixed stack

- TanStack Start and TanStack Router
- React and strict TypeScript
- Convex as the only application database and authorization layer
- WorkOS AuthKit with GitHub social login
- Tailwind CSS plus small purpose-built components
- Runtime validation at route, form, manifest, and external-ingress boundaries

## Non-negotiable data boundary

Official scored prompts, hidden answers, private scoring fixtures, generator secrets,
provider credentials, and signing private keys never enter browser queries, route loader
data, HTML, hydration state, client bundles, social cards, analytics, logs, or public file
URLs. The MVP Convex database stores no sealed content.

Public samples are deliberately public, have stable IDs distinct from hidden items, and
must carry `includedInOfficialScore: false`.

## Ownership

- TanStack Start owns routes, SSR, metadata, AuthKit redirects, and UI.
- Convex owns application data, authorization, search, publishing, receipts, moderation,
  and audit events.
- A separate trusted runner owns hidden items, model calls, scoring, redaction, and signing.

Never trust a browser-supplied user or owner ID. Derive identity from the validated WorkOS
token inside Convex and centralize ownership/role checks.

## Product rules

- Published versions are immutable; corrections create a successor.
- Receipts are append-only; corrections supersede rather than rewrite.
- Compare results only within one exact version and track.
- Do not produce a global intelligence score across unrelated benchmarks.
- Say “sealed” or “hidden from public download,” never “impossible to leak.” A model
  endpoint may still retain prompts it receives.
- Do not execute uploaded code, packages, repositories, containers, or shell commands in
  the web app or Convex.

## Implementation style

Keep route files thin. Put domain types, data access, and feature behavior under
`src/features/<feature>`. Add explicit loading, empty, error, and success states. Preserve
keyboard semantics, visible focus, reduced-motion behavior, responsive layouts, and exact
technical identifiers. Add focused tests for every security or compatibility boundary.
