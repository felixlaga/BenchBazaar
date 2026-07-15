# BenchBazaar

> **Odd tests. Useful signals.**
>
> The open bazaar for community-made LLM benchmarks—with hidden test sets and receipts for every result.

BenchBazaar is a playful, open-source registry where people publish unusual but useful evaluations for language models. A benchmark page explains what is being tested, shows a few intentionally public examples, documents the scoring recipe, and collects versioned model results.

The scored test set is **not public by default**. Public benchmark downloads are easy to scrape into future training corpora, which can make scores meaningless. BenchBazaar therefore separates the public description from a sealed evaluation set and publishes signed, provenance-rich **receipts** instead of raw test data.

## Product in one sentence

BenchBazaar lets benchmark authors publish the idea and method openly, keep the scored examples sealed, run models through a controlled evaluator, and share trustworthy results without dumping the full test set onto the public web.

## The market metaphor

| Product concept        | BenchBazaar language |
| ---------------------- | -------------------- |
| Platform               | The Bazaar           |
| Category               | Aisle                |
| Author profile         | Stall / Vendor       |
| Benchmark              | Listing / Ware       |
| Public example         | Free sample          |
| Run result             | Receipt              |
| Metadata               | Price tags           |
| Bookmark               | Basket               |
| New benchmarks         | Fresh stock          |
| Most-run benchmarks    | Best sellers         |
| Reproducibility status | Inspector stamp      |
| Random discovery       | Mystery crate        |

The metaphor adds personality, but every playful label must be paired with plain language. Clarity wins over jokes.

## Fixed technology choices

- **Web framework:** TanStack Start with TypeScript
- **Data and backend functions:** Convex
- **Authentication:** WorkOS AuthKit, with GitHub social login enabled
- **Styling:** Tailwind CSS plus small, purpose-built components
- **Validation:** shared runtime schemas at every input boundary
- **Testing:** unit tests, Convex function tests, and browser-level end-to-end tests

## Core architecture

```text
Public browser
  └─ TanStack Start application
       ├─ Public catalog, profiles, scoreboards, receipts
       ├─ WorkOS AuthKit session and GitHub sign-in
       └─ Convex queries and mutations

Convex
  ├─ Public metadata
  ├─ Benchmark versions
  ├─ Run requests and status
  ├─ Signed receipts
  ├─ Moderation and audit events
  └─ No public access path to sealed test items

Sealed runner
  ├─ Controlled by the benchmark author or a trusted operator
  ├─ Holds the private test set or generator
  ├─ Sends one item at a time to the model target
  ├─ Scores locally
  └─ Signs and submits aggregate results to BenchBazaar
```

The first release does **not** execute arbitrary uploaded code, host GPUs, store user API keys permanently, or pretend that client-side obfuscation protects a dataset.

## Documentation map

Start with these files:

1. [`AGENTS.md`](./AGENTS.md) — non-negotiable implementation rules for coding agents
2. [`docs/01-VISION-AND-GOALS.md`](./docs/01-VISION-AND-GOALS.md) — project intent and success criteria
3. [`docs/03-PRODUCT-SPEC.md`](./docs/03-PRODUCT-SPEC.md) — product behavior and scope
4. [`docs/04-SEALED-BENCHMARKS.md`](./docs/04-SEALED-BENCHMARKS.md) — hidden-set design and limits
5. [`docs/05-TECHNICAL-ARCHITECTURE.md`](./docs/05-TECHNICAL-ARCHITECTURE.md) — TanStack Start, Convex, WorkOS, and runner boundaries
6. [`docs/11-ROADMAP.md`](./docs/11-ROADMAP.md) — staged build plan
7. [`docs/13-IMPLEMENTATION-BACKLOG.md`](./docs/13-IMPLEMENTATION-BACKLOG.md) — ordered, agent-sized tasks

The complete index is in [`docs/00-INDEX.md`](./docs/00-INDEX.md). Contribution workflow is in [`CONTRIBUTING.md`](./CONTRIBUTING.md), and private vulnerability reporting is in [`SECURITY.md`](./SECURITY.md).

## Non-negotiable principles

- **Open method, sealed scored set.** Explain the benchmark and scorer publicly; do not publish the official hidden items.
- **Every score has a receipt.** Results without version, model identity, configuration, and provenance are not leaderboard entries.
- **No fake certainty.** A sealed benchmark reduces contamination risk; it cannot guarantee secrecy from a malicious model endpoint.
- **Version everything.** Published benchmark versions are immutable.
- **Playful surface, serious substrate.** The market theme should make evaluation inviting, not vague.
- **Side-project discipline.** Prefer a clear manual workflow over fragile automation and infrastructure sprawl.

## Initial release boundary

The minimum useful release contains:

- A polished homepage and searchable benchmark catalog
- Benchmark pages with public samples, method, limitations, tracks, and receipts
- Vendor profiles
- WorkOS GitHub sign-in
- Draft and publish flows
- Immutable benchmark versions
- Manual or runner-signed receipt submission
- A basic sealed-runner protocol and reference CLI contract
- Shareable social cards
- Moderation, reports, and audit events

Hosted arbitrary model execution, confidential computing, payments, comments, social feeds, and a global “best model” score are deliberately postponed.

## Status

This repository pack is an implementation specification. Coding agents should treat the documents as the product contract and follow [`AGENTS.md`](./AGENTS.md) before writing code.
