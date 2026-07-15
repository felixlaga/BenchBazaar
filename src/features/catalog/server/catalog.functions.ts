import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { aisleIds } from '../domain/catalog'
import {
  browseCatalog,
  getBenchmark,
  getBenchmarkReceipts,
  getHomePageData,
  getMysteryBenchmark,
  getReceipt,
} from './catalog.repository'

const browseInput = z.object({
  q: z.string().trim().max(120).optional(),
  aisle: z.enum(aisleIds).optional(),
  sort: z.enum(['newest', 'most-run', 'curated']).optional(),
})

const slugInput = z.object({ slug: z.string().trim().min(1).max(120) })
const receiptInput = z.object({ receiptId: z.string().trim().min(1).max(80) })

export const loadHomePage = createServerFn({ method: 'GET' }).handler(() =>
  getHomePageData(),
)

export const loadBrowseCatalog = createServerFn({ method: 'GET' })
  .validator(browseInput)
  .handler(({ data }) => browseCatalog(data))

export const loadBenchmarkPage = createServerFn({ method: 'GET' })
  .validator(slugInput)
  .handler(({ data }) => {
    const benchmark = getBenchmark(data.slug)
    if (!benchmark) return null

    return {
      benchmark,
      receipts: getBenchmarkReceipts(data.slug),
    }
  })

export const loadReceipt = createServerFn({ method: 'GET' })
  .validator(receiptInput)
  .handler(({ data }) => getReceipt(data.receiptId) ?? null)

export const loadMysteryBenchmark = createServerFn({ method: 'GET' }).handler(
  () => getMysteryBenchmark(),
)
