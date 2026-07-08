/**
 * AI Auth E2E helpers
 *
 * Shared utilities for auth-related e2e tests.
 */
import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test'

export const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3001'
export const AI_BASE = (process.env.AI_URL ?? 'http://localhost:5300').replace(/\/$/, '')
export const SHELL_BASE = (process.env.SHELL_URL ?? 'http://localhost:5050/schema-platform').replace(/\/$/, '')
export const ADMIN = { username: 'admin', password: 'admin123456' }

export interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** Login via API and return tokens */
export async function login(request: APIRequestContext, creds = ADMIN): Promise<LoginResult> {
  const res = await request.post(`${API_URL}/api/auth/login`, { data: creds })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.success).toBe(true)
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    expiresIn: body.data.expiresIn,
  }
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

/** Refresh access token using refresh token */
export async function refreshToken(
  request: APIRequestContext,
  refresh: string,
): Promise<LoginResult> {
  const res = await request.post(`${API_URL}/api/auth/refresh`, {
    data: { refreshToken: refresh },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.success).toBe(true)
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    expiresIn: body.data.expiresIn,
  }
}

/** Verify AI health endpoint with given token */
export async function checkAIHealth(request: APIRequestContext, token: string): Promise<boolean> {
  const res = await request.get(`${API_URL}/api/ai/health`, {
    headers: authHeaders(token),
  })
  return res.ok()
}

/** Get AI conversations list with given token */
export async function getAIConversations(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/api/ai/conversations`, {
    headers: authHeaders(token),
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.success).toBe(true)
  return body.data
}

/** Inject auth tokens into a browser page's localStorage */
export async function injectAuthTokens(page: Page, tokens: LoginResult): Promise<void> {
  await page.evaluate(
    ({ access, refresh }) => {
      localStorage.setItem('sfp_access_token', access)
      localStorage.setItem('sfp_refresh_token', refresh)
    },
    { access: tokens.accessToken, refresh: tokens.refreshToken },
  )
}

/** Login via shell UI (browser-based) */
export async function loginViaUI(page: Page, creds = ADMIN): Promise<void> {
  await page.goto(`${SHELL_BASE}/login`)
  await page.getByPlaceholder('用户名').fill(creds.username)
  await page.getByPlaceholder('密码').fill(creds.password)
  await page.getByRole('button', { name: /登录/ }).click()
  await page.waitForURL(/\/(schema-platform\/)?$|dashboard|workbench/, { timeout: 15000 })
}

/** Wait for AI sidebar iframe to be ready */
export async function waitForAIReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[src*="sidebar"]')
      return iframe?.contentDocument?.querySelector('#ai-app') !== null
    },
    { timeout: 15000 },
  )
}
