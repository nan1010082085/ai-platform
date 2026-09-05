/**
 * Chat 功能模块：对话主页、侧栏嵌入页、公开分享会话。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ShellRouteContribution } from '../../plugins/shell-routes/types'

/**
 * 注册 Chat 相关 shell 路由贡献。
 * @param ctx Cordis 根 Context
 */
export function chatModule(ctx: Context): void {
  const routes: ShellRouteContribution[] = [
    {
      name: 'chat',
      path: '/',
      childPath: '',
      layout: 'ai-layout',
      component: () => import('@/views/AiChatView.vue'),
    },
    {
      name: 'sidebar',
      path: '/sidebar',
      layout: 'bare',
      component: () => import('@/views/AiSidebarView.vue'),
    },
    {
      name: 'shared-conversation',
      path: '/shared/:shareId',
      layout: 'public',
      meta: { public: true },
      component: () => import('@/views/SharedConversationView.vue'),
    },
  ]
  for (const r of routes) ctx.shellRoutes.register(r)
}
