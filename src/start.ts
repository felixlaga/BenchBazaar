import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'
import { authkitMiddleware } from '@workos/authkit-tanstack-react-start'

import {
  readDeploymentEnvironment,
  readWorkOSEnvironment,
} from '#/lib/env/server'
import { logOperationalEvent } from '#/lib/observability/redaction'
import { robotsHeaderFor } from '#/lib/seo/robots'

const deploymentEnvironment = readDeploymentEnvironment()
const workosEnvironment = readWorkOSEnvironment()

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn',
})

const observabilityMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next, request }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    const method = request.method
    const route = new URL(request.url).pathname
    try {
      const result = await next()
      result.response.headers.set('X-Request-Id', requestId)
      logOperationalEvent({
        event: 'http.request',
        requestId,
        status: result.response.status >= 500 ? 'error' : 'ok',
        method,
        route,
        durationMs: Date.now() - startedAt,
        counts: { httpStatus: result.response.status },
        ...(result.response.status >= 500
          ? { errorCode: 'HTTP_SERVER_ERROR' }
          : {}),
      })
      return result
    } catch (error) {
      logOperationalEvent({
        event: 'http.request',
        requestId,
        status: 'error',
        method,
        route,
        durationMs: Date.now() - startedAt,
        errorCode: 'UNHANDLED_SERVER_ERROR',
      })
      throw error
    }
  },
)

const securityHeadersMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next, request }) => {
    const result = await next()
    const headers = result.response.headers
    const route = new URL(request.url).pathname
    headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self' https://*.workos.com",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline'",
        "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.workos.com",
        "object-src 'none'",
      ].join('; '),
    )
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    )
    const robotsHeader = robotsHeaderFor(
      deploymentEnvironment.BENCHBAZAAR_ENVIRONMENT,
      route,
    )
    if (robotsHeader) headers.set('X-Robots-Tag', robotsHeader)
    if (process.env.NODE_ENV === 'production') {
      headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      )
    }
    return result
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [
    observabilityMiddleware,
    securityHeadersMiddleware,
    csrfMiddleware,
    ...(workosEnvironment ? [authkitMiddleware()] : []),
  ],
}))
