import { ConvexQueryClient } from '@convex-dev/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'
import {
  AuthKitProvider,
  useAccessToken,
  useAuth,
} from '@workos/authkit-tanstack-react-start/client'
import { useCallback, useMemo } from 'react'

import { AuthenticatedUserSync } from '#/features/auth/components/authenticated-user-sync'
import { ErrorPage, NotFoundPage } from '#/components/layout/page-states'
import { readPublicEnvironment } from '#/lib/env/public'

import { routeTree } from './routeTree.gen'

export function getRouter() {
  const { VITE_CONVEX_URL } = readPublicEnvironment()
  const convexClient = new ConvexReactClient(VITE_CONVEX_URL)
  const convexQueryClient = new ConvexQueryClient(convexClient)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: 10_000,
        retry: 1,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, convexClient, convexQueryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Catch route-level errors inside the <Outlet/> so the header/footer shell
    // survives a transient data failure instead of being replaced wholesale.
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
    Wrap: ({ children }) => (
      <AuthKitProvider>
        <ConvexProviderWithAuth
          client={convexQueryClient.convexClient}
          useAuth={useAuthFromAuthKit}
        >
          <AuthenticatedUserSync />
          {children}
        </ConvexProviderWithAuth>
      </AuthKitProvider>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

function useAuthFromAuthKit() {
  const { loading, user } = useAuth()
  const { getAccessToken, refresh } = useAccessToken()
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) return null

      const token = forceRefreshToken ? await refresh() : await getAccessToken()
      return token ?? null
    },
    [getAccessToken, refresh, user],
  )

  return useMemo(
    () => ({
      isLoading: loading,
      isAuthenticated: Boolean(user),
      fetchAccessToken,
    }),
    [fetchAccessToken, loading, user],
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
