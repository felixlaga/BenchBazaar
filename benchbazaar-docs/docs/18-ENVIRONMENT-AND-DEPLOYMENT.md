# Environment and deployment

BenchBazaar has two operational surfaces:

1. The public TanStack Start application with Convex and WorkOS.
2. One or more sealed runners controlled by benchmark authors or trusted operators.

They have different trust levels and must not share secrets casually.

## Environment model

Use distinct WorkOS, Convex, and deployment configuration for each meaningful environment.

| Environment   | Purpose                                |  May contain real users? |             May contain production hidden sets? |
| ------------- | -------------------------------------- | -----------------------: | ----------------------------------------------: |
| Local         | Individual development                 |                       No |                                              No |
| CI            | Automated tests                        |                       No |                                              No |
| Preview       | Pull-request review                    | No, except test accounts |                                              No |
| Staging       | Release validation                     |    Limited test accounts |              No; synthetic sealed fixtures only |
| Production    | Public service                         |                      Yes | Only in explicitly approved managed-sealed mode |
| Author runner | Execute a particular private benchmark |       Operator-dependent |                    Yes, for that benchmark only |

For the MVP, production BenchBazaar should not possess the author's hidden test set. The author runner does.

## Web application variables

Create a committed `.env.example` with names and comments but no real values.

```dotenv
# Public client configuration. Safe to expose in browser bundles.
VITE_CONVEX_URL=

# Canonical origin used for redirects, receipt links, and social metadata.
PUBLIC_SITE_URL=http://localhost:3000

# WorkOS server configuration. Never prefix secrets with VITE_.
WORKOS_CLIENT_ID=
WORKOS_API_KEY=
WORKOS_COOKIE_PASSWORD=
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Optional operational integrations. Treat tokens as secrets.
ERROR_REPORTING_DSN=
```

### Variable rules

- `VITE_CONVEX_URL` is public configuration.
- `WORKOS_API_KEY` is server-only.
- `WORKOS_COOKIE_PASSWORD` is server-only and must be a high-entropy value of at least 32 characters.
- `WORKOS_CLIENT_ID` may be needed by server and Convex auth configuration; do not expose it unnecessarily.
- `WORKOS_REDIRECT_URI` must exactly match the configured callback for the environment.
- Any variable prefixed with `VITE_` is assumed capable of reaching browser code. Never put a provider API key, signing key, sealed-bundle key, or WorkOS API key there.
- Avoid printing environment objects during startup.

Use the exact variable names required by the installed WorkOS/TanStack integration and current upstream documentation. Record deliberate deviations in [`15-DECISIONS.md`](./15-DECISIONS.md).

## Convex environment configuration

At minimum, configure the WorkOS client identifier expected by the Convex authentication bridge. Keep environment values separate per Convex deployment.

Convex must contain only application metadata and approved artifacts for the MVP. It must not contain:

- Model-provider API keys belonging to users
- Runner private signing keys
- Author hidden test-set archives
- Full hidden prompts in documents, action arguments, scheduled jobs, or logs
- Expected hidden answers

Use internal Convex functions for privileged orchestration. Public queries and mutations must return purpose-built response objects rather than whole database documents by convenience.

## WorkOS setup

For each environment:

1. Create or select the correct WorkOS environment.
2. Configure the application homepage URL.
3. Configure the callback URL.
4. Configure the post-logout redirect.
5. Enable GitHub as a social login provider.
6. Test first login, repeat login, logout, canceled consent, and email/account-link edge cases.
7. Map the WorkOS subject to an internal `users` record.
8. Assign BenchBazaar roles in BenchBazaar data—not from editable client claims.

Do not use a GitHub username as the primary key. Usernames can change. Store it as profile metadata while retaining the stable WorkOS identity link.

## Deployment topology

A minimal production topology is:

```text
Browser
  │
  ▼
TanStack Start host
  ├─ server-rendered routes
  ├─ WorkOS callback/session handling
  └─ public metadata and social-card endpoints
  │
  ▼
Convex production deployment
  ├─ database
  ├─ queries and mutations
  ├─ internal actions
  ├─ receipt-ingestion HTTP action
  └─ small public artifacts only

Separate author runner
  ├─ hidden benchmark bundle
  ├─ scorer
  ├─ model-provider credentials
  ├─ runner private key
  └─ outbound receipt submission
```

The runner needs outbound access to the model provider and BenchBazaar receipt endpoint. It should not need inbound public network access in the local-runner MVP.

## Runner variables

A reference runner can use:

```dotenv
BENCHBAZAAR_BASE_URL=https://benchbazaar.example
BENCHBAZAAR_RUNNER_ID=
BENCHBAZAAR_SIGNING_KEY_PATH=./secrets/runner-ed25519.key
BENCHBAZAAR_BUNDLE_PATH=./private/benchmark.bundle
BENCHBAZAAR_BUNDLE_KEY_PATH=./secrets/benchmark-bundle.key

# Provider-specific variables remain local to the runner.
MODEL_PROVIDER_API_KEY=
```

Rules:

- The signing key never enters the web repository, Convex, browser, CI logs, or receipt payload.
- The public key is registered with BenchBazaar.
- Provider credentials stay in the runner environment and are not sent to BenchBazaar.
- Bundle keys and hidden datasets are mounted at runtime rather than baked into a public container image.
- Runner logs contain item IDs and hashes, not prompt bodies or expected answers.
- Temporary plaintext is deleted after the run and should preferably live in memory or an ephemeral volume.

## Secret storage

Use the deployment platform's encrypted secret mechanism for web secrets and a dedicated secret manager or protected local secret file for runner secrets.

Never:

- Commit `.env` files
- Put secrets in issue screenshots
- Paste hidden items into agent prompts
- Store private keys in Convex documents
- Use public object-store URLs for sealed bundles
- Include secrets in container layers
- Expose secrets through `VITE_` variables

Add these patterns to `.gitignore`:

```gitignore
.env
.env.*
!.env.example
secrets/
private/
*.key
*.pem
*.bundle
*.sealed
```

The ignore file is a convenience, not a security boundary. Pre-commit and CI secret scanning should also be enabled.

## Build and deploy sequence

Prefer backward-compatible deployments.

1. Run typecheck, tests, production build, and sentinel leak scan.
2. Deploy additive Convex schema/functions first when the new frontend depends on them.
3. Verify migrations or backfills in staging.
4. Deploy the TanStack Start application.
5. Run anonymous, authentication, publishing, and receipt smoke tests.
6. Enable any feature flag only after both sides are compatible.
7. Remove old fields/functions in a later deployment.

Never perform an irreversible schema cleanup in the same deployment that introduces the replacement behavior.

## Data migrations

Convex schema changes should be incremental:

- Add nullable/new fields.
- Write code that handles old and new records.
- Backfill through an internal function in bounded batches.
- Verify counts and invariants.
- Make the field required only after the backfill is complete.
- Remove compatibility code later.

Published benchmark versions and accepted receipts are audit records. Migrations may add derived fields but must not silently rewrite their historical meaning.

## Backups and exports

At minimum:

- Enable and periodically verify Convex backups or exports appropriate to the project plan.
- Keep a documented restore procedure.
- Export runner public keys, revocation records, benchmark versions, and receipts together so signatures remain interpretable.
- Treat deletion of public metadata separately from deletion of sealed runner data.
- Test restore in a non-production environment before launch and after major schema changes.

A database backup is not a backup of an author's hidden set in the default architecture. Authors remain responsible for their runner bundle and key recovery.

## Key lifecycle

### WorkOS and application secrets

- Rotate immediately after suspected exposure.
- Rotate periodically according to the hosting platform's capabilities.
- Invalidate sessions when the session-encryption secret changes, and communicate the effect.

### Runner signing keys

- Generate one Ed25519 key pair per runner, not one global private key.
- Store the private key only in the runner environment.
- Register the public key with an activation timestamp.
- Support overlapping keys during rotation.
- Preserve retired public keys for historical receipt verification.
- Revoke a compromised key for new submissions without invalidating already reviewed historical receipts automatically.
- Mark receipts submitted during a suspected compromise window for review.

### Hidden-bundle encryption keys

- Keep separate from signing keys.
- Rotate on benchmark-version boundaries or after suspected exposure.
- Do not make old version keys available to unrelated runners.

## Logging and observability

Allowed structured fields include:

- Request ID
- User ID or runner ID
- Benchmark ID and public version
- Track ID
- Hidden-set revision digest
- Item count
- Aggregate timing
- Error class
- Receipt ID

Prohibited fields include:

- Hidden prompt body
- Expected answer
- Full model response when it can reconstruct the item
- Provider API key
- Session cookie
- Signing key
- Decrypted bundle bytes

Configure error reporting to scrub request bodies and authorization headers. Avoid session replay on authenticated publishing and runner-administration pages unless its redaction guarantees have been explicitly reviewed.

## Preview deployments

Preview environments are public enough to be scraped. Therefore:

- Use synthetic catalog and synthetic sealed fixtures.
- Use a separate Convex deployment or isolated test data.
- Use a WorkOS environment and callback dedicated to previews or a controlled preview strategy.
- Disable real receipt submission unless intentionally testing it.
- Never mount a production hidden bundle.
- Add robots directives where useful, but do not treat them as access control.

## Production launch checklist

### Identity and authorization

- [ ] Production WorkOS keys are configured server-side.
- [ ] GitHub social login works.
- [ ] Callback and logout redirects are exact.
- [ ] Role checks exist in Convex functions.
- [ ] Admin roles cannot be self-assigned.

### Data and secrecy

- [ ] No hidden benchmark set is present in the web deployment.
- [ ] No sealed bytes are returned by public Convex queries.
- [ ] No sealed storage ID is converted into a public URL.
- [ ] Production logs and error reporting are scrubbed.
- [ ] Sentinel leak scan passes against production-mode output.

### Receipts and runners

- [ ] Runner registration requires authorization.
- [ ] Public-key fingerprints are visible to owners.
- [ ] Valid signatures pass and altered payloads fail.
- [ ] Replay and idempotency behavior is tested.
- [ ] Key rotation and revocation work.
- [ ] Rate limits and run quotas are active.

### Product

- [ ] Homepage, browse, benchmark, profile, model, and receipt pages render.
- [ ] Public samples are explicitly marked as non-scored examples.
- [ ] Limitations and contamination risk are visible.
- [ ] Published versions are immutable.
- [ ] Social cards contain only public data.
- [ ] 404, 500, empty, and permission states are designed.

### Operations

- [ ] Backup and restore procedure is documented and tested.
- [ ] Security-reporting path is visible.
- [ ] Rollback owner and procedure are known.
- [ ] Health and error alerts reach a human.
- [ ] A curator can hide harmful content without deleting the audit record.

## Rollback

A rollback must preserve auditability.

- Roll back frontend code independently when possible.
- Prefer disabling a new feature flag over deleting new data.
- Never roll a published version back by mutating it; publish a corrected successor.
- Never delete accepted receipts merely to repair a leaderboard bug. Recompute derived views and retain the original record.
- If receipt verification is faulty, pause new ingestion, preserve incoming payloads in a restricted review queue, fix verification, then reprocess deliberately.

## Operational boundary for the MVP

The public application can be run as an ordinary side project because it stores metadata and signed aggregate results. The sealed runner is the sensitive component. Keep it small, inspectable, local-first, and optional for browsing the site.
