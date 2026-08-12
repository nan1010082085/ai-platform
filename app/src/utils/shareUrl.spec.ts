/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSharedConversationUrl } from '@/utils/shareUrl'

describe('buildSharedConversationUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('dev base `/` → origin/shared/:id', () => {
    vi.stubEnv('BASE_URL', '/')
    vi.stubEnv('VITE_ROUTE_BASE', '')
    expect(buildSharedConversationUrl('abc123', 'http://localhost:5300')).toBe(
      'http://localhost:5300/shared/abc123',
    )
  })

  it('prod base `/schema-platform/ai/` → 拼接 shared', () => {
    vi.stubEnv('BASE_URL', '/schema-platform/ai/')
    vi.stubEnv('VITE_ROUTE_BASE', '')
    expect(buildSharedConversationUrl('abc123', 'https://pyflow.icu')).toBe(
      'https://pyflow.icu/schema-platform/ai/shared/abc123',
    )
  })

  it('优先 VITE_ROUTE_BASE', () => {
    vi.stubEnv('BASE_URL', '/')
    vi.stubEnv('VITE_ROUTE_BASE', '/schema-platform/ai/')
    expect(buildSharedConversationUrl('xyz', 'https://example.com')).toBe(
      'https://example.com/schema-platform/ai/shared/xyz',
    )
  })
})
