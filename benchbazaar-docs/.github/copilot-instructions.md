# GitHub Copilot instructions for BenchBazaar

Follow the repository root `AGENTS.md` and the documents under `docs/`.

Key constraints:

- Stack: TanStack Start, TypeScript, Convex, WorkOS AuthKit with GitHub login, Tailwind CSS.
- Hidden benchmark prompts and answers never reach client code, public Convex queries, logs, social cards, or generated file URLs.
- Public samples are separate from the sealed scored set.
- Published benchmark versions and receipts are append-only.
- The web application never executes arbitrary benchmark code.
- Exact benchmark version and track determine leaderboard compatibility.
- Enforce authorization inside Convex functions using authenticated identity, never client-supplied user IDs.
- Validate every Convex function argument and every external HTTP payload.
- Keep the market-themed UI playful but semantically clear and accessible.
