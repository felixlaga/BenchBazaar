# Routes and user experience

## 1. Route principles

- Public benchmark and receipt URLs must be stable, readable, and shareable.
- Exact historical versions need first-class URLs.
- Authentication routes are server routes handled by WorkOS AuthKit.
- Draft and moderation routes are protected server-side and in Convex.
- Route loaders may fetch public or actor-authorized metadata, never sealed content.
- Query-string state should represent browse filters so links remain shareable.

## 2. Proposed route tree

```text
src/routes/
  __root.tsx
  index.tsx
  browse.tsx
  aisles.$aisle.tsx

  b.$slug.tsx
  b.$slug.v.$version.tsx
  b.$slug.edit.tsx
  b.$slug.receipts.tsx

  stalls.$handle.tsx
  models.$modelSlug.tsx
  receipts.$receiptId.tsx

  basket.tsx
  publish.tsx
  runs.request.tsx
  runs.$requestId.tsx

  settings.tsx
  settings.profile.tsx
  settings.runners.tsx
  settings.runners.new.tsx

  docs.index.tsx
  docs.sealed-benchmarks.tsx
  docs.manifest.tsx
  docs.receipts.tsx

  about.tsx
  policies.tsx

  moderation.tsx
  moderation.reports.tsx
  moderation.receipts.$receiptId.tsx

  sign-in.tsx
  sign-up.tsx
  callback.tsx
  sign-out.tsx

  social.benchmark.$slug.tsx
  social.receipt.$receiptId.tsx
```

TanStack file-route syntax may vary with the current version. Preserve the URL behavior even if filenames differ.

## 3. Global shell

### Header

Desktop:

```text
[BenchBazaar logo]  Browse  Fresh  Receipts  About       [Search] [Basket] [Publish]
```

Signed out:

```text
[Sign in with GitHub]
```

Signed in:

```text
[avatar menu: My stall, Drafts, Basket, Runners, Sign out]
```

Mobile:

- logo;
- search icon;
- basket icon;
- menu button;
- publish action remains prominent in menu.

### Footer

Include:

- plain description;
- open-source repository link;
- documentation;
- methodology and sealed-set policy;
- moderation/policies;
- “Built in the open” statement;
- no dense sitemap.

## 4. Homepage route `/`

### Loader data

Public-only view model:

```text
featuredAisles
freshBenchmarks
curatorsCart
recentReceipts
bestSellers
marketStats
```

Do not perform several independent client queries for the first paint. Return a bounded homepage view model.

### Page flow

1. Hero
2. Search
3. Aisle signs
4. Fresh stock
5. Curator's cart
6. Receipts just in
7. Best sellers
8. Sealed evaluation explainer
9. Publish invitation

### Hero copy

```text
Odd tests. Useful signals.
The open bazaar for community-made LLM benchmarks.
Publish the method, keep the official test set sealed, and bring receipts.
```

Primary action: **Browse the bazaar**  
Secondary action: **Publish a benchmark**  
Tertiary action: **Open the mystery crate**

## 5. Browse route `/browse`

### URL state

Example:

```text
/browse?q=calendar&aisle=oddities&modality=text&sort=newest
```

Suggested search parameters:

```text
q
sort
cursor
aisle
modality
scorer
sealed
hasReceipts
curated
```

Validate search parameters at the route boundary. Unknown values fall back safely and do not reach database queries unchecked.

### Desktop layout

- search bar across top;
- filter rail or compact filter popover;
- active-filter chips;
- result count and sort;
- responsive benchmark card grid;
- explicit “Load more” rather than endless scroll for MVP.

### Empty state

```text
Nothing on this shelf yet.
Try another aisle, remove a filter, or bring the first benchmark.
```

### Mystery crate

The random action chooses from eligible published benchmarks. It should avoid suspended, hidden, or content-warning-incompatible items.

## 6. Aisle route `/aisles/$aisle`

An aisle page is an editorial category landing page, not only a filtered list.

Show:

- aisle name and one-sentence description;
- small illustration or sign;
- curator pick;
- newest listings;
- most reproduced listings;
- link to browse with filter applied.

Suggested initial aisles:

- Reasoning Row
- Code Corner
- Agent Alley
- Vision Arcade
- Language Lane
- Robustness Booth
- Oddities Tent

Keep aisle IDs stable even if labels evolve.

## 7. Benchmark routes

### Current route `/b/$slug`

Resolve the current published version and render it. Include a canonical link to the current route and a visible exact-version link.

If the benchmark has no published version and the viewer is the owner, redirect to edit. Otherwise return not found.

### Exact route `/b/$slug/v/$version`

Render an immutable historical version.

If not current, show a banner:

```text
You are viewing version 1.1. A newer version is available.
[View current version]
```

If deprecated:

```text
This version is retired from official runs. Existing receipts remain visible.
```

### Benchmark page composition

```text
Breadcrumb / aisle
Header and price tags
Primary actions
Sealed-set explanation
Free samples
Scoreboard with track selector
What it tests
Run recipe
Fine print / limitations
Versions
Related wares
```

Use anchor navigation on large screens. Keep the mobile page linear.

### Tabs versus sections

Prefer sections with anchor links over hiding core information behind tabs. Scoreboard track selection can use tabs because tracks are mutually scoped views.

## 8. Draft and publish routes

### `/publish`

Behavior:

- signed-out visitor sees explanation and GitHub sign-in action;
- signed-in user without a stall handle completes lightweight profile setup;
- create draft on first meaningful save, not on page load;
- autosave with visible status;
- live card preview on desktop;
- compact preview drawer on mobile.

### `/b/$slug/edit`

Edit an unpublished draft or create a successor draft from the current version.

Sections:

1. Listing
2. Purpose
3. Free samples
4. Tracks and scoring
5. Sealed-set policy
6. Source and licensing
7. Limitations
8. Preview and publish

### Publish confirmation

Before publish, display:

```text
Publish version 1.0.0?
Published versions are immutable. Future corrections create a new version.
```

Also confirm:

- public samples are intentionally public;
- public samples are excluded from the official scored set;
- hidden items were not pasted into public fields;
- author has rights to publish the method and samples.

## 9. Receipt route `/receipts/$receiptId`

### Layout

Desktop:

- centered receipt visual on left or main column;
- provenance explanation and benchmark links beside it;
- evidence and status history below.

Mobile:

- receipt full width;
- expandable technical details;
- sticky share action only if it does not obscure content.

### Required behavior

- copy public receipt URL;
- copy Markdown badge/snippet;
- link exact benchmark version and track;
- explain verification status;
- show signature fingerprint when applicable;
- show dispute or supersession banner;
- expose machine-readable JSON endpoint or download containing only public receipt data.

### Empty or invalid states

A receipt is never silently missing because it is disputed. Show its state unless legal or safety removal requires a tombstone.

## 10. Stall route `/stalls/$handle`

Sections:

- profile header;
- authored benchmarks;
- recent receipts submitted;
- independent reproductions;
- public runner registrations;
- optional external links.

Do not show private email, WorkOS identifiers, or follower counts.

## 11. Model route `/models/$modelSlug`

Show:

- canonical model name and provider;
- exact IDs and aliases;
- warning if alias is mutable or ambiguous;
- receipts grouped by aisle and benchmark;
- filters for verification, date, and track type;
- no global aggregate score.

The page should make sparse data look honest rather than fill it with fake summaries.

## 12. Basket route `/basket`

Signed-in only.

Show saved benchmarks grouped by:

- newly saved;
- recently updated;
- has new receipts since save later;
- aisle.

MVP action is only save/remove. No collaborative lists or notifications yet.

## 13. Run request routes

### `/runs/request`

Entered from a benchmark version and track.

MVP fields:

- selected benchmark/version/track, read-only;
- model target selection or description;
- short public or owner-visible note;
- acknowledgement of endpoint exposure policy;
- submit.

If no runner is configured, allow a non-binding interest request:

```text
This stall does not offer automatic runs yet. Send the maintainer a request to test this model.
```

### `/runs/$requestId`

Show status timeline:

```text
Requested → Approved → Queued → Running → Receipt published
```

Use reactive Convex updates where useful. Errors remain coarse and never contain hidden content.

## 14. Settings routes

### Profile

- public handle;
- display name;
- avatar;
- bio;
- GitHub link;
- account deletion/request flow.

### Runners

- registered public keys;
- status and fingerprint;
- authorized benchmarks;
- key rotation;
- revoke action;
- copy CLI registration instructions.

Never display or ask the user to upload a private signing key.

## 15. Moderation routes

Protected by server and Convex role checks.

Moderation views must show only public content and redacted report text. They do not need hidden prompts to resolve catalog or receipt disputes.

Actions:

- hide from discovery;
- suspend benchmark;
- mark receipt disputed/invalid;
- suspend or revoke runner;
- resolve report;
- add public and private notes;
- view audit history.

Every action requires a reason and creates an audit event.

## 16. Authentication UX

Use WorkOS-hosted authentication with GitHub enabled.

### Sign-in action

Display:

```text
Continue with GitHub
```

Optional support text:

```text
GitHub identity keeps stalls attributable and cuts down on anonymous spam.
```

Do not request unnecessary GitHub OAuth scopes. Basic identity is sufficient for MVP.

### Return path

Preserve the intended safe internal return path through the WorkOS flow. Validate it against open redirects.

### Auth loading

Do not flash protected edit controls before Convex has validated authentication. Use an intentional skeleton or neutral loading state.

## 17. Loading, error, and empty states

Every data-driven section needs:

- skeleton or reserved space;
- empty state with one relevant action;
- sanitized error state;
- retry where safe.

Market-themed examples:

- Loading: “Unpacking crates…”
- Empty: “Nothing on this shelf yet.”
- 404: “This stall has packed up.”
- Server error: “The market bell jammed. Try again.”

Pair playful copy with a normal explanation or action.

## 18. Accessibility

- All routes support keyboard navigation.
- Free-sample reveal uses a real button and announces expanded state.
- Tabs follow accessible tab semantics.
- Status is not communicated by color alone.
- Decorative awnings and stamps are hidden from assistive technology.
- Receipt layout follows normal document reading order.
- Headings are hierarchical.
- Focus states are prominent.
- Motion respects `prefers-reduced-motion`.
- Touch targets are at least comfortably tappable.
- Social-card visual quirks do not leak into page accessibility.

## 19. SEO and metadata

Public benchmark pages should include:

- descriptive title;
- one-line description;
- canonical URL;
- current versus historical version metadata;
- Open Graph/Twitter image;
- structured breadcrumb data where useful;
- `noindex` for drafts, moderation, settings, and run-request pages.

Do not place hidden-set metadata beyond deliberate public facts into structured data.

## 20. Responsive breakpoints

Design mobile-first.

- Mobile: one-column cards, linear benchmark page, bottom-safe actions
- Tablet: two-column card grid, compact filters
- Desktop: three/four-column cards, sticky page anchors, live publish preview

The identity should survive without elaborate desktop-only illustrations.
