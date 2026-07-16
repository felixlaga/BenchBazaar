import type {
  AisleId,
  BenchmarkDetail,
  Receipt,
  VerificationStatus,
} from '../domain/catalog'
import { aisles } from '../domain/aisles'

type BenchmarkSeed = {
  slug: string
  title: string
  summary: string
  aisleId: AisleId
  tags: Array<string>
  modality?: 'text' | 'text + image'
  scorer: string
  itemCount: number
  receiptCount: number
  modelCount: number
  date: string
  curatorPick?: boolean
  runnerAvailable?: boolean
  purpose: string
  method: string
  limitations: Array<string>
  samples: Array<[input: string, answer: string, explanation: string]>
}

const benchmarkSeeds: Array<BenchmarkSeed> = [
  {
    slug: 'calendar-gymnastics',
    title: 'Calendar Gymnastics',
    summary:
      'Can a model reason about dates without quietly changing the calendar?',
    aisleId: 'reasoning-row',
    tags: ['dates', 'reasoning', 'edge cases'],
    scorer: 'Exact date match',
    itemCount: 120,
    receiptCount: 18,
    modelCount: 11,
    date: '2026-07-12T09:30:00.000Z',
    curatorPick: true,
    runnerAvailable: true,
    purpose:
      'Tests multi-step calendar arithmetic across leap years, month boundaries, and deliberately awkward phrasing.',
    method:
      'Each item requests one ISO-8601 date. The scorer normalizes harmless whitespace, then requires an exact date match.',
    limitations: [
      'English-only prompts may overstate performance for multilingual assistants.',
      'Exact match does not award partial credit for a correct method with a transcription error.',
    ],
    samples: [
      [
        'What date is 10 days after 22 February 2024?',
        '2024-03-03',
        '2024 is a leap year, so February has 29 days.',
      ],
      [
        'What date was the Monday after 29 December 2023?',
        '2024-01-01',
        'The next Monday crosses the year boundary.',
      ],
      [
        'Write the date 45 days before 15 March 2025.',
        '2025-01-29',
        'Count back through February 2025, which has 28 days.',
      ],
    ],
  },
  {
    slug: 'diff-without-drama',
    title: 'Diff Without Drama',
    summary: 'Tiny bug fixes where changing less is part of being correct.',
    aisleId: 'code-corner',
    tags: ['code repair', 'minimal diff', 'typescript'],
    scorer: 'Tests + diff penalty',
    itemCount: 86,
    receiptCount: 23,
    modelCount: 14,
    date: '2026-07-11T12:00:00.000Z',
    curatorPick: true,
    runnerAvailable: true,
    purpose:
      'Measures whether a coding model can repair a localized fault while preserving unrelated behavior and style.',
    method:
      'Submissions run against public interface tests and sealed regression tests. Passing patches lose points for unnecessary changed lines.',
    limitations: [
      'The repository samples are small and do not represent long-lived enterprise codebases.',
      'Line-count penalties are only a proxy for reviewability.',
    ],
    samples: [
      [
        'A typed reducer drops zero values. Fix only the predicate.',
        'Change `if (value)` to `if (value !== undefined)`.',
        'Zero is valid data; only absence should be rejected.',
      ],
      [
        'A retry loop runs four times when maxAttempts is three.',
        'Change `attempt <= maxAttempts` to `attempt < maxAttempts`.',
        'The loop starts at zero and must stop before the limit.',
      ],
      [
        'A sort mutates a readonly input array.',
        'Sort a copied array with `[...items].sort(...)`.',
        'The function contract promises not to mutate its input.',
      ],
    ],
  },
  {
    slug: 'tool-call-or-not',
    title: 'Tool Call or Not?',
    summary: 'Knowing when not to reach for a tool is an agent skill too.',
    aisleId: 'agent-alley',
    tags: ['agents', 'tool use', 'decision making'],
    scorer: 'Decision + argument rubric',
    itemCount: 96,
    receiptCount: 31,
    modelCount: 16,
    date: '2026-07-09T15:15:00.000Z',
    curatorPick: true,
    runnerAvailable: true,
    purpose:
      'Evaluates whether an agent selects the right tool, supplies bounded arguments, or answers directly when no tool is needed.',
    method:
      'Every scenario declares an available tool set. The scorer checks the action class and validates structured arguments when a call is expected.',
    limitations: [
      'Synthetic tool descriptions are cleaner than many production APIs.',
      'The benchmark does not measure long-horizon recovery after a failed call.',
    ],
    samples: [
      [
        'The user asks to translate “bonjour” and a weather tool is available.',
        'Answer directly; do not call the weather tool.',
        'The task is stable knowledge and unrelated to weather.',
      ],
      [
        'The user asks for today’s temperature in Lyon and a weather tool is available.',
        'Call weather with location “Lyon, France”.',
        'Current weather is time-sensitive and should be fetched.',
      ],
      [
        'The user asks to delete a project but only a read-only project lookup exists.',
        'Do not call; explain the available tool cannot delete.',
        'Tool availability does not grant the requested capability.',
      ],
    ],
  },
  {
    slug: 'screenshot-scavenger',
    title: 'Screenshot Scavenger',
    summary: 'Find the one UI detail that makes the whole flow fail.',
    aisleId: 'vision-arcade',
    tags: ['screenshots', 'ui', 'visual reasoning'],
    modality: 'text + image',
    scorer: 'Region + diagnosis rubric',
    itemCount: 72,
    receiptCount: 12,
    modelCount: 8,
    date: '2026-07-08T08:45:00.000Z',
    runnerAvailable: true,
    purpose:
      'Checks whether multimodal models can identify actionable interface faults rather than merely describe a screenshot.',
    method:
      'The model names the affected region and selects a diagnosis from a constrained taxonomy. Both parts must agree.',
    limitations: [
      'Static screenshots cannot reveal focus order or other temporal behavior.',
      'Visual style preferences are excluded from scoring.',
    ],
    samples: [
      [
        'Checkout image: the total is clipped below a sticky footer. What blocks completion?',
        'The sticky footer overlaps the total and payment action.',
        'The failure is spatial, not a missing-data error.',
      ],
      [
        'Settings image: Save is gray after a field changes. Diagnose.',
        'The enabled state is not updating after the form becomes dirty.',
        'The screenshot shows a valid edit but a disabled primary action.',
      ],
      [
        'Mobile nav image: the menu opens behind the page content.',
        'The menu has an incorrect stacking context or z-index.',
        'The overlay exists but is painted underneath the content.',
      ],
    ],
  },
  {
    slug: 'tone-on-a-tightrope',
    title: 'Tone on a Tightrope',
    summary:
      'Rewrite difficult messages without sanding away the actual point.',
    aisleId: 'language-lane',
    tags: ['tone', 'rewriting', 'constraints'],
    scorer: 'Constraint rubric',
    itemCount: 140,
    receiptCount: 27,
    modelCount: 15,
    date: '2026-07-06T11:20:00.000Z',
    curatorPick: true,
    purpose:
      'Measures controlled rewriting under simultaneous constraints for warmth, firmness, length, and preserved facts.',
    method:
      'A structured rubric checks required facts, forbidden implications, requested tone, and a strict length band.',
    limitations: [
      'Tone judgments remain culturally dependent despite the explicit rubric.',
      'The current version evaluates English only.',
    ],
    samples: [
      [
        'Make this firm but kind: “You missed the deadline again. Send it now.”',
        'The deadline has passed, so please send the file today and flag any blocker right away.',
        'The consequence remains clear without personal blame.',
      ],
      [
        'Decline a meeting while keeping the door open, under 25 words.',
        'I can’t join this week, but send the notes and I’ll suggest a time if a follow-up would help.',
        'It declines, offers an alternative, and stays within the limit.',
      ],
      [
        'Rewrite “This makes no sense” as specific review feedback.',
        'I can’t connect the stated goal to this implementation; could you add the missing decision and expected outcome?',
        'Specific uncertainty replaces a vague dismissal.',
      ],
    ],
  },
  {
    slug: 'prompt-potholes',
    title: 'Prompt Potholes',
    summary:
      'Can the model notice a broken premise before confidently answering it?',
    aisleId: 'robustness-booth',
    tags: ['false premises', 'calibration', 'robustness'],
    scorer: 'Premise detection F1',
    itemCount: 180,
    receiptCount: 42,
    modelCount: 19,
    date: '2026-07-05T10:10:00.000Z',
    runnerAvailable: true,
    purpose:
      'Tests resistance to false premises, impossible instructions, and requests that omit a necessary decision.',
    method:
      'The model classifies the premise, identifies the faulty span, and gives a short calibrated response.',
    limitations: [
      'Some premises depend on facts that can change over time.',
      'The classification format rewards explicitness more than conversational subtlety.',
    ],
    samples: [
      [
        'Which ocean borders Switzerland?',
        'None; Switzerland is landlocked.',
        'The response should correct the premise instead of choosing an ocean.',
      ],
      [
        'Summarize the attached report. No report is attached.',
        'Ask the user to attach or paste the report.',
        'The task cannot be completed from the supplied context.',
      ],
      [
        'Make the square circle blue.',
        'Clarify that a shape cannot be both a square and a circle in the ordinary geometric sense.',
        'The requested object is internally inconsistent.',
      ],
    ],
  },
  {
    slug: 'emoji-accounting',
    title: 'Emoji Accounting',
    summary: 'Count what humans see, not what Unicode makes convenient.',
    aisleId: 'oddities-tent',
    tags: ['unicode', 'counting', 'emoji'],
    scorer: 'Exact integer match',
    itemCount: 110,
    receiptCount: 36,
    modelCount: 18,
    date: '2026-07-04T14:00:00.000Z',
    curatorPick: true,
    runnerAvailable: true,
    purpose:
      'Probes grapheme awareness with emoji sequences, combining marks, flags, and skin-tone modifiers.',
    method:
      'Each prompt defines whether to count user-perceived characters, code points, or bytes. The answer is one integer.',
    limitations: [
      'Unicode segmentation rules evolve and require versioned fixtures.',
      'Exact counts do not explain the model’s segmentation strategy.',
    ],
    samples: [
      [
        'How many user-perceived emoji are in “👩🏽‍💻🚀”?',
        '2',
        'The technologist sequence is one grapheme and the rocket is another.',
      ],
      [
        'How many flag emoji are in “🇫🇷🇯🇵🇧🇷”?',
        '3',
        'Each regional-indicator pair renders as one flag.',
      ],
      [
        'Count graphemes in “é” where the accent is combining.',
        '1',
        'The base letter and combining accent form one grapheme cluster.',
      ],
    ],
  },
  {
    slug: 'json-with-manners',
    title: 'JSON With Manners',
    summary:
      'Structured output that follows both the schema and the social cue.',
    aisleId: 'code-corner',
    tags: ['json', 'structured output', 'schemas'],
    scorer: 'Schema validation',
    itemCount: 160,
    receiptCount: 34,
    modelCount: 17,
    date: '2026-07-03T16:40:00.000Z',
    runnerAvailable: true,
    purpose:
      'Evaluates strict JSON generation under nested schemas, nullable fields, and instructions that tempt extra prose.',
    method:
      'Outputs must parse as JSON and validate against the item schema. Markdown fences and unrequested keys fail.',
    limitations: [
      'Provider-native constrained decoding can dominate results.',
      'The benchmark measures conformance, not the factual quality of every field.',
    ],
    samples: [
      [
        'Return `{status: "ok"}` as JSON with no prose.',
        '{"status":"ok"}',
        'Only valid JSON is accepted.',
      ],
      [
        'Return an empty string list under key `items`.',
        '{"items":[]}',
        'The key is required even when the collection is empty.',
      ],
      [
        'Return nullable `note` when no note is supplied.',
        '{"note":null}',
        'Null is distinct from omitting a required property.',
      ],
    ],
  },
  {
    slug: 'breadcrumb-trail',
    title: 'Breadcrumb Trail',
    summary:
      'Plans that remain useful after the first tool call changes the map.',
    aisleId: 'agent-alley',
    tags: ['planning', 'recovery', 'agents'],
    scorer: 'State-transition rubric',
    itemCount: 88,
    receiptCount: 15,
    modelCount: 9,
    date: '2026-07-02T07:50:00.000Z',
    purpose:
      'Measures plan adaptation after bounded tool failures and newly discovered constraints.',
    method:
      'A simulator returns deterministic observations. The scorer checks whether the next action is valid in the updated state.',
    limitations: [
      'Short simulations cannot establish long-horizon agent reliability.',
      'Tool failures are deterministic and less varied than production incidents.',
    ],
    samples: [
      [
        'A file lookup returns “not found”; the parent directory can be listed.',
        'List the parent directory before retrying with a guessed path.',
        'The observation should change the plan rather than trigger a blind retry.',
      ],
      [
        'A read-only API rejects an update.',
        'Stop and explain that the available permission cannot perform the mutation.',
        'Repeated calls cannot overcome a capability boundary.',
      ],
      [
        'A search returns two equally plausible records.',
        'Request or retrieve a disambiguating field before mutation.',
        'The agent should not guess the target of a consequential action.',
      ],
    ],
  },
  {
    slug: 'chart-whisperer',
    title: 'Chart Whisperer',
    summary: 'Read the axes before telling a story about the line.',
    aisleId: 'vision-arcade',
    tags: ['charts', 'data literacy', 'vision'],
    modality: 'text + image',
    scorer: 'Claim verification rubric',
    itemCount: 104,
    receiptCount: 19,
    modelCount: 10,
    date: '2026-06-30T18:25:00.000Z',
    purpose:
      'Tests whether models extract chart facts while respecting truncated axes, uncertainty bands, and incompatible series.',
    method:
      'Questions request a value, comparison, or caveat. Answers are checked against chart metadata and a claim rubric.',
    limitations: [
      'Charts are clean exports rather than photographs of physical displays.',
      'The rubric cannot capture every defensible narrative interpretation.',
    ],
    samples: [
      [
        'A bar chart axis starts at 95. Can a small visual gap imply a tenfold difference?',
        'No; inspect the numeric values because the truncated axis exaggerates the gap.',
        'The answer must mention the axis baseline.',
      ],
      [
        'Two lines have overlapping uncertainty bands at every point. Is one decisively higher?',
        'Not from this chart alone.',
        'Visual ordering is not sufficient evidence of a decisive difference.',
      ],
      [
        'A chart labels revenue in thousands. The point reads 240. State the value.',
        '240,000 in the chart’s currency.',
        'The axis unit must be applied.',
      ],
    ],
  },
  {
    slug: 'untranslatable-ish',
    title: 'Untranslatable-ish',
    summary:
      'Translate the meaning, then admit what refuses to travel cleanly.',
    aisleId: 'language-lane',
    tags: ['translation', 'idioms', 'uncertainty'],
    scorer: 'Meaning + caveat rubric',
    itemCount: 132,
    receiptCount: 14,
    modelCount: 9,
    date: '2026-06-29T13:05:00.000Z',
    purpose:
      'Evaluates idiom translation with explicit attention to register, cultural context, and residual ambiguity.',
    method:
      'The answer provides a natural translation and one short note when no direct equivalent preserves all connotations.',
    limitations: [
      'Coverage is uneven across language pairs.',
      'Reference notes reflect a small editorial panel rather than universal usage.',
    ],
    samples: [
      [
        'Translate the French “avoir le cafard” naturally into English.',
        'To feel blue / to feel down.',
        'A literal cockroach translation loses the idiomatic meaning.',
      ],
      [
        'Translate “break a leg” for a pre-performance context.',
        'Use the target language’s good-luck performance idiom, not a literal injury.',
        'Context determines the intended meaning.',
      ],
      [
        'Explain why “you” may be underspecified in translation.',
        'Some languages require choices about number, formality, or gender that English “you” leaves open.',
        'A responsible translation may need context.',
      ],
    ],
  },
  {
    slug: 'confidently-uncertain',
    title: 'Confidently Uncertain',
    summary: 'Say what is known, what is inferred, and what needs checking.',
    aisleId: 'robustness-booth',
    tags: ['calibration', 'citations', 'uncertainty'],
    scorer: 'Calibration score',
    itemCount: 150,
    receiptCount: 29,
    modelCount: 16,
    date: '2026-06-27T09:15:00.000Z',
    runnerAvailable: true,
    purpose:
      'Measures whether confidence language tracks evidence quality and whether unstable claims are flagged for verification.',
    method:
      'Items pair an answerable core with evidence constraints. The scorer checks factuality, confidence bands, and verification calls.',
    limitations: [
      'Natural-language confidence is not equivalent to a calibrated probability.',
      'Time-sensitive items require frequent dataset rotation.',
    ],
    samples: [
      [
        'Name the capital of France and state whether live verification is needed.',
        'Paris; live verification is not normally needed for this stable fact.',
        'The answer separates the fact from its verification need.',
      ],
      [
        'State today’s exchange rate without tools.',
        'I need current market data to give today’s rate.',
        'A changing value should not be guessed from memory.',
      ],
      [
        'Infer why a build failed from only “exit code 1”.',
        'The cause is unknown; inspect the preceding build log.',
        'The evidence supports failure, not its cause.',
      ],
    ],
  },
]

const defaultVendor = { handle: 'bazaar-lab', displayName: 'Bazaar Lab' }
const metric = {
  key: 'score',
  label: 'Score',
  direction: 'higher' as const,
  unit: '%' as const,
}

export const benchmarks: Array<BenchmarkDetail> = benchmarkSeeds.map(
  (seed, index) => {
    const aisle = aisles.find((candidate) => candidate.id === seed.aisleId)

    if (!aisle) {
      throw new Error(`Missing aisle fixture: ${seed.aisleId}`)
    }

    return {
      id: `benchmark_${String(index + 1).padStart(2, '0')}`,
      slug: seed.slug,
      title: seed.title,
      summary: seed.summary,
      aisle,
      vendor: defaultVendor,
      version: '1.0.0',
      currentVersion: '1.0.0',
      isCurrent: true,
      versionStatus: 'current',
      changelog: 'Initial synthetic preview version.',
      comparability: 'compatible',
      tags: seed.tags,
      modality: seed.modality ?? 'text',
      scorer: seed.scorer,
      publicSampleCount: seed.samples.length,
      sealedItemCount: seed.itemCount,
      receiptCount: seed.receiptCount,
      distinctModelCount: seed.modelCount,
      publishedAt: seed.date,
      curatorPick: seed.curatorPick ?? false,
      runnerAvailable: seed.runnerAvailable ?? false,
      purpose: seed.purpose,
      method: seed.method,
      limitations: seed.limitations,
      samples: seed.samples.map(
        ([input, expectedAnswer, explanation], sampleIndex) => ({
          id: `${seed.slug}_public_${sampleIndex + 1}`,
          input,
          expectedAnswer,
          explanation,
          includedInOfficialScore: false,
        }),
      ),
      tracks: [
        {
          id: 'standard',
          label: 'Standard · no tools',
          description:
            'One response per item with no external tools or retries.',
          primaryMetric: metric,
        },
        ...(['code-corner', 'agent-alley', 'vision-arcade'].includes(
          seed.aisleId,
        )
          ? [
              {
                id: 'assisted',
                label: 'Assisted · declared tools',
                description:
                  'The declared evaluation tools are available, with one response per item and no hidden retries.',
                primaryMetric: metric,
              },
            ]
          : []),
      ],
      sealedSet: {
        mode: 'author_managed',
        statement:
          'The official scored questions are kept by the benchmark author and are not publicly downloadable.',
        endpointExposure:
          'A model service may still observe prompts sent during evaluation, so sealed does not mean impossible to leak.',
      },
      versions: [
        {
          version: '1.0.0',
          status: 'current',
          publishedAt: seed.date,
          changelog: 'Initial synthetic preview version.',
          comparability: 'compatible',
        },
      ],
    }
  },
)

const modelFixtures = [
  ['orion-large', 'Orion Large', 'orion-large-2026-06-18'],
  ['pocket-reasoner', 'Pocket Reasoner', 'pocket-reasoner-v3.2'],
  ['cedar-chat', 'Cedar Chat', 'cedar-chat-2026-05'],
  ['atlas-code', 'Atlas Code', 'atlas-code-4.1-20260602'],
  ['lumen-vision', 'Lumen Vision', 'lumen-vision-2.0'],
] as const

const verificationCopy: Record<
  VerificationStatus,
  { label: string; explanation: string }
> = {
  self_reported: {
    label: 'Self-reported',
    explanation:
      'The submitter entered this result. BenchBazaar has not independently verified the run.',
  },
  artifact_linked: {
    label: 'Artifact linked',
    explanation:
      'A public run artifact is linked. Its presence does not certify the result as correct.',
  },
  runner_signed: {
    label: 'Runner signed',
    explanation:
      'A registered runner signed this exact receipt payload. The signature proves source and integrity, not scientific infallibility.',
  },
  maintainer_official: {
    label: 'Maintainer official',
    explanation:
      'The benchmark maintainer recognizes this run for this exact version and track.',
  },
  independently_reproduced: {
    label: 'Independently reproduced',
    explanation:
      'A separate trusted runner produced a compatible result within the benchmark’s stated tolerance.',
  },
}

const receiptStatuses: Array<VerificationStatus> = [
  'runner_signed',
  'independently_reproduced',
  'maintainer_official',
  'artifact_linked',
  'self_reported',
]

export const receipts: Array<Receipt> = Array.from(
  { length: 20 },
  (_, index) => {
    const benchmark = benchmarks[index % benchmarks.length]
    const model = modelFixtures[index % modelFixtures.length]
    const verificationStatus = receiptStatuses[index % receiptStatuses.length]
    const score = Number((91.7 - ((index * 3.7) % 24)).toFixed(1))

    return {
      id: `BBR-2026-${String(index + 1).padStart(4, '0')}`,
      benchmark: {
        slug: benchmark.slug,
        title: benchmark.title,
        version: benchmark.version,
      },
      trackId:
        benchmark.tracks.length > 1 && index >= benchmarks.length
          ? 'assisted'
          : 'standard',
      model: {
        slug: model[0],
        displayName: model[1],
        exactId: model[2],
        provider: 'Synthetic Preview',
      },
      submittedModelId: model[2],
      primaryMetric: { label: 'Score', value: score, unit: '%' },
      metrics: [
        { label: 'Primary score', value: `${score}%` },
        { label: 'Items evaluated', value: String(benchmark.sealedItemCount) },
        { label: 'Retries', value: '0' },
      ],
      submittedAt: new Date(
        Date.parse('2026-07-14T16:00:00.000Z') - index * 21_600_000,
      ).toISOString(),
      completedAt: new Date(
        Date.parse('2026-07-14T16:00:00.000Z') - index * 21_600_000,
      ).toISOString(),
      itemCount: benchmark.sealedItemCount,
      scorerVersion: '1.0.0',
      configurationSummary:
        'Synthetic preview configuration used only to demonstrate the public receipt format.',
      configurationDigest: `sha256:config${String(index + 1).padStart(4, '0')}cafe`,
      datasetDigest: `sha256:dataset${String((index % benchmarks.length) + 1).padStart(4, '0')}beef`,
      verification: {
        status: verificationStatus,
        ...verificationCopy[verificationStatus],
      },
      state: {
        status: 'valid',
        label: 'Valid',
        explanation:
          'This receipt is eligible for its exact version and track.',
      },
      compatibility: {
        compatible: true,
        explanation:
          'The version, track, metric, scorer, manifest, and disclosed dataset digest agree.',
      },
      manifestDigest: `sha256:synthetic-${benchmark.slug}-1.0.0-manifest`,
      endpointExposure: 'operator_provider_account',
      artifacts: [],
      synthetic: true,
    }
  },
)
