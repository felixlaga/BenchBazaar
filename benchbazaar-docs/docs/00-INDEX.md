# BenchBazaar documentation index

This directory is the product and implementation contract for BenchBazaar.

## Read in this order

| File                                                                     | Purpose                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`01-VISION-AND-GOALS.md`](./01-VISION-AND-GOALS.md)                     | Why the project exists, who it serves, and how success is measured         |
| [`02-PHILOSOPHY.md`](./02-PHILOSOPHY.md)                                 | Product values and judgment rules for ambiguous decisions                  |
| [`03-PRODUCT-SPEC.md`](./03-PRODUCT-SPEC.md)                             | User roles, features, pages, flows, and MVP scope                          |
| [`04-SEALED-BENCHMARKS.md`](./04-SEALED-BENCHMARKS.md)                   | Hidden test sets, controlled evaluation, threat model, and runner protocol |
| [`05-TECHNICAL-ARCHITECTURE.md`](./05-TECHNICAL-ARCHITECTURE.md)         | TanStack Start, Convex, WorkOS, service boundaries, and deployment shape   |
| [`06-DATA-MODEL.md`](./06-DATA-MODEL.md)                                 | Convex tables, state machines, indexes, and data classifications           |
| [`07-ROUTES-AND-UX.md`](./07-ROUTES-AND-UX.md)                           | Route tree, page composition, and user journeys                            |
| [`08-DESIGN-SYSTEM.md`](./08-DESIGN-SYSTEM.md)                           | Market visual language, components, motion, responsiveness, accessibility  |
| [`09-MANIFEST-AND-RECEIPTS.md`](./09-MANIFEST-AND-RECEIPTS.md)           | Public manifest, receipt format, signatures, compatibility, examples       |
| [`10-SECURITY-AND-PRIVACY.md`](./10-SECURITY-AND-PRIVACY.md)             | Application security, secret handling, abuse controls, incident response   |
| [`11-ROADMAP.md`](./11-ROADMAP.md)                                       | Build stages and release gates                                             |
| [`12-MVP-ACCEPTANCE-CRITERIA.md`](./12-MVP-ACCEPTANCE-CRITERIA.md)       | Testable definition of a successful first release                          |
| [`13-IMPLEMENTATION-BACKLOG.md`](./13-IMPLEMENTATION-BACKLOG.md)         | Ordered, agent-sized implementation tasks                                  |
| [`14-COPY-AND-CONTENT.md`](./14-COPY-AND-CONTENT.md)                     | Taglines, navigation terms, empty states, examples, and launch copy        |
| [`15-DECISIONS.md`](./15-DECISIONS.md)                                   | Accepted architectural and product decisions                               |
| [`16-REFERENCES.md`](./16-REFERENCES.md)                                 | Official technical documentation and relevant evaluation research          |
| [`17-TESTING-STRATEGY.md`](./17-TESTING-STRATEGY.md)                     | Unit, integration, end-to-end, security, and leak-regression tests         |
| [`18-ENVIRONMENT-AND-DEPLOYMENT.md`](./18-ENVIRONMENT-AND-DEPLOYMENT.md) | Environments, variables, deployment, backups, and operational checklist    |

## Repository-level guides

| File                                       | Purpose                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| [`../README.md`](../README.md)             | Project overview and entry point                        |
| [`../AGENTS.md`](../AGENTS.md)             | Binding implementation instructions for coding agents   |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contribution workflow and review expectations           |
| [`../SECURITY.md`](../SECURITY.md)         | Private vulnerability reporting and incident priorities |

## Source-of-truth rules

- Repository-wide agent constraints live in [`../AGENTS.md`](../AGENTS.md).
- Security and sealed-data rules override visual or convenience requirements.
- Accepted decisions in `15-DECISIONS.md` override older prose elsewhere.
- A behavior change must update the relevant document in the same change set.

## Suggested agent prompts

For the first vertical slice:

> Read `AGENTS.md`, `docs/03-PRODUCT-SPEC.md`, `docs/05-TECHNICAL-ARCHITECTURE.md`, and tasks BB-001 through BB-012 in `docs/13-IMPLEMENTATION-BACKLOG.md`. Build only that slice, preserve every sealed-data invariant, and add the required tests.

For runner work:

> Read `AGENTS.md`, `docs/04-SEALED-BENCHMARKS.md`, `docs/09-MANIFEST-AND-RECEIPTS.md`, and `docs/10-SECURITY-AND-PRIVACY.md`. Implement the next unblocked runner task without moving hidden benchmark content into the web client or public Convex functions.
