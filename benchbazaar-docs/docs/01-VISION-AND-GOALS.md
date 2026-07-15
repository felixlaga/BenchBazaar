# Vision and goals

## Vision

BenchBazaar becomes the internet's most enjoyable place to discover, publish, and discuss through evidence what language models can actually do.

It is not another monolithic benchmark suite and not another generic leaderboard. It is a public catalog of focused, community-authored tests: practical, narrow, strange, funny, adversarial, culturally specific, or simply overlooked by conventional evaluation.

The public method stays open. The official scored examples stay sealed. Every published score comes with a receipt.

## The problem

LLM evaluation has several recurring failures:

1. **Popular tests become training material.** Once complete test sets are published online, future model developers can intentionally or accidentally train on them. A high score can then measure memorization or test familiarity rather than general capability.
2. **Useful niche evaluations are hard to discover.** People build clever tests in notebooks, threads, gists, blog posts, and repositories, but there is no memorable home for them.
3. **Scores are detached from context.** Screenshots and social posts frequently omit the exact model version, prompt configuration, sample count, scorer, or benchmark revision.
4. **Evaluation tools feel institutional or sterile.** This raises the contribution barrier for small, weird, but genuinely illuminating ideas.
5. **Infrastructure ambitions kill side projects.** Hosting arbitrary code, GPUs, API keys, queues, and provider integrations can consume the project before a useful community exists.

BenchBazaar addresses these problems with a lightweight registry, sealed evaluations, and provenance-rich result receipts.

## Product thesis

A benchmark does not need to be large or academic to be useful. It needs to be:

- clear about the capability it is testing;
- honest about its limitations;
- reproducible enough to interpret;
- resistant to easy contamination;
- versioned;
- fun or compelling enough that people want to try and share it.

The site wins by combining **serious evaluation hygiene** with **playful community energy**.

## Target users

### Benchmark makers

Researchers, engineers, hobbyists, domain experts, red-teamers, educators, and curious internet people who have an evaluation idea.

They need:

- a polished page without building a website;
- a place to explain the test and its limits;
- a safe pattern for keeping scored items private;
- simple result ingestion;
- social cards that make the work visible;
- credit and a recognizable stall profile.

### Model builders

Teams and individuals developing models, agents, prompts, or products.

They need:

- capability-specific tests rather than one aggregate score;
- exact run provenance;
- a way to request or perform controlled runs;
- comparable results grouped by version and track;
- evidence that a score was not casually self-reported.

### Evaluation explorers

Developers, journalists, researchers, and “Twitter nerds” who want to understand current model strengths and failures.

They need:

- excellent browsing and search;
- free samples that make a benchmark immediately legible;
- clear receipts;
- amusing and useful discoveries worth sharing;
- enough caveats to avoid overinterpreting a result.

### Curators and moderators

A small trusted group maintaining quality and safety.

They need:

- reports and dispute states;
- transparent feature criteria;
- audit history;
- tools to hide content without erasing provenance;
- no comments section to moderate.

## Primary goals

### Goal 1: Make a benchmark understandable in under one minute

A visitor should quickly learn:

- what capability is being tested;
- why it matters;
- what a sample looks like;
- how scoring works;
- whether the official set is sealed;
- what the benchmark does not prove.

### Goal 2: Make publishing feel achievable

A person with a narrow idea and a handful of examples should be able to create a credible draft. Technical contributors can later attach a manifest, runner, repository, or signed receipts.

### Goal 3: Keep official scored items off the public web

The product must support public descriptions and samples without exposing the hidden pool. This reduces easy scraping and future training contamination.

### Goal 4: Make provenance visible and attractive

A receipt is not back-office metadata. It is a core product page and a shareable artifact.

### Goal 5: Stay operable as a side project

The initial system must avoid:

- GPU hosting;
- arbitrary code execution;
- permanent storage of user provider keys;
- a complex marketplace economy;
- high-touch moderation;
- brittle multi-service orchestration.

### Goal 6: Earn credibility through honesty

BenchBazaar should clearly label self-reported, signed, official, reproduced, and disputed results. It should state the limits of sealed evaluation rather than market it as magic.

## Non-goals

BenchBazaar is not initially:

- a hosted training platform;
- a general dataset repository;
- a replacement for existing evaluation frameworks;
- a GPU cloud;
- a universal model ranking;
- a benchmark paper review venue;
- a social network;
- a provider billing proxy;
- a cryptographic confidential-computing system;
- a guarantee that no model owner can ever observe a prompt.

## Success criteria

### Product success

The product is working when:

- a new visitor can explain BenchBazaar after seeing the homepage;
- a benchmark author can publish without writing custom frontend code;
- a benchmark page contains enough method and limitations to interpret results;
- result pages make exact provenance easy to inspect;
- hidden items are absent from the public application surface;
- people share benchmark and receipt cards because they are genuinely delightful.

### Community success

Early healthy signals include:

- multiple independent benchmark authors;
- benchmarks in several different aisles;
- independent reproductions, not only author-submitted scores;
- useful benchmarks alongside intentionally funny ones;
- model builders requesting runs;
- contributions to the runner protocol or metadata schema.

### Operational success

The project remains manageable when:

- normal catalog traffic is cheap;
- most pages are query-driven and cache-friendly;
- one maintainer can moderate reports;
- failed runner jobs do not block the main site;
- no hidden content appears in telemetry or support workflows;
- backups and rollback procedures are documented.

## Guardrail metrics

Do not optimize only for raw traffic. Track a small set of meaningful measures:

- published benchmarks with complete method and limitation fields;
- distinct benchmark authors;
- receipts per benchmark version;
- percentage of receipts above `self_reported` verification;
- independent reproductions;
- run-request completion rate;
- bookmark saves;
- report rate and moderation resolution time;
- zero confirmed sealed-data exposure incidents.

“Zero incidents” is a guardrail, not proof of perfect security.

## Launch promise

A credible launch statement is:

> BenchBazaar is an open catalog for weird and useful LLM benchmarks. Authors publish the idea, method, public samples, and limitations while keeping the official test set sealed. Model results arrive as versioned receipts with enough provenance to inspect and reproduce.

Avoid claims such as “contamination-proof,” “unhackable,” or “the definitive model leaderboard.”
