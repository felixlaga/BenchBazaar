// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FreeSampleCard } from './free-sample-card'

const sample = {
  id: 'public_sample_1',
  input: 'What comes after Tuesday?',
  expectedAnswer: 'Wednesday',
  explanation: 'The ordinary weekday sequence applies.',
  includedInOfficialScore: false as const,
}

describe('FreeSampleCard', () => {
  it('uses a native keyboard-operable disclosure and labels the sample public', () => {
    const { container } = render(<FreeSampleCard number={1} sample={sample} />)
    const disclosure = container.querySelector('details')
    const summary = screen.getByText('Reveal expected answer')

    expect(screen.getByText('Public · never scored')).toBeDefined()
    expect(disclosure?.open).toBe(false)

    fireEvent.click(summary)

    expect(disclosure?.open).toBe(true)
    expect(screen.getByText('Wednesday')).toBeDefined()
  })
})
