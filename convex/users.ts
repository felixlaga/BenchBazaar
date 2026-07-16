import type { UserIdentity } from 'convex/server'
import { ConvexError } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { mutation, query as defineQuery } from './_generated/server'
import { requireIdentity } from './lib/authorization'

export function normalizeHandle(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function toSafeUser(user: Doc<'users'>) {
  return {
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    githubUsername: user.githubUsername,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function chooseInitialHandle(ctx: MutationCtx, identity: UserIdentity) {
  const stablePart = normalizeHandle(identity.subject).slice(-16)
  const base = `member-${stablePart || 'new'}`

  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`
    const existing = await ctx.db
      .query('users')
      .withIndex('by_handle', (query) => query.eq('handle', candidate))
      .unique()

    if (!existing) return candidate
  }

  throw new ConvexError({ code: 'HANDLE_ALLOCATION_FAILED' })
}

export const viewer = defineQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const user = await ctx.db
      .query('users')
      .withIndex('by_externalId', (query) =>
        query.eq('externalId', identity.subject),
      )
      .unique()

    return user ? toSafeUser(user) : null
  },
})

export const syncCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_externalId', (query) =>
        query.eq('externalId', identity.subject),
      )
      .unique()
    const now = Date.now()

    if (existing) {
      if (existing.status !== 'active') {
        throw new ConvexError({ code: 'ACCOUNT_NOT_ACTIVE' })
      }

      const profilePatch: Partial<Doc<'users'>> = {
        updatedAt: now,
        lastSeenAt: now,
      }

      if (identity.name) profilePatch.displayName = identity.name
      if (identity.pictureUrl) profilePatch.avatarUrl = identity.pictureUrl
      if (identity.email) profilePatch.email = identity.email
      if (identity.preferredUsername) {
        profilePatch.githubUsername = identity.preferredUsername
      }

      await ctx.db.patch(existing._id, profilePatch)
      const updated = await ctx.db.get('users', existing._id)

      if (!updated) {
        throw new ConvexError({ code: 'PROFILE_SYNC_FAILED' })
      }

      return toSafeUser(updated)
    }

    const handle = await chooseInitialHandle(ctx, identity)
    const userId = await ctx.db.insert('users', {
      externalId: identity.subject,
      handle,
      displayName: identity.name ?? 'BenchBazaar member',
      ...(identity.pictureUrl ? { avatarUrl: identity.pictureUrl } : {}),
      ...(identity.preferredUsername
        ? { githubUsername: identity.preferredUsername }
        : {}),
      ...(identity.email ? { email: identity.email } : {}),
      role: 'member',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    })
    const user = await ctx.db.get('users', userId)

    if (!user) {
      throw new ConvexError({ code: 'PROFILE_SYNC_FAILED' })
    }

    return toSafeUser(user)
  },
})
