# BenchBazaar reference runner

This CLI validates and signs aggregate receipts. It does not execute hidden benchmark
items or call model providers. Those responsibilities stay in the benchmark author's
private environment.

```bash
pnpm bb-runner validate-manifest packages/runner/examples/manifest.json
pnpm bb-runner keygen ./secrets/runner-ed25519.pem
pnpm bb-runner sign-receipt packages/runner/examples/unsigned-receipt.json ./secrets/runner-ed25519.pem ./signed-receipt.json
pnpm bb-runner submit-receipt ./signed-receipt.json https://your-convex-site.convex.site/v1/receipts
```

Register only the generated `.public.json` value. The private PEM remains local, is
created with owner-only permissions, and must never be uploaded to BenchBazaar.

The example identifiers and score are protocol fixtures only. They are not benchmark or
model-performance claims and must not be submitted to a production deployment.
