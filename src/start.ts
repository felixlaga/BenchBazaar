import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { authkitMiddleware } from '@workos/authkit-tanstack-react-start'

const workosValues = [
  process.env.WORKOS_CLIENT_ID,
  process.env.WORKOS_API_KEY,
  process.env.WORKOS_REDIRECT_URI,
  process.env.WORKOS_COOKIE_PASSWORD,
]
const hasAnyWorkOSConfig = workosValues.some(Boolean)
const hasCompleteWorkOSConfig = workosValues.every(Boolean)

if (hasAnyWorkOSConfig && !hasCompleteWorkOSConfig) {
  throw new Error(
    'Incomplete WorkOS configuration. Set CLIENT_ID, API_KEY, REDIRECT_URI, and COOKIE_PASSWORD together.',
  )
}

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    csrfMiddleware,
    ...(hasCompleteWorkOSConfig ? [authkitMiddleware()] : []),
  ],
}))
