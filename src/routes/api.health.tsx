import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            ok: true,
            service: 'benchbazaar-web',
            sealedContentStored: false,
          },
          {
            headers: {
              'cache-control': 'no-store',
              'x-content-type-options': 'nosniff',
            },
          },
        ),
    },
  },
})
