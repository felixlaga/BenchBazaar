import { createFileRoute } from '@tanstack/react-router'

import { aisles } from '#/features/catalog/domain/aisles'
import { createPublicConvexClient } from '#/lib/convex/public-server'
import { readDeploymentEnvironment } from '#/lib/env/server'
import { logOperationalEvent } from '#/lib/observability/redaction'
import { absoluteSiteUrl } from '#/lib/seo/metadata'

import { api } from '../../convex/_generated/api'

type SitemapEntry = {
  pathname: string
  lastModified?: number
}

const staticEntries: Array<SitemapEntry> = [
  { pathname: '/' },
  { pathname: '/about' },
  { pathname: '/browse' },
  { pathname: '/publish' },
  ...aisles.map((aisle) => ({ pathname: `/aisles/${aisle.id}` })),
]

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function sitemapXml(siteOrigin: string, entries: Array<SitemapEntry>) {
  const uniqueEntries = new Map<string, SitemapEntry>()
  for (const entry of entries) {
    const url = absoluteSiteUrl(siteOrigin, entry.pathname)
    const current = uniqueEntries.get(url)
    if (!current || (entry.lastModified ?? 0) > (current.lastModified ?? 0)) {
      uniqueEntries.set(url, entry)
    }
  }

  const urls = [...uniqueEntries.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([url, entry]) => `  <url>
    <loc>${escapeXml(url)}</loc>${
      entry.lastModified
        ? `\n    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : ''
    }
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const environment = readDeploymentEnvironment()
        const siteOrigin =
          environment.BENCHBAZAAR_ENVIRONMENT === 'local'
            ? new URL(request.url).origin
            : environment.PUBLIC_SITE_URL
        const entries = [...staticEntries]

        try {
          const dynamicEntries = await createPublicConvexClient().query(
            api.seo.sitemapEntries,
            {},
          )
          entries.push(
            ...dynamicEntries.benchmarks.map((benchmark) => ({
              pathname: `/b/${benchmark.slug}`,
              lastModified: benchmark.updatedAt,
            })),
            ...dynamicEntries.versions.map((version) => ({
              pathname: `/b/${version.slug}/v/${version.version}`,
              lastModified: version.publishedAt,
            })),
            ...dynamicEntries.collections.map((collection) => ({
              pathname: `/collections/${collection.slug}`,
              lastModified: collection.updatedAt,
            })),
          )
        } catch {
          logOperationalEvent({
            event: 'seo.sitemap.dynamic_entries',
            requestId: crypto.randomUUID(),
            status: 'error',
            route: '/sitemap.xml',
            errorCode: 'SITEMAP_DYNAMIC_ENTRIES_UNAVAILABLE',
          })
        }

        return new Response(sitemapXml(siteOrigin, entries), {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
            'Content-Type': 'application/xml; charset=utf-8',
          },
        })
      },
    },
  },
})
