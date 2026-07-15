# Contributing to BenchBazaar

BenchBazaar should feel like a public market built by its vendors: welcoming, slightly strange, and dependable where it matters.

## Start here

Before changing code or product behavior, read:

1. [`AGENTS.md`](./AGENTS.md)
2. [`docs/00-INDEX.md`](./docs/00-INDEX.md)
3. The specification document relevant to your change
4. [`docs/15-DECISIONS.md`](./docs/15-DECISIONS.md)

Security and sealed-data constraints override convenience and visual requirements.

## Ways to contribute

Useful contributions include:

- Product and accessibility improvements
- New market-themed components or illustrations
- Search and catalog improvements
- Manifest and receipt tooling
- Integrations with established evaluation frameworks
- Protocol test vectors in another language
- Documentation corrections
- Security hardening
- Synthetic demo benchmarks

Do not submit a real hidden benchmark dataset to this repository.

## Development principles

- Keep the public web app lightweight.
- Prefer one clear path over a configurable framework.
- Use TanStack Start, Convex, and WorkOS as specified unless an accepted decision changes the stack.
- Keep business rules in testable domain functions.
- Enforce permissions in Convex/backend code, not only in the UI.
- Treat published benchmark versions and accepted receipts as immutable audit records.
- Never fetch a sealed set into a browser or expose it through a public file URL.
- Use synthetic sentinel data when testing sealed flows.
- Preserve plain-language labels next to market metaphors.

## Proposed workflow

1. Choose an unblocked task from [`docs/13-IMPLEMENTATION-BACKLOG.md`](./docs/13-IMPLEMENTATION-BACKLOG.md).
2. Confirm its prerequisites and acceptance criteria.
3. Make the smallest coherent change.
4. Add or update tests.
5. Run typecheck, relevant tests, production build, and the leak scan.
6. Update documentation and decisions in the same pull request.
7. Explain security impact, especially any movement of data across trust boundaries.

## Pull request expectations

A pull request should state:

- What user problem it solves
- Which backlog item or issue it addresses
- Screenshots for meaningful visual changes
- Tests added or changed
- Data-model or migration impact
- Authentication/authorization impact
- Sealed-data impact
- Rollback approach when relevant

A useful checklist:

- [ ] Scope is focused.
- [ ] Public and private data remain clearly separated.
- [ ] Permissions are tested server-side.
- [ ] Loading, empty, error, and mobile states are covered.
- [ ] Accessibility was considered.
- [ ] No hidden benchmark content appears in fixtures, logs, screenshots, or snapshots.
- [ ] Documentation matches behavior.
- [ ] No new dependency duplicates an existing capability without justification.

## Commit style

Use descriptive commits. Conventional prefixes are welcome but not mandatory:

```text
feat: add immutable benchmark publishing
fix: reject receipts from revoked runners
docs: clarify public sample policy
test: add sealed sentinel regression
```

## Design contributions

The design system is playful but not noisy. A visual contribution should:

- Strengthen the market metaphor
- Remain legible without emoji
- Work on narrow screens
- Respect reduced motion
- Avoid making serious provenance labels look unserious
- Avoid large animation or component dependencies for a tiny effect

See [`docs/08-DESIGN-SYSTEM.md`](./docs/08-DESIGN-SYSTEM.md).

## Protocol contributions

Changes to the manifest, receipt, canonicalization, or signature format require:

- A versioning decision
- Updated JSON Schema
- Updated canonical test vectors
- Backward-compatibility notes
- A security review
- An entry in [`docs/15-DECISIONS.md`](./docs/15-DECISIONS.md)

Do not merge an incompatible protocol change under the same schema version.

## Reporting security problems

Do not open a public issue containing an exploit, secret, hidden benchmark item, or reproducible extraction method. Follow [`SECURITY.md`](./SECURITY.md).

## Community behavior

Be direct, curious, and generous. Critique benchmarks and methods rather than their authors. Weird tests are welcome; deceptive claims, harassment, doxxing, stolen datasets, and attempts to exfiltrate sealed sets are not.
