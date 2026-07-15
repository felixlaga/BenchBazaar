import { describe, expect, it } from 'vitest'

import { getSafeReturnPath } from './return-path'

describe('getSafeReturnPath', () => {
  it('allows internal paths with query parameters', () => {
    expect(getSafeReturnPath('/publish?step=samples')).toBe(
      '/publish?step=samples',
    )
  })

  it.each([
    'https://malicious.example/steal',
    '//malicious.example/steal',
    '/\\malicious.example',
    'publish',
  ])('rejects unsafe return path %s', (value) => {
    expect(getSafeReturnPath(value)).toBeUndefined()
  })
})
