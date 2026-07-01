import { computed } from 'vue'
import { APP_CONFIGS, getAppUrl } from '@schema-platform/platform-shared/qiankun/config'

const SHELL_BASE = APP_CONFIGS.shell.basePath.replace(/\/$/, '')

/**
 * 判断 AI 是否运行在 shell 微前端容器内。
 *
 * - qiankun 正常挂载时 __POWERED_BY_QIANKUN__ 为 true
 * - 部分环境下 flag 未设置，但 URL 已是 /schema-platform/standalone/ai 或 /app/ai
 */
export function detectShellEmbed(): boolean {
  if (window.__POWERED_BY_QIANKUN__) return true
  const pathname = window.location.pathname
  return new RegExp(`^${SHELL_BASE}/(standalone|app)/ai(/|$)`).test(pathname)
}

export function useShellEmbed() {
  const isShellEmbedded = computed(() => detectShellEmbed())

  function goToShellHome(): void {
    window.location.href = getAppUrl('shell', import.meta.env.DEV)
  }

  return { isShellEmbedded, goToShellHome }
}
