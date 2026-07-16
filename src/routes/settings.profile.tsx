import { createFileRoute } from '@tanstack/react-router'
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { Github, Save, Store } from 'lucide-react'
import { useState } from 'react'

import { StatusBanner } from '#/components/ui/status-banner'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/settings/profile')({
  head: () => ({
    meta: [
      { title: 'Profile settings · BenchBazaar' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ProfileSettingsPage,
})

function ProfileSettingsPage() {
  return (
    <div className="page-shell settings-page">
      <header className="page-header page-header--compact">
        <p className="eyebrow">Stall settings</p>
        <h1>Choose how the public bazaar knows you.</h1>
        <p>
          Your handle, display name, bio, and optional GitHub link are public.
          Email and WorkOS identifiers remain private.
        </p>
      </header>
      <AuthLoading>
        <p className="save-state">Checking your session…</p>
      </AuthLoading>
      <Unauthenticated>
        <StatusBanner variant="warning" title="Sign in required">
          <a
            className="button button--ink"
            href="/api/auth/sign-in?returnPathname=%2Fsettings%2Fprofile"
          >
            <Github aria-hidden="true" size={17} /> Continue with GitHub
          </a>
        </StatusBanner>
      </Unauthenticated>
      <Authenticated>
        <ProfileForm />
      </Authenticated>
    </div>
  )
}

function ProfileForm() {
  const user = useQuery(api.users.viewer, {})
  const updateProfile = useMutation(api.users.updateProfile)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')

  if (!user) return <p className="save-state">Synchronizing profile…</p>

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('saving')
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      await updateProfile({
        handle: String(form.get('handle') ?? ''),
        displayName: String(form.get('displayName') ?? ''),
        bio: String(form.get('bio') ?? ''),
        githubUsername: String(form.get('githubUsername') ?? ''),
        avatarUrl: String(form.get('avatarUrl') ?? ''),
      })
      setStatus('saved')
      setMessage('Profile saved. Your public stall is ready.')
    } catch (cause) {
      setStatus('error')
      setMessage(
        cause instanceof Error ? cause.message : 'Could not save profile.',
      )
    }
  }

  return (
    <form className="profile-form" onSubmit={(event) => void submit(event)}>
      <div className="profile-form__mark">
        <Store aria-hidden="true" size={34} />
        <strong>{user.displayName}</strong>
        <code>@{user.handle}</code>
      </div>
      <div className="editor-fields">
        <label>
          Public handle
          <input
            defaultValue={user.handle}
            maxLength={32}
            minLength={3}
            name="handle"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
          <small>Lowercase letters, numbers, and single hyphens.</small>
        </label>
        <label>
          Display name
          <input
            defaultValue={user.displayName}
            maxLength={80}
            name="displayName"
            required
          />
        </label>
        <label className="editor-field--wide">
          Public bio
          <textarea defaultValue={user.bio ?? ''} maxLength={280} name="bio" />
        </label>
        <label>
          GitHub username
          <input
            defaultValue={user.githubUsername ?? ''}
            maxLength={39}
            name="githubUsername"
          />
        </label>
        <label>
          Avatar URL
          <input
            defaultValue={user.avatarUrl ?? ''}
            name="avatarUrl"
            placeholder="https://…"
            type="url"
          />
        </label>
      </div>
      <div className="form-actions">
        <button
          className="button button--ink"
          disabled={status === 'saving'}
          type="submit"
        >
          <Save aria-hidden="true" size={17} />
          {status === 'saving' ? 'Saving…' : 'Save public profile'}
        </button>
        {message && (
          <p className={status === 'error' ? 'form-error' : 'form-success'}>
            {message}
          </p>
        )}
      </div>
    </form>
  )
}
