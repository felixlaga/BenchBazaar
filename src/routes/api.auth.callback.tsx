import { createFileRoute } from '@tanstack/react-router'
import { handleCallbackRoute } from '@workos/authkit-tanstack-react-start'

import { readWorkOSEnvironment } from '#/lib/env/server'

const callbackHandler = handleCallbackRoute({
  errorRedirectUrl: '/publish?auth=failed',
})

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: async (context) => {
        const configured = Boolean(readWorkOSEnvironment())

        if (!configured) {
          return Response.json(
            { error: 'AuthKit is not configured in this environment.' },
            { status: 503 },
          )
        }

        return callbackHandler(context)
      },
    },
  },
})
