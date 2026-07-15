import { createFileRoute } from '@tanstack/react-router'
import { getSignInUrl } from '@workos/authkit-tanstack-react-start'

import { getSafeReturnPath } from '#/lib/auth/return-path'

const hasWorkOSConfig = () =>
  Boolean(
    process.env.WORKOS_CLIENT_ID &&
    process.env.WORKOS_API_KEY &&
    process.env.WORKOS_REDIRECT_URI &&
    process.env.WORKOS_COOKIE_PASSWORD,
  )

export const Route = createFileRoute('/api/auth/sign-in')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasWorkOSConfig()) {
          return Response.json(
            { error: 'AuthKit is not configured in this environment.' },
            { status: 503 },
          )
        }

        const requestedPath = new URL(request.url).searchParams.get(
          'returnPathname',
        )
        const returnPathname = getSafeReturnPath(requestedPath)
        const url = await getSignInUrl(
          returnPathname ? { data: { returnPathname } } : undefined,
        )

        return new Response(null, {
          status: 307,
          headers: { Location: url },
        })
      },
    },
  },
})
