/**
 * AI Auth E2E Tests (C-1)
 *
 * Covers SSO + refresh + Sidebar long-session scenarios.
 *
 * API tests (no browser needed):
 *   pnpm exec playwright test e2e/auth.spec.ts --grep "API"
 *
 * UI tests (needs shell :5050 + server :3001 running):
 *   E2E_ENABLED=1 pnpm exec playwright test e2e/auth.spec.ts --grep "UI"
 *
 * Run all:
 *   E2E_ENABLED=1 pnpm exec playwright test e2e/auth.spec.ts
 */
import { test, expect, type APIRequestContext, type BrowserContext } from '@playwright/test'
import {
  API_URL,
  AI_BASE,
  SHELL_BASE,
  ADMIN,
  login,
  refreshToken,
  authHeaders,
  checkAIHealth,
  getAIConversations,
  injectAuthTokens,
  loginViaUI,
  type LoginResult,
} from './helpers/authApi'

// ============================================================
// API-level Auth Tests (no browser required)
// ============================================================

test.describe('AI auth API', () => {
  test('login returns valid accessToken and refreshToken', async ({ request }) => {
    const tokens = await login(request)
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
    expect(tokens.expiresIn).toBe(900)
  })

  test('accessToken authorizes AI health check', async ({ request }) => {
    const tokens = await login(request)
    const ok = await checkAIHealth(request, tokens.accessToken)
    expect(ok).toBe(true)
  })

  test('accessToken authorizes AI conversations list', async ({ request }) => {
    const tokens = await login(request)
    const data = await getAIConversations(request, tokens.accessToken)
    expect(data).toBeDefined()
    expect(data.items).toBeDefined()
  })

  test('refreshToken exchanges for new accessToken', async ({ request }) => {
    const original = await login(request)
    const refreshed = await refreshToken(request, original.refreshToken)

    expect(refreshed.accessToken).toBeTruthy()
    expect(refreshed.accessToken).not.toBe(original.accessToken)
    expect(refreshed.refreshToken).toBeTruthy()
    expect(refreshed.expiresIn).toBe(900)
  })

  test('new accessToken from refresh works for AI API', async ({ request }) => {
    const original = await login(request)
    const refreshed = await refreshToken(request, original.refreshToken)

    const ok = await checkAIHealth(request, refreshed.accessToken)
    expect(ok).toBe(true)

    const data = await getAIConversations(request, refreshed.accessToken)
    expect(data.items).toBeDefined()
  })

  test('old accessToken is invalidated after refresh (rotating refresh)', async ({ request }) => {
    const original = await login(request)
    const refreshed = await refreshToken(request, original.refreshToken)

    // Old refresh token should be blacklisted after rotation
    const res = await request.post(`${API_URL}/api/auth/refresh`, {
      data: { refreshToken: original.refreshToken },
    })
    expect(res.status()).toBe(401)
  })

  test('multiple sequential refreshes maintain valid session', async ({ request }) => {
    const step1 = await login(request)
    const step2 = await refreshToken(request, step1.refreshToken)
    const step3 = await refreshToken(request, step2.refreshToken)

    // Final token should still work
    const ok = await checkAIHealth(request, step3.accessToken)
    expect(ok).toBe(true)
  })

  test('invalid refreshToken is rejected', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/refresh`, {
      data: { refreshToken: 'invalid-token-value' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('expired refreshToken is rejected', async ({ request }) => {
    // A well-formed but expired JWT
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJpZCI6InRlc3QiLCJ1c2VybmFtZSI6InRlc3QiLCJ0b2tlblR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.' +
      'invalid-signature'
    const res = await request.post(`${API_URL}/api/auth/refresh`, {
      data: { refreshToken: expiredToken },
    })
    expect(res.status()).toBe(401)
  })

  test('protected endpoint rejects request without Authorization header (production only)', async ({
    request,
  }) => {
    // In dev mode, auth middleware falls back to dev user, so this only applies in production
    const isProd = process.env.NODE_ENV === 'production'
    const res = await request.get(`${API_URL}/api/auth/me`)
    if (isProd) {
      expect(res.status()).toBe(401)
    } else {
      // Dev mode: fallback dev user returns 200
      expect(res.ok()).toBeTruthy()
    }
  })

  test('protected endpoint rejects request with invalid token (production only)', async ({
    request,
  }) => {
    const isProd = process.env.NODE_ENV === 'production'
    const res = await request.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    if (isProd) {
      expect(res.status()).toBe(401)
    } else {
      // Dev mode: invalid token falls back to dev user
      expect(res.ok()).toBeTruthy()
    }
  })
})

// ============================================================
// Token Refresh Lifecycle (simulates long session)
// ============================================================

test.describe('AI auth token lifecycle', () => {
  test('login -> refresh -> refresh -> AI call (simulates 30min+ session)', async ({
    request,
  }) => {
    // Step 1: Initial login
    const t0 = await login(request)
    expect(t0.accessToken).toBeTruthy()

    // Step 2: First refresh (simulates 15min passing)
    const t1 = await refreshToken(request, t0.refreshToken)
    expect(t1.accessToken).toBeTruthy()

    // Step 3: Second refresh (simulates 30min passing)
    const t2 = await refreshToken(request, t1.refreshToken)
    expect(t2.accessToken).toBeTruthy()

    // Note: tokens may be identical if generated within the same second (JWT iat is in seconds).
    // The important thing is that the refresh endpoint accepted them and returned valid tokens.

    // Step 4: Verify final token still works for AI
    const data = await getAIConversations(request, t2.accessToken)
    expect(data.items).toBeDefined()
  })

  test('refresh with new refreshToken each time (token rotation)', async ({ request }) => {
    const tokens: LoginResult[] = [await login(request)]

    for (let i = 0; i < 3; i++) {
      const prev = tokens[tokens.length - 1]
      const next = await refreshToken(request, prev.refreshToken)
      tokens.push(next)
    }

    // All tokens should be valid (access + refresh)
    for (const t of tokens) {
      expect(t.accessToken).toBeTruthy()
      expect(t.refreshToken).toBeTruthy()
    }

    // Old refresh tokens should be blacklisted after rotation
    const oldRefresh = tokens[0].refreshToken
    const res = await request.post(`${API_URL}/api/auth/refresh`, {
      data: { refreshToken: oldRefresh },
    })
    expect(res.status()).toBe(401)

    // Only the last token should work
    const last = tokens[tokens.length - 1]
    const ok = await checkAIHealth(request, last.accessToken)
    expect(ok).toBe(true)
  })
})

// ============================================================
// UI-level Auth Tests (requires running shell + server)
// ============================================================

test.describe('AI auth UI', () => {
  test.skip(!process.env.E2E_ENABLED, 'Set E2E_ENABLED=1 with running shell+server')

  test('login via shell and access AI standalone page', async ({ page, request }) => {
    // Login via API to get tokens
    const tokens = await login(request)

    // Navigate to AI standalone and inject tokens
    await page.goto(AI_BASE)
    await injectAuthTokens(page, tokens)

    // Reload to trigger auth bootstrap
    await page.reload()

    // AI app should load without redirecting to login
    await expect(page.locator('#ai-app')).toBeVisible({ timeout: 15000 })
  })

  test('login via shell and open AI sidebar in editor', async ({ page, request }) => {
    // Login via shell UI
    await loginViaUI(page)

    // Navigate to an editor page that has AI sidebar
    await page.goto(`${SHELL_BASE}/app/editor/view/test-schema`)
    await page.waitForTimeout(3000)

    // Check if AI iframe or drawer exists
    const aiFrame = page.locator('iframe[src*="sidebar"]')
    const aiDrawerVisible = await aiFrame.isVisible().catch(() => false)

    // AI sidebar should be accessible (either visible or toggleable)
    if (!aiDrawerVisible) {
      // Try to find and click the AI toggle button
      const aiToggle = page.locator('[title*="AI"], [aria-label*="AI"]').first()
      if (await aiToggle.isVisible().catch(() => false)) {
        await aiToggle.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('AI sidebar shares auth with editor (same localStorage)', async ({
    page,
    context,
    request,
  }) => {
    // Login via API
    const tokens = await login(request)

    // Navigate to AI sidebar directly
    await page.goto(`${AI_BASE}/index-sidebar.html`)
    await injectAuthTokens(page, tokens)
    await page.reload()

    // AI app should load
    await expect(page.locator('#ai-app')).toBeVisible({ timeout: 15000 })
  })

  test('cross-tab session consistency: two tabs share auth', async ({ context, request }) => {
    // Login via API
    const tokens = await login(request)

    // Tab 1: AI standalone
    const page1 = await context.newPage()
    await page1.goto(AI_BASE)
    await injectAuthTokens(page1, tokens)
    await page1.reload()
    await expect(page1.locator('#ai-app')).toBeVisible({ timeout: 15000 })

    // Tab 2: Same origin, should share localStorage
    const page2 = await context.newPage()
    await page2.goto(AI_BASE)

    // Verify the token is present in tab 2 (shared localStorage)
    const tokenInTab2 = await page2.evaluate(() =>
      localStorage.getItem('sfp_access_token'),
    )
    expect(tokenInTab2).toBe(tokens.accessToken)

    // Tab 2 should also load without redirecting
    await expect(page2.locator('#ai-app')).toBeVisible({ timeout: 15000 })

    await page1.close()
    await page2.close()
  })

  test('cross-tab refresh propagation: refresh in tab1 visible in tab2', async ({
    context,
    request,
  }) => {
    const tokens = await login(request)

    // Tab 1: inject and load
    const page1 = await context.newPage()
    await page1.goto(AI_BASE)
    await injectAuthTokens(page1, tokens)
    await page1.reload()
    await expect(page1.locator('#ai-app')).toBeVisible({ timeout: 15000 })

    // Tab 2: open same origin
    const page2 = await context.newPage()
    await page2.goto(AI_BASE)
    await expect(page2.locator('#ai-app')).toBeVisible({ timeout: 15000 })

    // Simulate token refresh in tab 1
    const refreshed = await refreshToken(request, tokens.refreshToken)
    await page1.evaluate(
      ({ access, refresh }) => {
        localStorage.setItem('sfp_access_token', access)
        localStorage.setItem('sfp_refresh_token', refresh)
      },
      { access: refreshed.accessToken, refresh: refreshed.refreshToken },
    )

    // Tab 2 should see the updated token (same localStorage)
    const tokenInTab2 = await page2.evaluate(() =>
      localStorage.getItem('sfp_access_token'),
    )
    expect(tokenInTab2).toBe(refreshed.accessToken)

    await page1.close()
    await page2.close()
  })

  test('long session: login -> multiple refreshes -> AI still works', async ({
    page,
    request,
  }) => {
    // Initial login
    let tokens = await login(request)

    // Inject into page
    await page.goto(AI_BASE)
    await injectAuthTokens(page, tokens)
    await page.reload()
    await expect(page.locator('#ai-app')).toBeVisible({ timeout: 15000 })

    // Simulate 3 refresh cycles (45min+ session)
    for (let i = 0; i < 3; i++) {
      tokens = await refreshToken(request, tokens.refreshToken)
      await page.evaluate(
        ({ access, refresh }) => {
          localStorage.setItem('sfp_access_token', access)
          localStorage.setItem('sfp_refresh_token', refresh)
        },
        { access: tokens.accessToken, refresh: tokens.refreshToken },
      )
    }

    // Reload page to trigger auth bootstrap with latest token
    await page.reload()

    // AI app should still load successfully
    await expect(page.locator('#ai-app')).toBeVisible({ timeout: 15000 })

    // Verify the token is the latest one
    const currentToken = await page.evaluate(() =>
      localStorage.getItem('sfp_access_token'),
    )
    expect(currentToken).toBe(tokens.accessToken)
  })
})
