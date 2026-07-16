import { z } from 'zod'

const workosEnvironmentSchema = z.object({
  WORKOS_CLIENT_ID: z.string().min(1),
  WORKOS_API_KEY: z.string().min(1),
  WORKOS_REDIRECT_URI: z.string().url(),
  WORKOS_COOKIE_PASSWORD: z.string().min(32),
})

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
