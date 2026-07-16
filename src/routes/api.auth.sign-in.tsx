import { createFileRoute } from '@tanstack/react-router'
import { getSignInUrl } from '@workos/authkit-tanstack-react-start'

import { getSafeReturnPath } from '#/lib/auth/return-path'
import { readWorkOSEnvironment } from '#/lib/env/server'

const hasWorkOSConfig = () => Boolean(readWorkOSEnvironment())

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
