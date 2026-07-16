import { describe, expect, it } from 'vitest'

import { readPublicEnvironment } from './public'
import { readWorkOSEnvironment } from './server'

describe('environment validation', () => {
  it('requires a valid public Convex URL', () => {
    expect(() => readPublicEnvironment({})).toThrow('VITE_CONVEX_URL')
    expect(
      readPublicEnvironment({
        VITE_CONVEX_URL: 'https://example.convex.cloud',
      }),
    ).toEqual({ VITE_CONVEX_URL: 'https://example.convex.cloud' })
  })

  it('allows WorkOS to be absent but rejects partial configuration', () => {
    expect(readWorkOSEnvironment({})).toBeNull()
    expect(() =>
      readWorkOSEnvironment({ WORKOS_CLIENT_ID: 'client_test' }),
    ).toThrow('Incomplete WorkOS configuration')
  })

  it('requires a sufficiently long WorkOS cookie password', () => {
    expect(() =>
      readWorkOSEnvironment({
        WORKOS_CLIENT_ID: 'client_test',
        WORKOS_API_KEY: 'sk_test',
        WORKOS_REDIRECT_URI: 'http://localhost:3000/api/auth/callback',
        WORKOS_COOKIE_PASSWORD: 'too-short',
      }),
    ).toThrow('COOKIE_PASSWORD')
  })
})
