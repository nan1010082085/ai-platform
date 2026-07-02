import { APP_CONFIGS } from '@schema-platform/platform-shared/qiankun/config'
import { useQiankunShell } from '@schema-platform/platform-shared/qiankun'

const SHELL_BASE = APP_CONFIGS.shell.basePath.replace(/\/$/, '')

/**
 * 判断 AI 是否运行在 shell 微前端容器内（/app/ai 或 /standalone/ai）。
 */
export function detectShellEmbed(pathname = window.location.pathname): boolean {
  if (window.__POWERED_BY_QIANKUN__) return true
  return new RegExp(`^${SHELL_BASE}/(app|standalone)/(editor|flow|ai)(/|$)`).test(pathname)
}

export function useShellEmbed() {
  const {
    isQiankunSubApp,
    shouldHideSubAppMenu,
    shellEmbedMode,
    goToShellHome,
  } = useQiankunShell()

  return {
    isShellEmbedded: isQiankunSubApp,
    shouldHideSubAppMenu,
    shellEmbedMode,
    goToShellHome,
  }
}
