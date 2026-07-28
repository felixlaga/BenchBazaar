import { describe, expect, it } from 'vitest'

import { readPublicEnvironment } from './public'
import { readDeploymentEnvironment, readWorkOSEnvironment } from './server'

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

  it('fails closed when hosted provider environments are not isolated', () => {
    expect(readDeploymentEnvironment({})).toEqual({
      BENCHBAZAAR_ENVIRONMENT: 'local',
    })
    expect(() =>
      readDeploymentEnvironment({
        BENCHBAZAAR_ENVIRONMENT: 'production',
        PUBLIC_SITE_URL: 'https://benchbazaar.example',
        WORKOS_ENVIRONMENT: 'staging',
        CONVEX_ENVIRONMENT: 'production',
        WORKOS_REDIRECT_URI: 'https://benchbazaar.example/api/auth/callback',
      }),
    ).toThrow('Invalid deployment environment')
    expect(() =>
      readDeploymentEnvironment({
        BENCHBAZAAR_ENVIRONMENT: 'production',
        PUBLIC_SITE_URL: 'https://benchbazaar.example',
        WORKOS_ENVIRONMENT: 'production',
        CONVEX_ENVIRONMENT: 'production',
        WORKOS_REDIRECT_URI: 'https://other.example/api/auth/callback',
      }),
    ).toThrow('same-origin')
    expect(
      readDeploymentEnvironment({
        BENCHBAZAAR_ENVIRONMENT: 'production',
        PUBLIC_SITE_URL: 'https://benchbazaar.example',
        WORKOS_ENVIRONMENT: 'production',
        CONVEX_ENVIRONMENT: 'production',
        WORKOS_REDIRECT_URI: 'https://benchbazaar.example/api/auth/callback',
      }),
    ).toMatchObject({ BENCHBAZAAR_ENVIRONMENT: 'production' })
  })
})
