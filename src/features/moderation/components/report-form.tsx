import { Authenticated, Unauthenticated, useMutation } from 'convex/react'
import { useState } from 'react'

import { api } from '../../../../convex/_generated/api'

export function ReportForm({
  targetType,
  targetId,
}: {
  targetType: 'benchmark' | 'receipt'
  targetId: string
}) {
  const report = useMutation(api.moderation.report)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setMessage('Sending report…')
    try {
      await report({
        targetType,
        targetId,
        category: String(data.get('category') ?? 'other') as
          | 'spam'
          | 'unsafe_content'
          | 'misleading_claim'
          | 'provenance'
          | 'other',
        details: String(data.get('details') ?? ''),
      })
      setMessage('Report submitted privately for moderator review.')
      form.reset()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Report failed.')
    }
  }

  return (
    <details className="content-section">
      <summary>Report this {targetType}</summary>
      <Authenticated>
        <form onSubmit={(event) => void submit(event)}>
          <label>
            Category
            <select defaultValue="provenance" name="category">
              <option value="provenance">Provenance concern</option>
              <option value="misleading_claim">Misleading claim</option>
              <option value="unsafe_content">Unsafe content</option>
              <option value="spam">Spam</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Details
            <textarea maxLength={2000} minLength={20} name="details" required />
          </label>
          <button className="button button--paper" type="submit">
            Submit private report
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      </Authenticated>
      <Unauthenticated>
        <a href="/api/auth/sign-in">Sign in to submit a report</a>
      </Unauthenticated>
    </details>
  )
}
