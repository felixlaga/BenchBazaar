import { describe, expect, it } from 'vitest'

import {
  absoluteSiteUrl,
  createSeoMetadata,
  resolveSiteOrigin,
} from './metadata'

describe('SEO metadata', () => {
  it('normalizes origins and builds clean absolute URLs', () => {
    expect(resolveSiteOrigin('https://www.benchbazaar.dev/path')).toBe(
      'https://www.benchbazaar.dev',
    )
    expect(
      absoluteSiteUrl(
        'https://www.benchbazaar.dev/',
        '/browse?q=ignored#ignored',
      ),
    ).toBe('https://www.benchbazaar.dev/browse')
  })

  it('builds complete canonical and social metadata', () => {
    const head = createSeoMetadata({
      siteOrigin: 'https://www.benchbazaar.dev',
      pathname: '/about',
      title: 'How BenchBazaar works',
      description: 'Public methods and provenance-rich result receipts.',
    })

    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://www.benchbazaar.dev/about' },
    ])
    expect(head.meta).toContainEqual({
      property: 'og:url',
      content: 'https://www.benchbazaar.dev/about',
    })
    expect(head.meta).toContainEqual({
      property: 'og:image',
      content: 'https://www.benchbazaar.dev/og-default.png',
    })
    expect(head.meta).toContainEqual({
      name: 'twitter:card',
      content: 'summary_large_image',
    })
    expect(head.meta).not.toContainEqual({
      name: 'robots',
      content: 'noindex,follow',
    })
  })

  it('marks duplicate variants noindex and safely serializes JSON-LD', () => {
    const head = createSeoMetadata({
      siteOrigin: 'https://www.benchbazaar.dev',
      pathname: '/',
      title: 'BenchBazaar',
      description: 'Odd tests. Useful signals.',
      indexable: false,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: '</script><script>alert(1)</script>',
      },
    })

    expect(head.meta).toContainEqual({
      name: 'robots',
      content: 'noindex,follow',
    })
    expect(head.scripts).toHaveLength(1)
    expect(String(head.scripts[0]?.children)).toContain('\\u003c/script>')
    expect(String(head.scripts[0]?.children)).not.toContain('</script>')
  })
})
