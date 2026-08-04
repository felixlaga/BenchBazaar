import type { JSX } from 'react'

export const defaultSeoImagePath = '/og-default.png'

export type JsonLdValue =
  string | number | boolean | null | JsonLdObject | Array<JsonLdValue>

export type JsonLdObject = { [key: string]: JsonLdValue }

type SeoMetadataInput = {
  siteOrigin: string
  pathname: string
  title: string
  description: string
  imagePath?: string
  imageAlt?: string
  indexable?: boolean
  jsonLd?: JsonLdObject | Array<JsonLdObject>
}

export function resolveSiteOrigin(
  configuredOrigin?: string,
  requestOrigin?: string,
) {
  const candidate = configuredOrigin || requestOrigin || 'http://localhost:3000'
  return new URL(candidate).origin
}

export function absoluteSiteUrl(siteOrigin: string, pathname: string) {
  const url = new URL(pathname, `${resolveSiteOrigin(siteOrigin)}/`)
  url.search = ''
  url.hash = ''
  return url.toString()
}

export function createSeoMetadata({
  siteOrigin,
  pathname,
  title,
  description,
  imagePath = defaultSeoImagePath,
  imageAlt = 'BenchBazaar storefront',
  indexable = true,
  jsonLd,
}: SeoMetadataInput) {
  const canonicalUrl = absoluteSiteUrl(siteOrigin, pathname)
  const imageUrl = new URL(
    imagePath,
    `${resolveSiteOrigin(siteOrigin)}/`,
  ).toString()
  const meta: Array<JSX.IntrinsicElements['meta']> = [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'BenchBazaar' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: imageAlt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: imageAlt },
  ]

  if (!indexable) {
    meta.push({ name: 'robots', content: 'noindex,follow' })
  }

  const scripts: Array<JSX.IntrinsicElements['script']> = []
  if (jsonLd) {
    const entries = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    scripts.push(
      ...entries.map((entry) => ({
        type: 'application/ld+json',
        children: JSON.stringify(entry).replaceAll('<', '\\u003c'),
      })),
    )
  }

  return {
    meta,
    links: [{ rel: 'canonical', href: canonicalUrl }],
    scripts,
  }
}
