import { ConvexHttpClient } from 'convex/browser'

import { readPublicEnvironment } from '#/lib/env/public'

export function createPublicConvexClient() {
  return new ConvexHttpClient(readPublicEnvironment().VITE_CONVEX_URL)
}
