import { expect, test } from '@playwright/test'

test('@smoke serves static public content with the security boundary', async ({
  page,
  request,
}) => {
  const health = await request.get('/api/health')
  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toMatchObject({
    ok: true,
    service: 'benchbazaar-web',
    sealedContentStored: false,
  })

  const response = await page.goto('/about')
  expect(response?.ok()).toBe(true)
  expect(response?.headers()['content-security-policy']).toContain(
    "default-src 'self'",
  )
  expect(response?.headers()['x-content-type-options']).toBe('nosniff')
  expect(response?.headers()['x-frame-options']).toBe('DENY')
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Open enough to inspect. Careful enough to stay useful.',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  ).toBeVisible()
})

test('@smoke preserves keyboard navigation and reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

test('configured AuthKit creates a safe WorkOS authorization redirect', async ({
  request,
}) => {
  test.skip(
    process.env.E2E_AUTH_REDIRECT !== '1',
    'Requires the configured non-production WorkOS environment.',
  )
  const response = await request.get(
    '/api/auth/sign-in?returnPathname=%2Fdashboard',
    { maxRedirects: 0 },
  )
  expect(response.status()).toBe(307)
  const location = response.headers().location
  expect(location).toBeTruthy()
  const redirect = new URL(location)
  expect(redirect.protocol).toBe('https:')
  expect(redirect.hostname).toMatch(/(^|\.)workos\.com$/)
  expect(redirect.searchParams.get('client_id')).toBeTruthy()
  expect(redirect.searchParams.get('redirect_uri')).toBe(
    'http://localhost:3000/api/auth/callback',
  )
  expect(redirect.searchParams.get('state')).toBeTruthy()

  const failedCallback = await request.get('/api/auth/callback', {
    maxRedirects: 0,
  })
  expect(failedCallback.status()).toBeGreaterThanOrEqual(300)
  expect(failedCallback.status()).toBeLessThan(400)
  const failureLocation = new URL(
    failedCallback.headers().location,
    'http://127.0.0.1:4173',
  )
  expect(`${failureLocation.pathname}${failureLocation.search}`).toBe(
    '/publish?auth=failed',
  )
})

test('visitor can browse and inspect a versioned benchmark and receipt', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_FULL_PUBLIC !== '1',
    'Requires the seeded non-production Convex deployment.',
  )

  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: /Odd tests/ }),
  ).toBeVisible()
  await page.getByRole('link', { name: /Browse the bazaar/ }).click()
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Find a useful reality check.',
    }),
  ).toBeVisible()

  const benchmarkLink = page.locator('a[href^="/b/"]').first()
  await expect(benchmarkLink).toBeVisible()
  await benchmarkLink.click()
  await expect(page.locator('main h1')).toBeVisible()
  await expect(page.getByText(/Version \d+\.\d+\.\d+/).first()).toBeVisible()

  const receiptLink = page.locator('a[href^="/r/"]').first()
  if (await receiptLink.isVisible()) {
    await receiptLink.click()
    await expect(page.getByText(/Receipt/).first()).toBeVisible()
  }
})
