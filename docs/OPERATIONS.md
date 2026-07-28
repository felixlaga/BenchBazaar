# BenchBazaar operations

This runbook covers the Node web process and its separate Convex and WorkOS
dependencies. It does not authorize an operator to create real benchmark claims or to
move synthetic preview records into production.

## Environment isolation and release gate

Use three separate environments:

| App environment | Convex                                        | WorkOS            | Public use          |
| --------------- | --------------------------------------------- | ----------------- | ------------------- |
| local           | personal development deployment               | staging or absent | developer only      |
| staging         | separate permanent staging project/deployment | staging           | internal validation |
| production      | production deployment                         | production        | real users          |

The server refuses to boot as `staging` or `production` unless
`BENCHBAZAAR_ENVIRONMENT`, `CONVEX_ENVIRONMENT`, and `WORKOS_ENVIRONMENT` agree. Hosted
origins and the exact `/api/auth/callback` redirect must use HTTPS and share an origin.
This is an operator assertion as well as a startup guard; confirm the selected provider
resources in their dashboards before releasing.

Required production secrets and configuration:

- `VITE_CONVEX_URL`: public production Convex client URL, supplied at image build time.
- `CONVEX_DEPLOY_KEY`: production-scoped key for the backend deployment job only; never
  inject it into the web runtime.
- `PUBLIC_SITE_URL` and `WORKOS_REDIRECT_URI`: canonical HTTPS origin and exact callback.
- `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, and `WORKOS_COOKIE_PASSWORD`: production WorkOS
  values; the cookie password must contain at least 32 characters.
- `ERROR_REPORTING_DSN`: reserved for a future scrubbed error transport; structured
  production logs are the current monitored error surface.

Before deploying:

1. Run `pnpm check`, `pnpm build`, `pnpm leak:scan`, and `pnpm test:e2e:smoke`.
2. Deploy Convex functions with the production-scoped deploy key.
3. Run both reconciliation commands and inspect their bounded counts.
4. Confirm WorkOS production has the exact callback URI, GitHub social login, and
   production branding.
5. Confirm the production database contains no synthetic seed records and import only a
   reviewed, consented launch package.

The `Deploy production` GitHub workflow is manual, serialized, bound to the protected
`production` environment, and requires the literal `DEPLOY_PRODUCTION`. Configure
`CONVEX_DEPLOY_KEY` and `FLY_API_TOKEN` as environment secrets and `FLY_APP_NAME` and
`PRODUCTION_CONVEX_URL` as environment variables. The workflow deploys Convex first,
requires the launch-content readiness query to return `ready: true`, and only then deploys
the web process.

## Web deployment and rollback

Fly.io is the selected Node host. The committed `Dockerfile` runs as a non-root user and
`fly.toml` keeps one machine available, forces HTTPS, and checks `/api/health`.

Create the Fly app once, set runtime secrets without printing them, and deploy the public
Convex URL as the build argument:

```bash
fly launch --no-deploy
fly secrets set PUBLIC_SITE_URL=... WORKOS_REDIRECT_URI=... WORKOS_CLIENT_ID=... WORKOS_API_KEY=... WORKOS_COOKIE_PASSWORD=...
fly deploy --build-arg VITE_CONVEX_URL=https://...convex.cloud
```

Do not store provider secrets in `fly.toml`, `.env` files, build arguments, or CI logs.
After deployment, verify `/api/health`, the security headers, sign-in/callback/sign-out,
one public catalog journey, and an authenticated publish/receipt journey.

For a web-only regression, stop traffic to the new release and restore the prior Fly
Machine release. Do not roll back Convex schema/function changes by deploying old code
until compatibility with current data has been checked. Prefer a forward fix for additive
schema changes.

## Backup and restore

Create encrypted production backups that include file storage:

```bash
pnpm exec convex export --prod --include-file-storage --path snapshot.zip
```

Record the timestamp, source deployment, release commit, file digest, and encryption/key
owner outside the archive. Store the encrypted artifact outside the deployment account.
Backups can be restored with Convex import, but import/replace is destructive.

Quarterly restore drill:

1. Create a fresh isolated non-production Convex deployment.
2. Import the untouched ZIP without `--replace`.
3. Deploy the matching function version.
4. Run receipt and save reconciliation.
5. Verify public counts, exact-version receipt compatibility, moderation history, runner
   key states, run requests, audit events, and stored public images.
6. Delete the drill environment after recording evidence.

Never run `convex import --prod --replace` during an incident without a second operator,
a fresh export, a written target/deployment check, and a maintenance window.

On 2026-07-28, the linked development deployment successfully exported a file-storage
inclusive ZIP and passed `unzip -t`. This proves the export path, not the restore path. A
fresh isolated restore remains required before public launch.

## Monitoring and incident response

Monitor:

- web health success and latency;
- non-2xx rate by route, with request IDs only;
- Convex function failures and rate-limit rejections;
- rejected signed-receipt ingestion by coarse error code;
- reconciliation drift;
- WorkOS callback errors;
- storage growth and backup success.

Operational logs must pass through `serializeOperationalEvent`; do not log request bodies,
authorization headers, cookies, tokens, receipt signatures, private keys, provider
credentials, or hidden benchmark content.

If sealed content or credentials may have leaked:

1. Disable affected runner keys and stop receipt ingestion if needed.
2. Rotate provider, WorkOS, Convex, and signing credentials that could be affected.
3. Preserve redacted timestamps, request IDs, key fingerprints, and audit events.
4. Mark affected receipts disputed or invalid; do not rewrite or delete their history.
5. Notify benchmark owners and users with scoped, factual impact language.
6. Add the leaked material to the regression scanner as a non-sensitive sentinel.
