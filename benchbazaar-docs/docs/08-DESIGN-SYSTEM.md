# Design system

## 1. Brand premise

BenchBazaar should feel like a tiny, well-loved public market run by technically serious people with a sense of humor.

It should not look like:

- a generic SaaS analytics dashboard;
- a crypto marketplace;
- a children's game;
- a corporate research portal;
- a photorealistic bazaar theme park.

The visual tension is the point:

- warm paper, striped awnings, baskets, labels, and rubber stamps;
- exact model IDs, digests, metrics, and version numbers;
- playful discovery;
- sober limitations and provenance.

## 2. Logo direction

Primary mark:

- a striped market canopy above a literal workbench;
- simple enough to read at favicon size;
- no detailed character illustration required;
- wordmark uses a sturdy, friendly serif.

Favicon:

- canopy plus one bold `B`;
- or a simplified bench silhouette beneath two awning stripes.

Receipt stamp:

- circular or rectangular `BB` inspector mark;
- used sparingly for runner-signed or reproduced receipts.

## 3. Design tokens

These are a recommended starting point, not a substitute for contrast testing.

```css
:root {
  --paper: #fff8e7;
  --paper-raised: #fffdf6;
  --ink: #211f1a;
  --ink-muted: #6b665b;
  --line: #2d2922;

  --tomato: #d94a3a;
  --tomato-dark: #a9342a;
  --mustard: #e2ad2f;
  --leaf: #3f7756;
  --sky: #4d7ea8;
  --plum: #74546f;

  --success: #2f6f4e;
  --warning: #9a6518;
  --danger: #a43630;
  --info: #315f88;

  --shadow-sm: 2px 2px 0 rgba(33, 31, 26, 0.16);
  --shadow-md: 4px 5px 0 rgba(33, 31, 26, 0.18);
  --radius-card: 14px;
  --radius-tag: 999px;
}
```

Use dark ink rather than pure black and warm paper rather than sterile white. Large text and UI controls still need WCAG-compliant contrast.

## 4. Typography

Recommended roles:

- **Display:** Fraunces or another warm variable serif
- **Interface/body:** Inter or another highly readable sans serif
- **Technical/receipt:** IBM Plex Mono or another clear monospace

Rules:

- display serif for page titles, aisle signs, and major headings;
- sans serif for body copy and controls;
- monospace only for scores, IDs, hashes, timestamps, and receipt rows;
- avoid setting long body paragraphs in display type;
- use tabular numerals for score columns.

## 5. Spacing and density

The bazaar should feel lively, not cramped.

- cards have generous internal padding;
- metadata tags wrap naturally;
- receipt rows are dense but readable;
- major sections have strong vertical separation;
- mobile layouts avoid horizontal scrolling except code blocks;
- keep playful decoration outside critical reading paths.

Use a conventional spacing scale. Do not introduce arbitrary values for every component.

## 6. Borders and surfaces

- cards use an ink-colored 1–2px border;
- shadows may be slightly offset and graphic rather than blurred;
- paper surfaces can use very subtle noise through a tiny static background image, but it must not affect readability or performance;
- rubber stamps may rotate by one or two degrees;
- avoid random rotation on body text or controls;
- awnings are component headers, not page-wide visual clutter.

## 7. Core components

### `MarketCard`

Purpose: benchmark listing.

Contains:

- optional striped awning by aisle;
- title;
- one-line premise;
- vendor attribution;
- price-tag facts;
- receipt/reproduction count;
- optional leading model for one scoped track;
- inspector stamp where meaningful.

States:

- normal;
- hover/focus;
- curated;
- unreviewed;
- deprecated;
- loading skeleton.

### `AwningHeader`

A small top strip with two or three alternating colors. Aisles may have different secondary colors while preserving the same structure.

Keep text contrast independent from awning pattern.

### `PriceTag`

Use for objective metadata:

- `120 hidden items`
- `text + image`
- `exact match`
- `sealed set`
- `open method`
- `runner available`

Do not overuse it for navigation or paragraphs.

### `InspectorStamp`

Visual accent plus explicit label:

```text
RUNNER SIGNED
INDEPENDENTLY REPRODUCED
CURATOR PICK
```

Never use only the stamp shape or color to communicate status.

### `FreeSampleCard`

Contains:

- input;
- media;
- reveal button;
- expected answer/rubric;
- explanation;
- fixed note that it is not scored.

The reveal interaction must be keyboard and screen-reader accessible.

### `Receipt`

Visual style:

- narrow paper column;
- perforated or zig-zag edge as decoration;
- monospace details;
- BenchBazaar header;
- divider rules;
- signature/status stamp.

Functional requirements:

- normal semantic HTML;
- selectable text;
- print-friendly;
- responsive width;
- no information encoded only in decorative alignment.

### `Scoreboard`

- clear track selector;
- exact model names;
- metric with direction;
- receipt link on every row;
- verification label;
- responsive card-row fallback on small screens;
- no chart required for MVP.

### `MysteryCrateButton`

- small crate or parcel icon;
- one restrained shake animation on intentional hover or activation;
- no continuous motion;
- accessible name explains it opens a random benchmark.

### `BasketButton`

- “Save to basket” / “In your basket” text;
- brief bounce only on successful save when motion is allowed;
- optimistic UI only if rollback is robust.

### `StatusBanner`

Variants:

- historical version;
- deprecated;
- disputed receipt;
- sealed-set warning;
- unreviewed benchmark;
- incident notice.

Use direct language before themed copy.

## 8. Aisle identity

Aisles can use small motifs rather than separate mini-brands.

| Aisle            | Motif                       | Accent idea  |
| ---------------- | --------------------------- | ------------ |
| Reasoning Row    | chalk marks / puzzle tile   | mustard      |
| Code Corner      | terminal ticket / bracket   | sky          |
| Agent Alley      | signpost / route map        | leaf         |
| Vision Arcade    | picture frame / eye chart   | plum         |
| Language Lane    | speech cards / lettering    | tomato       |
| Robustness Booth | umbrella / crash-test stamp | deep mustard |
| Oddities Tent    | pennant / curiosity cabinet | mixed accent |

Keep the base card design consistent.

## 9. Page-level composition

### Homepage

The hero should be typographic and illustrative, not a giant product screenshot. A small row of market stalls or a workbench illustration can sit beside the copy.

Use asymmetry carefully:

- editorial hero;
- tidy card grids;
- receipt strip;
- one hand-picked collection.

### Benchmark page

The serious content begins quickly. Do not place a large decorative illustration above all useful information.

Recommended top area:

- breadcrumb;
- title and summary;
- vendor/version line;
- tags;
- actions;
- compact sealed-set explanation.

### Publish page

The editor should feel like preparing a listing at a stall:

- numbered sections;
- helpful examples;
- live card preview;
- clear completion checks;
- no gamified progress points.

### Receipt page

Allow the receipt visual to be the star, but provide a plain-language interpretation beside or below it.

## 10. Motion

Allowed:

- awning lifts 2–3px on card hover;
- stamp lands once on publish success;
- basket bounces once after save;
- receipt unrolls subtly on initial entry;
- mystery crate shakes once;
- filter chips compress slightly when toggled.

Avoid:

- parallax;
- continuous bobbing;
- scroll hijacking;
- WebGL;
- heavy physics;
- sound;
- confetti for routine actions;
- animation that delays reading.

Respect `prefers-reduced-motion` by removing transforms and using immediate state changes.

## 11. Icons and illustration

Use a coherent hand-drawn or block-print style for custom illustrations. Generic interface icons may come from one consistent open icon set.

Custom motifs:

- stall canopy;
- bench;
- basket;
- receipt roll;
- rubber stamp;
- price tag;
- mystery crate;
- market signpost.

Do not mix emoji, photorealistic stock art, glossy 3D icons, and line icons in the same system. Emoji may appear in benchmark content, not as the primary interface icon set.

## 12. Accessibility and status colors

Every status combines:

- icon or shape;
- text label;
- color;
- optional explanation.

Examples:

- green stamp + “Runner signed”;
- amber triangle + “Self-reported”;
- red banner + “Disputed”;
- gray clock + “Historical version.”

Test focus rings against paper, colored tags, and dark buttons.

## 13. Forms

- labels above fields;
- helper text below;
- errors adjacent and summarized at publish time;
- autosave status in plain language;
- destructive actions separated visually;
- Markdown editor with preview, but not a giant WYSIWYG dependency;
- character guidance rather than unnecessarily strict limits;
- explicit warnings around public samples and hidden data.

Critical warning beside sample editor:

> Everything entered here may appear publicly. Add display examples only—never paste official hidden test items.

## 14. Dark mode

Dark mode is deferred unless it comes nearly free from the token system. The launch identity is paper-first. A rushed dark mode that destroys the market-paper character is worse than a polished accessible light theme.

## 15. Social cards

Benchmark card:

```text
BENCHBAZAAR
[aisle sign]

Can an LLM recognize
passive-aggressive calendar invites?

80 hidden items · human judged · sealed set
by @maya
```

Receipt card:

```text
RECEIPT JUST IN

Model X scored 74.2%
on Passive-Aggressive Calendar Invites

80 items · runner signed · v1.1.0
```

Rules:

- large readable title;
- exact model and score where applicable;
- BenchBazaar branding;
- no hidden prompt text;
- no tiny metadata wall;
- consistent safe margins.

## 16. Microcopy discipline

Use themed copy for delight at edges:

- loading;
- empty states;
- success;
- discovery;
- section headings.

Use plain copy for:

- security;
- privacy;
- verification;
- errors;
- limitations;
- destructive actions;
- legal/licensing matters.

A good rule: one joke per screen is enough.
