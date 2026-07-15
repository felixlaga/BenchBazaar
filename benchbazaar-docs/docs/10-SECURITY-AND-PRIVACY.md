# Security and privacy

## 1. Security posture

BenchBazaar handles identity, public user content, machine signatures, and potentially sensitive evaluation metadata. The highest-impact failure is exposing sealed benchmark content or secrets through a public application path.

The MVP reduces risk by keeping hidden test content outside BenchBazaar entirely. Security controls still apply to public content, receipts, runner identities, and future execution workflows.

## 2. Security priorities

In order:

1. Never expose sealed benchmark content.
2. Never leak authentication, provider, signing, or encryption secrets.
3. Enforce ownership and roles inside backend functions.
4. Prevent forged or replayed runner receipts.
5. Prevent public-content injection and unsafe links/files.
6. Limit abuse of run requests and machine endpoints.
7. Preserve auditability and historical provenance.
8. Keep the architecture understandable enough to review.

## 3. Authentication

### WorkOS AuthKit

- Use the official TanStack Start integration.
- Enable GitHub social login in WorkOS.
- Request only the OAuth scopes needed for basic identity.
- Configure exact development and production redirect URIs.
- Use a strong server-only cookie password/secret.
- Keep WorkOS API keys server-only.
- Validate return paths to prevent open redirects.
- Use secure, HTTP-only, same-site cookies according to the integration defaults and deployment requirements.

### Convex authentication

- Configure Convex to validate WorkOS-issued tokens.
- Derive identity from `ctx.auth.getUserIdentity()`.
- Do not trust a client-provided external ID, email, handle, role, or user document ID.
- Use `useConvexAuth()` or equivalent backend-ready state for protected client UI.
- Treat “WorkOS user object exists” and “Convex has validated a token” as separate states.

### Account policy

- GitHub identity reduces anonymous abuse but is not proof of real-world identity.
- Public handles must be unique and normalized.
- Email remains private.
- Suspension is enforced in backend authorization helpers.
- Account deletion preserves receipt attribution through a tombstone when required for provenance.

## 4. Authorization

Centralize authorization helpers. Every write path must answer:

- who is the current actor?
- is the actor active?
- which object do they own?
- which exact operation is allowed in the object's current state?
- is the operation idempotent?

Examples:

- only a draft owner can edit the draft;
- only an owner can publish a successor version;
- no one can patch a published version;
- a manual submitter cannot assign runner-signed status;
- only authorized runner keys can sign for a benchmark;
- only moderators can mark a receipt invalid;
- owners can dispute but not silently erase a valid receipt.

Do not implement generic “patch any fields” mutations for security-sensitive records.

## 5. Sealed-data controls

### MVP

- Hidden prompts and answers are not stored in Convex.
- The web repository contains synthetic fixtures only.
- Public sample records are separate and explicitly display-only.
- Runner receipts contain aggregate metrics and digests only.

### Future encrypted storage

If implemented:

- encrypt before upload;
- store only ciphertext;
- keep key wrapping server-side;
- never call `storage.getUrl()` for sealed assets;
- never return sealed storage IDs from public queries;
- only internal actions call `ctx.storage.get()`;
- plaintext never reaches logs or persistent database fields;
- use a separate reviewed code path from public file serving.

### Leak-prevention review

Search the repository and generated bundles for:

- hidden fixture phrases;
- `storage.getUrl` usage near sealed types;
- request-body logging;
- broad serialization of internal objects;
- accidental route-loader return values;
- error monitoring payload capture;
- test snapshots containing private data.

## 6. Secrets

### Server-only secrets

Expected secrets include:

- `WORKOS_API_KEY`
- `WORKOS_COOKIE_PASSWORD`
- runner-ingestion operational secrets if used
- provider API keys owned by the site/operator
- future encryption master key or KMS credentials
- monitoring service credentials

### Public configuration

Safe client configuration may include:

- WorkOS client ID;
- Convex deployment URL;
- public site URL;
- analytics site ID without secret privileges.

Follow framework naming conventions carefully. A `VITE_*` value is browser-exposed.

### Rules

- never put private keys or provider keys in public environment variables;
- never commit `.env` files;
- never store user provider keys in Convex documents;
- never include secrets in scheduled function arguments;
- never echo a secret in an error;
- rotate a secret after accidental exposure even if the log was “private”;
- document ownership and rotation for each production secret.

## 7. Runner signatures

- Use Ed25519.
- Sign RFC 8785 canonical receipt JSON.
- Validate runner status and benchmark scope before accepting.
- Use unique nonce replay protection.
- Enforce payload size limits before expensive verification.
- Compare key fingerprints using exact normalized encoding.
- Keep historical public keys for old receipt verification.
- Revocation blocks new receipts; it does not rewrite old signature facts.
- Do not conflate signature validity with scientific validity.

Signature test vectors are mandatory.

## 8. External HTTP actions

Runner ingestion and webhook routes are high-risk boundaries.

Required controls:

- HTTPS only in production;
- allow only intended methods;
- explicit content type;
- strict request-size limit lower than platform maximum;
- schema validation;
- rate limiting by runner ID and network signals where available;
- no raw-body logging;
- stable coarse error codes;
- CORS disabled unless a browser caller is explicitly required;
- atomic idempotency/replay checks;
- internal mutations for database writes;
- timeout-safe behavior;
- no secret values in query parameters.

Return minimal JSON such as:

```json
{
  "ok": true,
  "receiptId": "BB-RCP-7J4M2Q"
}
```

## 9. Input validation

Validate every boundary:

- route search parameters;
- WorkOS return path;
- Convex query/mutation/action arguments;
- manifest import;
- receipt ingest;
- URLs;
- Markdown length and structure;
- uploaded file metadata;
- model identifiers;
- numeric metrics;
- timestamps;
- signature encodings.

Reject:

- NaN and infinite metrics;
- excessively deep objects;
- oversized arrays;
- unknown protocol versions;
- unsupported URL schemes;
- embedded credentials in URLs;
- raw HTML where not needed;
- YAML custom tags;
- duplicate track or sample IDs.

## 10. Markdown and content rendering

User-authored Markdown appears in descriptions, limitations, samples, and notes.

Policy:

- disable raw HTML by default;
- sanitize rendered output;
- allow a small safe Markdown subset;
- add `rel="nofollow ugc noopener noreferrer"` to user links as appropriate;
- block `javascript:`, `data:` except tightly controlled public media, and other unsafe schemes;
- render code blocks as text;
- do not execute embedded scripts, iframes, forms, SVG markup, or styles;
- truncate previews by parsed text, not raw unsafe HTML.

External images in Markdown should be disallowed or proxied later. Prefer explicit validated media fields.

## 11. URL and SSRF safety

Repository, artifact, and write-up URLs are user input.

For ordinary display:

- validate `https:` URLs;
- display host to the user;
- use safe link attributes;
- do not server-fetch merely to render a link.

For future artifact inspection or import:

- use an allowlist where possible;
- reject localhost, private IP ranges, link-local, metadata-service addresses, and non-HTTP schemes;
- resolve DNS carefully against rebinding;
- enforce response size and timeout;
- do not forward authorization headers;
- treat redirects as new URLs requiring validation;
- parse content in a sandboxed, non-executing way.

The MVP can avoid server-side URL fetching altogether.

## 12. File uploads

Public uploads may include benchmark images and sample media.

Controls:

- authenticate uploader;
- enforce ownership;
- limit size;
- validate MIME type and magic bytes;
- decode and re-encode images where practical;
- reject active content such as HTML and untrusted SVG;
- strip metadata from images if privacy-sensitive;
- generate alt-text field requirement;
- store public and future sealed files through different helpers;
- delete abandoned uploads.

Do not use original filenames as authorization or storage keys.

## 13. Cross-site protections

- Follow WorkOS session integration guidance.
- Ensure state-changing actions are not exposed as unauthenticated GET requests.
- Validate Origin/Referer where appropriate on custom server routes.
- Use same-site cookies and CSRF protections supplied by the framework/auth integration.
- Restrict CORS on Convex HTTP actions.
- Add a Content Security Policy compatible with the app and WorkOS flow.
- Avoid inline scripts where possible.
- Use frame-ancestors policy to prevent unwanted embedding of authenticated pages.

## 14. Rate limiting and abuse

Rate-limit at least:

- sign-in related redirect abuse where controllable;
- draft creation;
- publish attempts;
- receipt submission;
- runner receipt ingestion;
- run requests;
- reports;
- mystery-crate endpoint if it becomes expensive;
- social-image generation.

Keys may include:

- authenticated user ID;
- runner ID;
- benchmark version;
- endpoint fingerprint;
- network/IP signal at edge;
- global circuit breaker.

Run-request limits are part of benchmark confidentiality, not only infrastructure protection.

## 15. Logging and telemetry

Allowed fields:

- request ID;
- function or route name;
- actor public/internal ID;
- target object ID;
- status transition;
- duration;
- safe count;
- error code.

Forbidden fields:

- hidden prompts/answers;
- raw receipt body;
- provider prompt/response bodies;
- authorization headers;
- WorkOS tokens;
- cookies;
- email in public analytics;
- private report descriptions unless in restricted storage;
- encryption key material;
- unredacted stack context containing content.

Use separate security/audit events from debug logs. Audit events should be durable, concise, and redacted.

## 16. Analytics and privacy

Use minimal privacy-respecting analytics.

Useful events:

- benchmark viewed;
- search performed, preferably with query redaction or aggregation;
- benchmark saved;
- publish completed;
- receipt shared;
- run requested;
- mystery crate opened.

Do not record:

- hidden data;
- draft body text;
- private report text;
- provider keys;
- full external endpoint URLs with embedded tokens;
- sensitive query strings.

Publish a plain privacy statement before launch.

## 17. Supply-chain security

- lock dependency versions;
- enable automated dependency alerts;
- review auth and crypto package updates quickly;
- use GitHub branch protection for production;
- require tests before merge;
- protect deployment secrets;
- generate provenance for runner releases later;
- avoid install scripts from unnecessary packages;
- use least-privilege GitHub Actions permissions;
- pin reusable workflow revisions where security-sensitive.

## 18. Backups and deletion

Back up public metadata, versions, receipts, and audit events according to Convex capabilities and project needs.

Never restore production hidden content into a lower-trust development environment.

For future sealed ciphertext:

- back up ciphertext only;
- manage key backups separately;
- document crypto-erasure behavior;
- keep digest metadata after legitimate retirement if receipts depend on it.

## 19. Security incident classes

### S0: suspected sealed-content exposure

Immediate response:

- pause affected runs;
- disable relevant route/action;
- revoke runner or keys if implicated;
- preserve redacted evidence;
- rotate dataset/version;
- notify affected owners;
- publish a transparent incident note when confirmed.

### S1: secret exposure

- revoke/rotate secret;
- invalidate sessions or keys where needed;
- inspect access logs;
- deploy remediation;
- document root cause.

### S2: forged or replayed receipts

- disable runner key or ingestion path;
- mark affected receipts disputed/invalid;
- preserve historical record;
- fix canonicalization/replay checks;
- rerun test vectors.

### S3: account or content abuse

- suspend account/content;
- preserve audit events;
- resolve reports;
- adjust rate limits and moderation controls.

## 20. Pre-launch security checklist

- [ ] WorkOS dev and production environments are separate.
- [ ] GitHub login requests minimal scopes.
- [ ] Convex validates WorkOS tokens.
- [ ] All write functions validate arguments and authorization.
- [ ] No public function returns sealed content.
- [ ] No hidden test fixtures exist in repository history.
- [ ] No sealed file path calls `storage.getUrl()`.
- [ ] Receipt signature test vectors pass.
- [ ] Replay nonce test passes atomically.
- [ ] Markdown is sanitized and raw HTML disabled.
- [ ] User URLs use safe schemes and link attributes.
- [ ] Upload limits and type checks exist.
- [ ] Runner endpoint logs are body-free.
- [ ] Error monitoring redaction is enabled.
- [ ] Rate limits exist on writes and run requests.
- [ ] CSP and secure headers are configured.
- [ ] Moderation and key revocation work.
- [ ] Incident contacts and rotation steps are documented.
