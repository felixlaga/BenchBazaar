import { describe, expect, it } from 'vitest'

import { robotsHeaderFor, robotsText } from './robots'

describe('SEO indexing policy', () => {
  it('keeps production pages indexable but excludes API responses', () => {
    expect(robotsHeaderFor('production', '/about')).toBeNull()
    expect(robotsHeaderFor('production', '/api/health')).toBe(
      'noindex, nofollow',
    )
  })

  it('blocks every non-production response from indexing', () => {
    expect(robotsHeaderFor('local', '/')).toBe('noindex, nofollow')
    expect(robotsHeaderFor('staging', '/about')).toBe('noindex, nofollow')
  })

  it('advertises the production sitemap and blocks other environments', () => {
    expect(robotsText('production', 'https://www.benchbazaar.dev')).toContain(
      'Sitemap: https://www.benchbazaar.dev/sitemap.xml',
    )
    expect(robotsText('staging', 'https://staging.example')).toBe(
      'User-agent: *\nDisallow: /\n',
    )
  })
})
