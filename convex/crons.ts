import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

const crons = cronJobs()

// Delete expired rate-limit rows daily so the table stays bounded.
crons.daily(
  'prune rate limits',
  { hourUTC: 8, minuteUTC: 0 },
  internal.maintenance.pruneRateLimits,
  {},
)

export default crons
