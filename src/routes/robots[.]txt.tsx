import { createFileRoute } from '@tanstack/react-router'

import { readDeploymentEnvironment } from '#/lib/env/server'
import { robotsText } from '#/lib/seo/robots'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const environment = readDeploymentEnvironment()
        const siteOrigin =
          environment.BENCHBAZAAR_ENVIRONMENT === 'local'
            ? new URL(request.url).origin
            : environment.PUBLIC_SITE_URL
        const body = robotsText(environment.BENCHBAZAAR_ENVIRONMENT, siteOrigin)

        return new Response(body, {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
            'Content-Type': 'text/plain; charset=utf-8',
          },
        })
      },
    },
  },
})
