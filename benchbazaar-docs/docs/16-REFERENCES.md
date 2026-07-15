# References

This file records the official documentation, standards, and research that informed the BenchBazaar specification.

Last reviewed: **2026-07-13**.

A reference here is not a claim that BenchBazaar has already implemented a feature. It is the preferred starting point when an implementation detail needs to be verified. Coding agents must check current upstream documentation before copying version-sensitive setup commands.

## TanStack Start

- [TanStack Start documentation](https://tanstack.com/start/latest)
- [TanStack Start overview](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [Environment variables](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables)
- [Hosting and deployment](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)

Use TanStack Start for routes, server rendering, server functions, and the web application shell. Do not create a second application server without an accepted architectural decision.

## Convex

### Application integration

- [TanStack Start quickstart](https://docs.convex.dev/quickstart/tanstack-start)
- [Convex React client](https://docs.convex.dev/client/react)
- [Queries](https://docs.convex.dev/functions/query-functions)
- [Mutations](https://docs.convex.dev/functions/mutation-functions)
- [Actions](https://docs.convex.dev/functions/actions)
- [Internal functions](https://docs.convex.dev/functions/internal-functions)
- [HTTP actions](https://docs.convex.dev/functions/http-actions)
- [Scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions)

### Authentication

- [WorkOS AuthKit integration](https://docs.convex.dev/auth/authkit/)
- [Add WorkOS AuthKit to an existing app](https://docs.convex.dev/auth/authkit/add-to-app)
- [Authentication in functions](https://docs.convex.dev/auth/functions-auth)

### Data, files, and search

- [Database schemas](https://docs.convex.dev/database/schemas)
- [Indexes](https://docs.convex.dev/database/reading-data/indexes)
- [Full-text search](https://docs.convex.dev/search/text-search)
- [File storage overview](https://docs.convex.dev/file-storage)
- [Serving files](https://docs.convex.dev/file-storage/serve-files)
- [Deleting files](https://docs.convex.dev/file-storage/delete-files)

A URL returned for a Convex storage object behaves like a bearer URL. It must not be used as the protection mechanism for a sealed benchmark. Sensitive bytes should be read only from trusted backend code, or—preferably for the MVP—remain entirely outside BenchBazaar in the benchmark author's runner environment.

### Testing

- [Testing Convex functions](https://docs.convex.dev/testing)
- [`convex-test`](https://docs.convex.dev/testing/convex-test)
- [Local backend tests](https://docs.convex.dev/testing/convex-backend)

## WorkOS AuthKit and GitHub sign-in

- [AuthKit documentation](https://workos.com/docs/authkit)
- [AuthKit TanStack Start SDK](https://workos.com/docs/sdks/authkit-tanstack-start)
- [Social login](https://workos.com/docs/authkit/social-login)
- [Hosted AuthKit flow](https://workos.com/docs/authkit/hosted-ui)

The intended first-release identity flow is WorkOS AuthKit with GitHub enabled as the social provider. GitHub identity is useful for an open-source community, but BenchBazaar's own user ID remains the stable internal principal.

## Protocol standards

- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- [RFC 8032: Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032)
- [RFC 3339: Date and Time on the Internet](https://www.rfc-editor.org/rfc/rfc3339)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [JSON Schema](https://json-schema.org/)

BenchBazaar receipts use canonical JSON before signing so independent implementations sign exactly the same bytes. The preferred signature algorithm is Ed25519. Timestamps use RFC 3339 UTC strings.

## Benchmark contamination and private evaluation research

The project treats benchmark confidentiality as risk reduction, not a magical guarantee. These works provide useful context for why public static test sets become less informative and why private, rotating, or continuously refreshed evaluation is valuable.

- [TRUCE: Private Benchmarking to Prevent Contamination and Improve Comparative Evaluation of LLMs](https://arxiv.org/abs/2403.00393)
- [LiveBench: A Challenging, Contamination-Free LLM Benchmark](https://arxiv.org/abs/2406.19314)
- [AntiLeak-Bench: Preventing Data Contamination by Automatically Constructing Benchmarks with Updated Real-World Knowledge](https://arxiv.org/abs/2412.13670)
- [How Can I Publish My LLM Benchmark Without Giving the True Answers Away?](https://arxiv.org/abs/2505.18102)
- [LLM Benchmark Datasets Should Be Contamination-Resistant](https://arxiv.org/abs/2605.19999)

These references do not eliminate the central limit: any external model endpoint that receives an item can potentially retain it. BenchBazaar therefore combines sealed storage with quotas, delayed aggregate feedback, randomized subsets, item rotation, canaries, and explicit trust labels.

## Evaluation ecosystems

BenchBazaar is a registry and receipt protocol, not a replacement for mature evaluation runners.

- [Inspect AI](https://inspect.aisi.org.uk/)
- [EleutherAI Language Model Evaluation Harness](https://github.com/EleutherAI/lm-evaluation-harness)
- [LightEval](https://github.com/huggingface/lighteval)

Integrations should adapt these systems into the BenchBazaar manifest and receipt contract rather than inventing another task DSL.

## Source-use policy

When a coding agent relies on a reference:

1. Prefer official documentation or a primary research source.
2. Record a version-sensitive decision in [`15-DECISIONS.md`](./15-DECISIONS.md).
3. Add a focused test that protects the intended behavior.
4. Do not weaken sealed-data controls merely because a framework offers a convenient public-file helper.
5. Update the “Last reviewed” date when meaningfully revalidating this page.
