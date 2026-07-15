import type { Aisle } from './catalog'

export const aisles = [
  {
    id: 'reasoning-row',
    label: 'Reasoning Row',
    description: 'Puzzles that reward careful steps over confident shortcuts.',
    motif: '01 / chalk & puzzles',
  },
  {
    id: 'code-corner',
    label: 'Code Corner',
    description: 'Small, sharp checks for code reading, repair, and restraint.',
    motif: '02 / brackets & tickets',
  },
  {
    id: 'agent-alley',
    label: 'Agent Alley',
    description: 'Tool-use and planning tests with the route clearly marked.',
    motif: '03 / maps & signposts',
  },
  {
    id: 'vision-arcade',
    label: 'Vision Arcade',
    description:
      'Visual details, diagrams, and screenshots worth a second look.',
    motif: '04 / frames & eye charts',
  },
  {
    id: 'language-lane',
    label: 'Language Lane',
    description: 'Tone, translation, ambiguity, and words in the wild.',
    motif: '05 / letters & speech cards',
  },
  {
    id: 'robustness-booth',
    label: 'Robustness Booth',
    description: 'Reality checks for noisy prompts and tempting assumptions.',
    motif: '06 / umbrellas & crash tests',
  },
  {
    id: 'oddities-tent',
    label: 'Oddities Tent',
    description: 'Useful tests that refuse to fit on the usual leaderboard.',
    motif: '07 / pennants & curiosities',
  },
] satisfies Array<Aisle>
