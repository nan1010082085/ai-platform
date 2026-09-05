/**
 * RAG 功能模块：知识库管理与 RAG 调试页。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ShellRouteContribution } from '../../plugins/shell-routes/types'

/**
 * 注册 RAG 相关 shell 路由贡献。
 * @param ctx Cordis 根 Context
 */
export function ragModule(ctx: Context): void {
  const routes: ShellRouteContribution[] = [
    {
      name: 'rag',
      path: '/rag',
      childPath: 'rag',
      layout: 'ai-layout',
      component: () => import('@/views/RagKnowledgeBase.vue'),
    },
    {
      name: 'rag-debug',
      path: '/debug/rag',
      childPath: 'debug/rag',
      layout: 'ai-layout',
      component: () => import('@/views/RagDebugView.vue'),
    },
  ]
  for (const r of routes) ctx.shellRoutes.register(r)
}
