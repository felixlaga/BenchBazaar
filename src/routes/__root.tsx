import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { ConvexReactClient } from 'convex/react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Analytics } from '@vercel/analytics/react'
import { getAuth } from '@workos/authkit-tanstack-react-start'

import { ErrorPage, NotFoundPage } from '#/components/layout/page-states'
import { SiteFooter } from '#/components/layout/site-footer'
import { SiteHeader } from '#/components/layout/site-header'

import appCss from '../styles.css?url'

type RouterContext = {
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    if (!context.convexQueryClient.serverHttpClient) return {}

    try {
      const auth = await getAuth()
      if (auth.user) {
        context.convexQueryClient.serverHttpClient.setAuth(auth.accessToken)
      }
      return { user: auth.user }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('AuthKit middleware is not configured')
      ) {
        return { user: null }
      }
      throw error
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'BenchBazaar · Odd tests. Useful signals.' },
      {
        name: 'description',
        content:
          'The open bazaar for community-made LLM benchmarks, sealed scored sets, and provenance-rich result receipts.',
      },
      { name: 'theme-color', content: '#fff8e7' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg?v=2', type: 'image/svg+xml' },
      {
        rel: 'icon',
        href: '/favicon-32x32.png?v=2',
        type: 'image/png',
        sizes: '32x32',
      },
      { rel: 'shortcut icon', href: '/favicon.ico?v=2' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png?v=2' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Analytics />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'TanStack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
