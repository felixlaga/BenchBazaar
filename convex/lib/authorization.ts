import { ConvexError } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type ReadContext = Pick<QueryCtx | MutationCtx, 'auth' | 'db'>

export async function requireIdentity(ctx: ReadContext) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError({ code: 'UNAUTHENTICATED' })
  }

  return identity
}

export async function getOptionalUser(ctx: ReadContext) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  return ctx.db
    .query('users')
    .withIndex('by_externalId', (query) =>
      query.eq('externalId', identity.subject),
    )
    .unique()
}

export async function requireUser(ctx: ReadContext) {
  await requireIdentity(ctx)
  const user = await getOptionalUser(ctx)

  if (!user) {
    throw new ConvexError({ code: 'PROFILE_REQUIRED' })
  }

  if (user.status !== 'active') {
    throw new ConvexError({ code: 'ACCOUNT_NOT_ACTIVE' })
  }

  return user
}

const roleRank = {
  member: 0,
  curator: 1,
  moderator: 2,
  admin: 3,
} as const

export async function requireRole(
  ctx: ReadContext,
  minimumRole: keyof typeof roleRank,
) {
  const user = await requireUser(ctx)

  if (roleRank[user.role] < roleRank[minimumRole]) {
    throw new ConvexError({ code: 'FORBIDDEN' })
  }

  return user
}

export async function requireBenchmarkOwner(
  ctx: ReadContext,
  benchmarkId: Id<'benchmarks'>,
) {
  const user = await requireUser(ctx)
  const benchmark = await ctx.db.get('benchmarks', benchmarkId)

  if (!benchmark) {
    throw new ConvexError({ code: 'BENCHMARK_NOT_FOUND' })
  }

  if (benchmark.ownerId !== user._id && roleRank[user.role] < roleRank.admin) {
    throw new ConvexError({ code: 'FORBIDDEN' })
  }

  return { benchmark, user }
}

export async function requireDraftOwner(
  ctx: ReadContext,
  draftId: Id<'benchmarkDrafts'>,
) {
  const user = await requireUser(ctx)
  const draft = await ctx.db.get('benchmarkDrafts', draftId)

  if (!draft) {
    throw new ConvexError({ code: 'DRAFT_NOT_FOUND' })
  }

  if (draft.ownerId !== user._id && roleRank[user.role] < roleRank.admin) {
    throw new ConvexError({ code: 'FORBIDDEN' })
  }

  return { draft, user }
}
