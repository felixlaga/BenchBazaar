export type IndexingEnvironment = 'local' | 'staging' | 'production'

export function robotsHeaderFor(
  environment: IndexingEnvironment,
  pathname: string,
) {
  return environment !== 'production' || pathname.startsWith('/api/')
    ? 'noindex, nofollow'
    : null
}

export function robotsText(
  environment: IndexingEnvironment,
  siteOrigin: string,
) {
  return environment === 'production'
    ? `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n'
}
