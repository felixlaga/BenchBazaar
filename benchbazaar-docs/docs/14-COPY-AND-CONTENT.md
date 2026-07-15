# Copy and content guide

## 1. Voice

BenchBazaar sounds:

- curious;
- technically literate;
- playful without trying too hard;
- direct about uncertainty;
- welcoming to small contributions;
- allergic to inflated benchmark claims.

It does not sound:

- corporate;
- breathless;
- medieval-roleplay-heavy;
- smug about model failures;
- dismissive of serious evaluation;
- absolute about security.

## 2. Primary positioning

### Recommended hero

```text
Odd tests. Useful signals.

The open bazaar for community-made LLM benchmarks.
Publish the method, keep the official test set sealed, and bring receipts.
```

Actions:

```text
Browse the bazaar
Publish a benchmark
Open the mystery crate
```

### Alternative concise hero

```text
Weird benchmarks. Open methods. Receipts included.
```

### Technical description

```text
BenchBazaar is an open registry for versioned LLM evaluations. Authors publish public examples, scoring rules, limitations, and signed results while keeping the official scored items behind a controlled runner.
```

## 3. Tagline candidates

Strong:

- Odd tests. Useful signals.
- Weird benchmarks. Open methods. Receipts included.
- Where strange tests earn serious receipts.
- The open market for model reality checks.
- Bring a benchmark. Leave with receipts.

Use **Odd tests. Useful signals.** as the default.

Avoid:

- The world's most accurate AI leaderboard.
- Contamination-proof benchmarks.
- The ultimate intelligence marketplace.
- Truth for AI.

## 4. Navigation labels

Recommended:

```text
Browse
Aisles
Fresh
Receipts
About
Basket
Publish
```

Do not replace every literal label with market slang. “Receipts” is understandable in context; “Aisles” needs a category subtitle on first use.

## 5. Sealed-set explanation

### Compact

```text
Sealed set
The scored questions are not publicly downloadable. A controlled runner presents them to the model and publishes a result receipt.
```

### Full caveat

```text
The official questions stay off the public web and are evaluated through a controlled runner. This reduces easy scraping and training-data contamination. A model service may still observe prompts sent to it, so sealed does not mean impossible to leak.
```

### Public samples

```text
Free sample
This example is intentionally public and is never included in the official score.
```

### No runner yet

```text
Window-shopping only
The benchmark method and public samples are available, but this stall has not connected an official sealed runner yet.
```

## 6. Verification copy

### Self-reported

```text
Self-reported
The submitter entered this result. BenchBazaar has not independently verified the run.
```

### Artifact linked

```text
Artifact linked
The receipt includes a public run artifact. The link and format are present; this label does not certify the result's correctness.
```

### Runner signed

```text
Runner signed
A registered runner signed this exact receipt payload. The signature proves its source and integrity, not that the benchmark or runner is scientifically infallible.
```

### Maintainer official

```text
Maintainer official
The benchmark maintainer recognizes this as an official run for this version and track.
```

### Independently reproduced

```text
Independently reproduced
A separate trusted runner produced a compatible result within the benchmark's stated tolerance.
```

### Disputed

```text
Disputed
A material concern has been raised about this run. It is excluded from the default scoreboard while the receipt remains visible.
```

## 7. Marketplace section copy

### Fresh stock

```text
Fresh stock
Recently published benchmarks.
```

### Best sellers

```text
Best sellers
Benchmarks with the most distinct valid model runs in the past 30 days—not the most pageviews.
```

### Receipts just in

```text
Receipts just in
Fresh model results with version and provenance attached.
```

### Curator's cart

```text
Curator's cart
A small hand-picked collection from across the bazaar.
```

### Mystery crate

```text
Open the mystery crate
Jump to one random published benchmark.
```

### Most reproduced

```text
Inspector favorites
Benchmarks with independent compatible reproductions.
```

Use “Most reproduced” as the accessible/plain subtitle.

## 8. Empty states

### No search results

```text
Nothing on this shelf.
Try another phrase, clear a filter, or publish the benchmark you expected to find.
```

### No receipts

```text
No receipts yet.
The method is here; the models have not made it to the checkout.
```

### Empty basket

```text
Your basket is empty.
Save benchmarks you want to run, compare, or revisit.
```

### No authored benchmarks

```text
This stall is still setting up.
No published benchmarks yet.
```

### No runner

```text
No official runner connected.
You can still inspect the method and public samples.
```

### No drafts

```text
No crates in the back room.
Start a benchmark draft.
```

## 9. Loading and success

Loading:

- Unpacking crates…
- Checking the shelves…
- Printing the receipt…

Success:

- Your benchmark is on the market.
- Saved to your basket.
- Receipt accepted.
- Runner key registered.
- Fresh version published.

Use normal error details when an action fails.

## 10. Errors

### Generic

```text
The market bell jammed.
Try again. If the problem continues, the request ID below will help us investigate.
```

### 404

```text
This stall has packed up.
The page may have moved, been archived, or never existed.
```

### Forbidden

```text
Staff only behind this counter.
You do not have permission to perform this action.
```

### Publish validation

```text
A few labels are still missing.
Review the highlighted sections before publishing this immutable version.
```

### Receipt incompatibility

```text
This receipt does not fit the selected shelf.
Its benchmark version, track, scorer, or hidden-set digest does not match the official contract.
```

### Rate limit

```text
Fresh-stock limit reached.
Official runs are limited to reduce repeated exposure of the sealed set. Try another model or return after the listed window.
```

## 11. Publish-form helper copy

### Title

```text
Name the benchmark, not the paper.
Short, distinctive titles are easiest to remember and share.
```

### Summary

```text
Describe the test in one sentence a developer can understand.
```

### Purpose

```text
What capability is this trying to isolate, and why would anyone care?
```

### Public samples

```text
Everything in this section may be published and indexed.
Use display examples only. Never paste official hidden questions or answers here.
```

### Supported claims

```text
What can a good score reasonably suggest?
```

### Unsupported claims

```text
What would be an overinterpretation of this benchmark?
```

### Limitations

```text
Every benchmark has blind spots. Naming them makes the result more useful, not less impressive.
```

### Sealed-set digest

```text
A digest binds receipts to one exact private set or generator version without revealing its contents.
```

### Endpoint exposure

```text
A controlled runner keeps prompts off the public website. A remote model service can still see requests sent to it.
```

## 12. Publish confirmation

```text
Put version 1.0.0 on the market?

Published versions are immutable. Corrections and changed test sets require a new version.

By publishing, you confirm that:
- the free samples are intentionally public;
- the free samples are not part of the official scored set;
- public fields do not contain hidden test items;
- you have the right to publish the method and samples.
```

Primary action: **Publish version 1.0.0**  
Secondary action: **Keep editing**

## 13. Runner copy

### Registration

```text
Register a receipt printer
Add the runner's public signing key. Keep the private key on the machine that performs evaluations.
```

### Private-key warning

```text
Never paste a private signing key here. BenchBazaar only needs the public key.
```

### Revocation

```text
Revoke this runner key?
New receipts signed by this key will be rejected. Existing receipts keep their historical signature record.
```

### Signature explanation

```text
The stamp checks who printed the receipt and whether it changed. It does not inspect the runner's private test set or guarantee the benchmark is fair.
```

## 14. Seed benchmark concepts

Seed listings should be real enough to demonstrate the product but should not pretend synthetic scores are genuine.

### Oddities Tent

**Passive-Aggressive Calendar**  
Can a model distinguish a normal meeting invitation from one that politely communicates conflict, urgency, or resentment?

**Emoji Accountant**  
Can a model reconcile semi-structured expense notes written mostly in emoji and shorthand?

**The Unhelpful Helpdesk**  
Can a model identify the exact sentence where a support reply stops solving the user's problem and starts deflecting?

### Agent Alley

**Three Tabs and a Deadline**  
Can an agent complete a small web task while preserving information across several tabs without repeating completed steps?

**Bureaucracy Speedrun**  
Can an agent navigate a deliberately mundane form, obey validation constraints, and avoid submitting private fields unnecessarily?

### Reasoning Row

**Recipe After the Substitutions**  
Can a model recompute a recipe after several ingredient and serving-size changes without reintroducing removed ingredients?

**Unit Goblin**  
Can a model resolve mixed units, ambiguous abbreviations, and rounding rules in a practical planning task?

### Language Lane

**Regional Idiom Repair Shop**  
Can a model explain or translate an idiom without replacing it with a culturally different claim?

**Tone Customs Desk**  
Can a model rewrite a message for another context while preserving intent and not inventing extra politeness commitments?

### Robustness Booth

**One Bad Instruction**  
Can a model ignore one irrelevant or malicious instruction embedded in an otherwise ordinary task?

**Helpful, Not Helpless**  
Can a model refuse the unsafe part of a mixed request while still answering the harmless part?

### Vision Arcade

**Screenshot Archaeologist**  
Can a model infer the likely state of a software interface from a partial, low-resolution screenshot without inventing hidden controls?

These are listing concepts, not official hidden questions. Public seed samples must be authored separately and labeled display-only.

## 15. Launch thread outline

```text
1. Introducing BenchBazaar: odd tests, useful signals.
2. Anyone can publish a focused LLM benchmark without building a full evaluation website.
3. The official scored set stays sealed; the public gets the method, free samples, limitations, and receipts.
4. Each result has an exact benchmark version, track, model ID, scorer, digest, and evidence label.
5. The fun bit: aisles, stalls, price tags, baskets, best sellers, and literal receipt cards.
6. The honest caveat: a model endpoint can still observe prompts sent to it. Sealed reduces public leakage; it is not magic.
7. Link to browse, publish, source, and protocol docs.
```

## 16. README badges

Possible benchmark badge:

```text
BenchBazaar · Sealed benchmark · 14 receipts
```

Possible result badge:

```text
BenchBazaar receipt · 82.4% · runner signed
```

Badge text must never imply “verified” without the exact evidence label.
