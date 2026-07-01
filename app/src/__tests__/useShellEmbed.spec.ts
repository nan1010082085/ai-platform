/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectShellEmbed } from '@/composables/useShellEmbed'

describe('detectShellEmbed', () => {
  const originalPathname = window.location.pathname
  const originalFlag = window.__POWERED_BY_QIANKUN__

  beforeEach(() => {
    delete (window as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: originalPathname },
      writable: true,
    })
    if (originalFlag) {
      window.__POWERED_BY_QIANKUN__ = originalFlag
    } else {
      delete (window as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__
    }
  })

  function setPathname(pathname: string): void {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname },
      writable: true,
    })
  }

  it('returns true when __POWERED_BY_QIANKUN__ is set', () => {
    window.__POWERED_BY_QIANKUN__ = true
    setPathname('/')
    expect(detectShellEmbed()).toBe(true)
  })

  it('returns true for shell standalone ai path without qiankun flag', () => {
    setPathname('/schema-platform/standalone/ai/')
    expect(detectShellEmbed()).toBe(true)
  })

  it('returns true for shell app ai path without qiankun flag', () => {
    setPathname('/schema-platform/app/ai/rag')
    expect(detectShellEmbed()).toBe(true)
  })

  it('returns false for direct ai dev entry', () => {
    setPathname('/')
    expect(detectShellEmbed()).toBe(false)
  })

  it('returns false for direct ai production base path', () => {
    setPathname('/schema-platform/ai/')
    expect(detectShellEmbed()).toBe(false)
  })
})
