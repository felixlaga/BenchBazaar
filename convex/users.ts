import type { UserIdentity } from 'convex/server'
import { ConvexError, v } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { mutation, query as defineQuery } from './_generated/server'
import { requireIdentity, requireUser } from './lib/authorization'

const reservedHandles = new Set([
  'admin',
  'api',
  'benchbazaar',
  'browse',
  'dashboard',
  'moderation',
  'publish',
  'settings',
  'support',
])

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
    profileComplete: user.profileComplete ?? false,
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
      profileComplete: false,
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

export const updateProfile = mutation({
  args: {
    handle: v.string(),
    displayName: v.string(),
    bio: v.string(),
    githubUsername: v.string(),
    avatarUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const requestedHandle = args.handle.trim().toLowerCase()
    const handle = normalizeHandle(requestedHandle)
    if (
      handle !== requestedHandle ||
      handle.length < 3 ||
      handle.length > 32 ||
      reservedHandles.has(handle)
    ) {
      throw new ConvexError({ code: 'INVALID_HANDLE' })
    }

    const displayName = args.displayName.trim()
    const bio = args.bio.trim()
    const githubUsername = args.githubUsername.trim()
    const avatarUrl = args.avatarUrl.trim()
    if (!displayName || displayName.length > 80 || bio.length > 280) {
      throw new ConvexError({ code: 'INVALID_PROFILE' })
    }
    if (
      githubUsername &&
      !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(githubUsername)
    ) {
      throw new ConvexError({ code: 'INVALID_GITHUB_USERNAME' })
    }
    if (avatarUrl) {
      try {
        if (new URL(avatarUrl).protocol !== 'https:') throw new Error()
      } catch {
        throw new ConvexError({ code: 'INVALID_AVATAR_URL' })
      }
    }

    const collision = await ctx.db
      .query('users')
      .withIndex('by_handle', (query) => query.eq('handle', handle))
      .unique()
    if (collision && collision._id !== user._id) {
      throw new ConvexError({ code: 'HANDLE_TAKEN' })
    }

    await ctx.db.patch(user._id, {
      handle,
      displayName,
      bio: bio || undefined,
      githubUsername: githubUsername || undefined,
      avatarUrl: avatarUrl || undefined,
      profileComplete: true,
      updatedAt: Date.now(),
    })
    const updated = await ctx.db.get('users', user._id)
    if (!updated) throw new ConvexError({ code: 'PROFILE_UPDATE_FAILED' })
    return toSafeUser(updated)
  },
})
