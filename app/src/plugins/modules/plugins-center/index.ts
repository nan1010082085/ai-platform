/**
 * Plugins Center 功能模块：插件中心与 MCP 管理。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ShellRouteContribution } from '../../plugins/shell-routes/types'

/**
 * 注册插件中心相关 shell 路由贡献。
 * @param ctx Cordis 根 Context
 */
export function pluginsCenterModule(ctx: Context): void {
  const routes: ShellRouteContribution[] = [
    {
      name: 'plugin-center',
      path: '/plugins',
      childPath: 'plugins',
      layout: 'ai-layout',
      component: () => import('@/views/PluginCenterView.vue'),
    },
    {
      name: 'mcp-manager',
      path: '/mcp',
      childPath: 'mcp',
      layout: 'ai-layout',
      component: () => import('@/views/McpManagerView.vue'),
    },
  ]
  for (const r of routes) ctx.shellRoutes.register(r)
}
