/**
 * Settings 功能模块：记忆、集成与模型/密钥/Embedding 设置。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ShellRouteContribution } from '../../plugins/shell-routes/types'

/**
 * 注册 Settings 相关 shell 路由贡献。
 * @param ctx Cordis 根 Context
 */
export function settingsModule(ctx: Context): void {
  const routes: ShellRouteContribution[] = [
    {
      name: 'memory',
      path: '/memory',
      childPath: 'memory',
      layout: 'ai-layout',
      component: () => import('@/views/MemoryManagementView.vue'),
    },
    {
      name: 'integration',
      path: '/integration',
      childPath: 'integration',
      layout: 'ai-layout',
      component: () => import('@/views/WorkflowIntegrationView.vue'),
    },
    {
      name: 'api-keys',
      path: '/settings/keys',
      childPath: 'settings/keys',
      layout: 'ai-layout',
      component: () => import('@/views/ApiKeyManagerView.vue'),
    },
    {
      name: 'model-settings',
      path: '/settings/models',
      childPath: 'settings/models',
      layout: 'ai-layout',
      component: () => import('@/views/ModelSettingsView.vue'),
    },
    {
      name: 'embedding-settings',
      path: '/settings/embedding',
      childPath: 'settings/embedding',
      layout: 'ai-layout',
      component: () => import('@/views/EmbeddingSettingsView.vue'),
    },
  ]
  for (const r of routes) ctx.shellRoutes.register(r)
}
