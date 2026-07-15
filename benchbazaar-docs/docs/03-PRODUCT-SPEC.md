# Product specification

## 1. Product summary

BenchBazaar is a public catalog and controlled evaluation registry for community-made LLM benchmarks.

Authors publish a benchmark listing containing:

- title and one-line premise;
- capability being tested;
- public free samples;
- scoring method;
- tracks and metrics;
- limitations;
- source and license metadata;
- hidden-set policy;
- version history;
- model result receipts.

The official scored examples remain sealed inside a trusted runner or private author environment. The site publishes results and provenance, not the raw hidden set.

## 2. Product vocabulary

| Plain concept   | Display label       | Notes                                            |
| --------------- | ------------------- | ------------------------------------------------ |
| Website         | The Bazaar          | Mostly brand copy, not required in every label   |
| Category        | Aisle               | Always include category context                  |
| Author profile  | Stall               | “Stall by @handle” or “Vendor profile”           |
| Benchmark       | Benchmark / listing | Keep “benchmark” visible for search and clarity  |
| Public example  | Free sample         | Must say it is not scored                        |
| Result          | Receipt             | Core branded object                              |
| Bookmark        | Basket              | Button can read “Save to basket”                 |
| New items       | Fresh stock         | Subtitle: recently published benchmarks          |
| Popular by runs | Best sellers        | Show exact ranking rule                          |
| Random item     | Mystery crate       | Button explains that it opens a random benchmark |
| Verification    | Inspector stamp     | Accompanied by literal status text               |

## 3. User roles

### Visitor

Can:

- browse and search public benchmarks;
- view benchmark versions, public samples, limitations, and receipts;
- view model and vendor pages;
- open a random benchmark;
- share pages and copy badges.

Cannot:

- create drafts;
- save to basket;
- submit receipts or run requests;
- report content without signing in.

### Signed-in member

Authenticated through WorkOS AuthKit, initially via GitHub.

Can:

- create a stall profile;
- save benchmarks to a basket;
- create benchmark drafts;
- publish owned drafts;
- submit self-reported or artifact-linked receipts;
- request a sealed run where supported;
- report content;
- manage their own runner registrations later.

### Benchmark owner

Can:

- edit an unpublished draft;
- invite collaborators in a later release;
- publish an immutable version;
- create a successor version;
- mark receipts as maintainer-official;
- dispute a receipt with a public reason;
- configure the benchmark's sealed-runner mode;
- deprecate a version without deleting it.

Cannot:

- rewrite a published version;
- silently delete unfavorable valid receipts;
- relabel self-reported receipts as runner-signed;
- access another benchmark's hidden assets.

### Runner operator

Can:

- register a runner public key and capabilities;
- receive or create authorized jobs;
- submit signed receipts;
- update runner health metadata.

A runner is a machine identity, not a human authorization shortcut.

### Curator / moderator

Can:

- feature benchmarks;
- resolve reports;
- hide content from discovery;
- mark receipts disputed or invalid;
- suspend runner keys;
- add moderation notes and audit events.

Moderators should not receive sealed test content through ordinary moderation tools.

## 4. Information architecture

```text
/                              Homepage
/browse                        Search and browse
/aisles/$aisle                 Category page
/b/$slug                       Current benchmark version
/b/$slug/v/$version            Exact benchmark version
/stalls/$handle                Author/vendor profile
/models/$modelSlug             Model results
/receipts/$receiptId           Result receipt
/basket                        Saved benchmarks
/publish                       New benchmark draft
/b/$slug/edit                  Edit draft or create next version
/runs/request                  Request controlled run
/settings/profile              Stall/profile settings
/settings/runners              Runner registrations
/docs                          Human-facing protocol documentation
/about                         Mission and policies
/moderation                    Restricted moderation tools
```

Exact route conventions are defined in `07-ROUTES-AND-UX.md`.

## 5. Homepage

The homepage must answer four questions immediately:

1. What is this? A community catalog of LLM benchmarks.
2. Why is it different? Official scored sets stay sealed.
3. What can I do? Browse, publish, inspect receipts, or request a run.
4. Is it fun? The visual language and seeded content say yes.

### Required sections

1. **Hero**
   - BenchBazaar wordmark
   - “Odd tests. Useful signals.”
   - one-sentence explanation
   - global search
   - “Browse the bazaar” primary action
   - “Publish a benchmark” secondary action
   - “Open the mystery crate” tertiary action

2. **Market aisles**
   - 5–7 categories
   - illustrated or typographic signs
   - benchmark counts

3. **Fresh stock**
   - recently published benchmark versions
   - deterministic ordering by publish time

4. **Curator's cart**
   - manually selected collection with an editorial sentence

5. **Receipts just in**
   - recent valid receipts
   - exact model, benchmark, score, and verification label

6. **Best sellers**
   - most distinct valid runs within a visible time window
   - not pageviews

7. **How sealed evaluation works**
   - three-step graphic: public method → controlled run → public receipt
   - link to detailed explanation

## 6. Browse and search

### Searchable fields

- benchmark title;
- one-line summary;
- aisle;
- tags;
- author handle and display name;
- capability terms;
- model names when filtering by results.

### Filters

Keep the first version small:

- aisle;
- modality;
- scoring type;
- sealed/open display status;
- verification availability;
- recently updated;
- has receipts;
- curated only.

### Sorts

- relevance;
- newest;
- most receipts in 30 days;
- most independently reproduced;
- most saved.

Every sort must have a visible definition.

## 7. Benchmark page

The benchmark page is the main product page.

### Header

Show:

- aisle breadcrumb;
- title;
- one-line premise;
- owner/stall;
- exact version;
- publish/update date;
- status: current, deprecated, draft, or unreviewed;
- sealed-set label;
- source and license links;
- actions: save, request run, bring receipt, share.

### Price tags

Use compact tags for facts such as:

- text, image, audio, browser, tools;
- approximate hidden item count or count range;
- exact match, code scorer, human judge, LLM judge;
- open method;
- sealed set;
- license;
- estimated input tokens where meaningful;
- run availability.

Do not show fake monetary prices.

### Free samples

Require at least three public examples for a normal benchmark listing.

Each sample may contain:

- input;
- optional media;
- expected answer or rubric;
- short explanation;
- interactive “reveal answer” behavior.

Display a persistent note:

> These are public examples for understanding the benchmark. They are not included in official scores.

### What it tests

Include:

- target capability;
- intended use;
- why it is useful;
- what success means;
- what the benchmark does not measure.

### Scoreboard

The default scoreboard:

- is scoped to one exact version and one track;
- shows the best valid compatible receipt per exact model ID;
- displays primary metric, sample count, date, and verification;
- lets users expand all receipts;
- excludes disputed or invalid runs by default while retaining access to history;
- never mixes tool-enabled and tool-disabled tracks.

### Run recipe

Show only public method information:

- framework or runner compatibility;
- public scorer description;
- prompt policy;
- tool policy;
- number or range of items;
- timeout and retry rules;
- source repository where applicable;
- run-request availability.

Do not reveal hidden prompts, answers, generator secrets, or sensitive transformations.

### Fine print

Prominently list limitations:

- small sample size;
- domain or cultural assumptions;
- subjective judging;
- contamination exposure level;
- prompt sensitivity;
- model endpoint visibility;
- data license constraints;
- known failure cases;
- whether the benchmark is primarily exploratory or entertainment.

### Versions

Show:

- current recommended version;
- immutable historical versions;
- changelog;
- score comparability statement;
- hidden-set digest change status;
- deprecation reasons.

### Related benchmarks

Use aisle and tag overlap. Do not add an embedding recommendation service in the MVP.

## 8. Receipt page

A receipt is both a serious provenance record and a branded share object.

Required fields:

- receipt ID;
- benchmark title and exact version;
- track;
- model provider and exact model identifier;
- primary metric and all published metrics;
- evaluated item count;
- scorer version;
- completed timestamp;
- runner or submitter;
- verification level;
- dataset/generator digest;
- configuration digest;
- artifact references when public;
- signature status;
- superseded/disputed state;
- limitations or notes.

Raw hidden prompts and expected answers are never displayed.

The visual design may resemble thermal paper, but the page must remain accessible, selectable, printable, and machine-readable.

## 9. Vendor/stall page

Show:

- avatar, handle, display name, bio, and GitHub link;
- authored benchmarks;
- maintained runners where public;
- receipts submitted;
- reproducibility contributions;
- curator or organization labels where applicable.

Avoid follower counts and popularity vanity metrics.

## 10. Model page

A model page is an index of receipts, not a universal ranking.

Show:

- canonical provider and exact model IDs;
- aliases with warning labels;
- benchmark results grouped by aisle;
- date and verification filters;
- prompt/tool track labels;
- no aggregate overall intelligence score.

## 11. Publishing flow

Use one page with sections and a persistent live preview rather than a long multi-route wizard.

### Section A: Listing

- title;
- slug preview;
- one-line premise;
- aisle;
- tags;
- modality;
- optional illustration.

### Section B: Purpose

- capability tested;
- why it matters;
- intended use;
- claims the benchmark supports;
- claims it does not support.

### Section C: Free samples

- minimum three;
- stable sample IDs;
- input and answer/rubric;
- explicit confirmation that these samples are public and excluded from official scoring.

### Section D: Scoring and tracks

For each track:

- ID and display name;
- prompting rules;
- tools allowed;
- retry policy;
- primary metric;
- metric direction;
- scorer type and version;
- judge model and public judge rubric when applicable.

### Section E: Sealed-set setup

Choose one:

- author-operated runner;
- manual signed receipt workflow;
- no official sealed runs yet;
- managed encrypted storage later.

Capture:

- item-count disclosure or range;
- dataset/generator digest;
- rotation policy;
- endpoint visibility warning;
- public contamination statement.

Never ask authors to paste hidden items into ordinary text fields.

### Section F: Source and licensing

- repository;
- write-up or paper;
- public method license;
- public sample license;
- hidden data rights confirmation;
- maintainer identity.

### Section G: Limitations

Require at least one limitation statement before publishing.

### Section H: Preview and publish

- preview benchmark card and page header;
- validate required fields;
- show irreversible version-publish warning;
- create immutable version snapshot.

## 12. Receipt submission

### Manual receipt

A signed-in user can submit:

- benchmark version and track;
- exact model ID;
- metrics;
- item count;
- timestamp;
- configuration summary;
- public artifact URL;
- notes.

It receives `self_reported` status unless stronger evidence is verified.

### Artifact-linked receipt

The user supplies a stable public artifact containing configuration and raw model outputs without hidden answers. The product may label it `artifact_linked` after format validation, not after assuming correctness.

### Runner-signed receipt

A registered runner submits a canonical payload and signature. The server verifies:

- runner key status;
- signature;
- benchmark/version authorization;
- digest compatibility;
- track compatibility;
- replay protection;
- payload schema.

It receives `runner_signed` status.

## 13. Run requests

Run requests are only available for benchmark versions with a configured runner path.

A request contains:

- benchmark version;
- track;
- model target;
- requester;
- optional public note;
- status;
- cost/approval metadata when applicable.

State machine:

```text
requested
  → approved
  → queued
  → running
  → succeeded
  → receipt_published

requested → declined
queued/running → failed
requested/approved/queued → canceled
```

The MVP may support request collection without automatic execution. This is preferable to insecure credential handling.

## 14. Verification labels

| Status                   | Meaning                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| Self-reported            | Submitter entered the result; no machine attestation                      |
| Artifact linked          | A public run artifact is linked and structurally valid                    |
| Runner signed            | A registered runner signed the canonical receipt                          |
| Maintainer official      | Benchmark maintainer designates the run as official                       |
| Independently reproduced | A separate trusted operator produced a compatible result within tolerance |
| Disputed                 | A public reason challenges the result or method                           |
| Invalid                  | Moderation or validation determined that the result should not rank       |

Do not use a single generic green check for all statuses.

## 15. Curation and ranking

Homepage collections:

- Fresh stock: publish time
- Receipts just in: valid receipt completion time
- Best sellers: distinct valid model runs in the previous 30 days
- Most reproduced: distinct trusted operators
- Curator's cart: manual editorial selection
- Mystery crate: random eligible benchmark

Eligibility excludes hidden, draft, suspended, and invalid content.

## 16. Moderation

MVP moderation includes:

- report benchmark;
- report receipt;
- dispute receipt;
- hide from discovery;
- mark invalid;
- suspend runner key;
- public moderation note where appropriate;
- private audit event.

Do not build comments or direct messaging.

## 17. MVP scope

### Included

- public catalog and search;
- homepage sections;
- benchmark, version, stall, model, and receipt pages;
- WorkOS GitHub sign-in;
- profile creation;
- benchmark draft and immutable publish;
- public samples;
- manual receipts;
- runner registration and signed receipt ingestion after the basic slice;
- basket saves;
- reports and moderation basics;
- social cards;
- public documentation pages.

### Deferred

- arbitrary hosted evaluation code;
- GPU inference;
- permanent provider-key storage;
- paid run marketplace;
- confidential computing;
- team organizations and complex collaboration;
- comments and feeds;
- real-time chat;
- vector search;
- global aggregate model score;
- automatic benchmark-quality scoring.
