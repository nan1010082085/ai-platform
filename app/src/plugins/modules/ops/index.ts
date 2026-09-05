/**
 * Ops 功能模块：监控、定时任务、评测与路由调试。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ShellRouteContribution } from '../../plugins/shell-routes/types'

/**
 * 注册 Ops 相关 shell 路由贡献。
 * @param ctx Cordis 根 Context
 */
export function opsModule(ctx: Context): void {
  const routes: ShellRouteContribution[] = [
    {
      name: 'monitor',
      path: '/monitor',
      childPath: 'monitor',
      layout: 'ai-layout',
      component: () => import('@/views/AiMonitorView.vue'),
    },
    {
      name: 'schedules',
      path: '/schedules',
      childPath: 'schedules',
      layout: 'ai-layout',
      component: () => import('@/views/ScheduleView.vue'),
    },
    {
      name: 'evaluation',
      path: '/evaluation',
      childPath: 'evaluation',
      layout: 'ai-layout',
      component: () => import('@/views/EvaluationView.vue'),
    },
    {
      name: 'routing-debug',
      path: '/debug/routing',
      childPath: 'debug/routing',
      layout: 'ai-layout',
      component: () => import('@/views/RoutingDebugView.vue'),
    },
  ]
  for (const r of routes) ctx.shellRoutes.register(r)
}
