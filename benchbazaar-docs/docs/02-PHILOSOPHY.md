# Product philosophy

This document provides judgment rules for decisions that are not fully specified elsewhere.

## 1. Open source does not require open test answers

BenchBazaar should be open in the ways that enable trust and contribution:

- source code;
- public benchmark descriptions;
- scoring methodology;
- manifest schemas;
- runner protocol;
- version history;
- receipt format;
- moderation and ranking rules.

The official scored prompts and expected answers can remain sealed. Publishing them would undermine the purpose of the evaluation.

The project should explain this distinction plainly: **open method, sealed exam**.

## 2. Show the test; do not dump the test

Every benchmark needs public free samples so people can understand and critique it. Those samples are intentionally public and never count toward official scores.

A good page gives visitors enough information to answer:

- Is this testing what it claims to test?
- Is the scorer reasonable?
- Could the result matter in practice?
- What failure modes or biases should I know about?

It does not give them a downloadable copy of the entire hidden set.

## 3. Receipts over claims

A score without context is marketing. A receipt should make the relevant facts inspectable:

- what was run;
- against which version;
- using which track and configuration;
- by whom or by which runner;
- when;
- with what verification status;
- against which hidden-set digest.

The product should make good provenance look more prestigious than a naked high score.

## 4. Small and strange can still be valuable

BenchBazaar welcomes tests such as:

- recognizing passive-aggressive calendar invitations;
- following a recipe after contradictory substitutions;
- identifying where a generated support reply becomes unhelpful;
- navigating an unfamiliar form;
- translating regional idioms without flattening meaning;
- reconciling expenses represented in emoji;
- refusing one harmful request without refusing the harmless neighboring request.

A benchmark can be playful, narrow, or small. It must still disclose its sample size, method, and limits.

## 5. Playful surface, serious substrate

The market theme should encourage exploration and contribution. It should never obscure:

- metric definitions;
- version compatibility;
- verification levels;
- known limitations;
- data visibility;
- security boundaries.

Examples:

- “Free samples” may label public examples, but the page also says “Public examples—not included in the scored set.”
- “Receipt” may look like thermal paper, but it contains machine-readable provenance.
- “Best sellers” may be a playful heading, but its ranking rule is visible.

## 6. Clarity outranks cleverness

Use one metaphor per concept and pair it with ordinary language. Do not make users memorize a vocabulary to operate the site.

Good:

> Fresh stock  
> Recently published benchmarks

Bad:

> The peddler's wagon has replenished its wares

The second may be amusing once, but it makes navigation worse.

## 7. No universal intelligence number

Benchmarks test different capabilities, modalities, contexts, and tradeoffs. BenchBazaar should not average unrelated scores into one global rank.

Valid comparisons are scoped to:

- one benchmark version;
- one track;
- one primary metric definition;
- compatible tool and prompting rules.

Curated collections may summarize patterns, but they must not imply scientific precision that is not present.

## 8. Versioning is part of the user experience

Benchmarks evolve. Test pools rotate. Scorers improve. Model endpoints change.

Published versions are immutable so that old receipts remain interpretable. A new version should show:

- what changed;
- why it changed;
- whether scores remain comparable;
- whether the hidden pool or generator digest changed;
- which version is recommended.

Version history should feel normal, not like an advanced setting.

## 9. Verification is a ladder, not a badge

Do not flatten all evidence into “verified” versus “unverified.” Use specific labels:

1. `self_reported`
2. `artifact_linked`
3. `runner_signed`
4. `maintainer_official`
5. `independently_reproduced`
6. `disputed`

A receipt can carry multiple evidence facts, but the interface should explain what each one proves and does not prove.

A signature proves which runner produced a receipt. It does not prove the runner code was honest.

## 10. Security theater is worse than a modest guarantee

Do not claim that any of these protect a benchmark from extraction:

- hiding a URL;
- requiring a login before downloading the whole set;
- encrypting data that is decrypted in the browser;
- minifying JavaScript;
- putting prompts in WebAssembly;
- deleting a download button;
- asking users not to scrape;
- using a robots directive.

The initial guarantee is deliberately narrower:

> The official test items are not published or returned through the BenchBazaar web application. They remain inside a controlled runner and only aggregate or deliberately redacted results are published.

## 11. The model must see the question, but the public does not need to

Any useful evaluation eventually presents an input to a model. This creates a fundamental boundary:

- BenchBazaar can keep items off the public web.
- A trusted runner can avoid giving the full set to the human requester.
- An untrusted model endpoint can still log the prompts it receives.

Mitigate this with limited runs, rotating pools, generated variants, canaries, and trusted/no-training endpoints. Do not pretend the limitation disappears.

## 12. Community contribution without community chaos

The MVP should allow broad publishing but keep moderation bounded:

- GitHub-backed identity;
- no comments;
- visible unreviewed status;
- reports and disputes;
- curator picks governed by public criteria;
- links to external issue trackers for long technical discussions.

Open submission does not mean every benchmark is endorsed.

## 13. Editorial taste is a feature

A memorable launch needs excellent seeded content. The homepage should mix:

- genuinely useful operational tests;
- benchmarks with charming premises;
- different modalities and domains;
- examples that look good in a screenshot;
- honest limitation statements.

Curator picks are allowed and should be transparently editorial.

## 14. Side-project discipline is a product value

Prefer:

- author-operated runner before hosted compute;
- signed receipt upload before orchestration;
- Postgres-like query patterns in Convex before specialized search infrastructure;
- a hand-curated home section before an opaque ranking algorithm;
- a small number of polished routes before a large feature matrix.

A simple, dependable bazaar is better than an unfinished evaluation cloud.

## 15. Make the honest action the attractive action

Design should reward:

- documenting limitations;
- providing public samples;
- pinning versions;
- signing receipts;
- reproducing another author's run;
- linking source and methodology;
- rotating stale hidden pools.

The site should not reward:

- inflated claims;
- hidden prompting tricks;
- selective score deletion;
- pageview bait;
- unexplained aggregate rankings.
