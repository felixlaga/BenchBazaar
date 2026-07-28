import { z } from 'zod'

const workosEnvironmentSchema = z.object({
  WORKOS_CLIENT_ID: z.string().min(1),
  WORKOS_API_KEY: z.string().min(1),
  WORKOS_REDIRECT_URI: z.string().url(),
  WORKOS_COOKIE_PASSWORD: z.string().min(32),
})

const deploymentEnvironmentSchema = z.discriminatedUnion(
  'BENCHBAZAAR_ENVIRONMENT',
  [
    z.object({
      BENCHBAZAAR_ENVIRONMENT: z.literal('local'),
    }),
    z.object({
      BENCHBAZAAR_ENVIRONMENT: z.literal('staging'),
      PUBLIC_SITE_URL: z.string().url(),
      WORKOS_ENVIRONMENT: z.literal('staging'),
      CONVEX_ENVIRONMENT: z.literal('staging'),
      WORKOS_REDIRECT_URI: z.string().url(),
    }),
    z.object({
      BENCHBAZAAR_ENVIRONMENT: z.literal('production'),
      PUBLIC_SITE_URL: z.string().url(),
      WORKOS_ENVIRONMENT: z.literal('production'),
      CONVEX_ENVIRONMENT: z.literal('production'),
      WORKOS_REDIRECT_URI: z.string().url(),
    }),
  ],
)

type WorkOSEnvironmentSource = Partial<
  Record<keyof z.infer<typeof workosEnvironmentSchema>, string | undefined>
>

export function readWorkOSEnvironment(
  environment: WorkOSEnvironmentSource = process.env,
) {
  const values = {
    WORKOS_CLIENT_ID: environment.WORKOS_CLIENT_ID,
    WORKOS_API_KEY: environment.WORKOS_API_KEY,
    WORKOS_REDIRECT_URI: environment.WORKOS_REDIRECT_URI,
    WORKOS_COOKIE_PASSWORD: environment.WORKOS_COOKIE_PASSWORD,
  }
  const hasAnyValue = Object.values(values).some(Boolean)

  if (!hasAnyValue) return null

  const result = workosEnvironmentSchema.safeParse(values)
  if (!result.success) {
    throw new Error(
      'Incomplete WorkOS configuration. Set CLIENT_ID, API_KEY, REDIRECT_URI, and a COOKIE_PASSWORD of at least 32 characters together.',
    )
  }

  return result.data
}

type DeploymentEnvironmentSource = Partial<
  Record<
    | 'BENCHBAZAAR_ENVIRONMENT'
    | 'PUBLIC_SITE_URL'
    | 'WORKOS_ENVIRONMENT'
    | 'CONVEX_ENVIRONMENT'
    | 'WORKOS_REDIRECT_URI',
    string | undefined
  >
>

export function readDeploymentEnvironment(
  environment: DeploymentEnvironmentSource = process.env,
) {
  const result = deploymentEnvironmentSchema.safeParse({
    BENCHBAZAAR_ENVIRONMENT: environment.BENCHBAZAAR_ENVIRONMENT ?? 'local',
    PUBLIC_SITE_URL: environment.PUBLIC_SITE_URL,
    WORKOS_ENVIRONMENT: environment.WORKOS_ENVIRONMENT,
    CONVEX_ENVIRONMENT: environment.CONVEX_ENVIRONMENT,
    WORKOS_REDIRECT_URI: environment.WORKOS_REDIRECT_URI,
  })
  if (!result.success) {
    throw new Error(
      'Invalid deployment environment. Staging and production must declare matching, isolated WorkOS and Convex environments plus canonical HTTPS URLs.',
    )
  }
  if (result.data.BENCHBAZAAR_ENVIRONMENT === 'local') return result.data

  const siteUrl = new URL(result.data.PUBLIC_SITE_URL)
  const redirectUrl = new URL(result.data.WORKOS_REDIRECT_URI)
  if (
    siteUrl.protocol !== 'https:' ||
    redirectUrl.protocol !== 'https:' ||
    siteUrl.origin !== redirectUrl.origin ||
    redirectUrl.pathname !== '/api/auth/callback' ||
    redirectUrl.search ||
    redirectUrl.hash
  ) {
    throw new Error(
      'Hosted environments require HTTPS and an exact same-origin WorkOS callback at /api/auth/callback.',
    )
  }
  return result.data
}
