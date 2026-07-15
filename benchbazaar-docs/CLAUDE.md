# BenchBazaar agent entry point

Read [`AGENTS.md`](./AGENTS.md) in full before making changes.

Then read:

1. [`docs/00-INDEX.md`](./docs/00-INDEX.md)
2. [`docs/04-SEALED-BENCHMARKS.md`](./docs/04-SEALED-BENCHMARKS.md)
3. [`docs/05-TECHNICAL-ARCHITECTURE.md`](./docs/05-TECHNICAL-ARCHITECTURE.md)
4. [`docs/13-IMPLEMENTATION-BACKLOG.md`](./docs/13-IMPLEMENTATION-BACKLOG.md)

The highest-risk mistake in this project is exposing hidden benchmark items. Never return sealed content to a browser, place it in logs, or create a public file URL for it.
