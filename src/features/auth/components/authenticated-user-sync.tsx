import { useEffect, useRef, useState } from 'react'
import { useConvexAuth, useMutation } from 'convex/react'

import { api } from '../../../../convex/_generated/api'

export function AuthenticatedUserSync() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const syncCurrentUser = useMutation(api.users.syncCurrent)
  const attempted = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      attempted.current = false
      setFailed(false)
      return
    }

    if (isLoading || attempted.current) return
    attempted.current = true

    void syncCurrentUser({}).catch(() => {
      setFailed(true)
    })
  }, [isAuthenticated, isLoading, syncCurrentUser])

  if (!failed) return null

  return (
    <div className="auth-sync-error" role="alert">
      Your signed-in session is valid, but the BenchBazaar profile could not be
      synchronized. Reload to retry.
    </div>
  )
}
