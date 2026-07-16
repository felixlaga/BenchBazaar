import { z } from 'zod'

const publicEnvironmentSchema = z.object({
  VITE_CONVEX_URL: z.string().url(),
})

export function readPublicEnvironment(environment?: {
  VITE_CONVEX_URL?: unknown
}) {
  const result = publicEnvironmentSchema.safeParse(
    environment ?? import.meta.env,
  )

  if (!result.success) {
    throw new Error(
      'VITE_CONVEX_URL is required and must point to a valid Convex deployment URL.',
    )
  }

  return result.data
}
