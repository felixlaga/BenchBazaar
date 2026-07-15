import { createFileRoute } from '@tanstack/react-router'
import { handleCallbackRoute } from '@workos/authkit-tanstack-react-start'

const callbackHandler = handleCallbackRoute({
  errorRedirectUrl: '/publish?auth=failed',
})

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: async (context) => {
        const configured = Boolean(
          process.env.WORKOS_CLIENT_ID &&
          process.env.WORKOS_API_KEY &&
          process.env.WORKOS_REDIRECT_URI &&
          process.env.WORKOS_COOKIE_PASSWORD,
        )

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
