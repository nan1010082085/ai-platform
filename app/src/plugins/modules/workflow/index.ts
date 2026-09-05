/**
 * Workflow 功能模块：智能体工作流列表、执行、设计器与调试。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ShellRouteContribution } from '../../plugins/shell-routes/types'

/**
 * 注册 Workflow 相关 shell 路由贡献。
 * @param ctx Cordis 根 Context
 */
export function workflowModule(ctx: Context): void {
  const routes: ShellRouteContribution[] = [
    {
      name: 'agent-workflows',
      path: '/workflows',
      childPath: 'workflows',
      layout: 'ai-layout',
      component: () => import('@/views/AgentWorkflowListView.vue'),
    },
    {
      name: 'agent-executions',
      path: '/executions',
      childPath: 'executions',
      layout: 'ai-layout',
      component: () => import('@/views/AgentExecutionListView.vue'),
    },
    {
      name: 'agent-workflow-executions',
      path: '/workflows/:id/executions',
      childPath: 'workflows/:id/executions',
      layout: 'ai-layout',
      component: () => import('@/views/AgentExecutionListView.vue'),
    },
    {
      name: 'workflow-templates',
      path: '/settings/templates',
      childPath: 'settings/templates',
      layout: 'ai-layout',
      component: () => import('@/views/WorkflowTemplateManagerView.vue'),
    },
    {
      name: 'agent-workflow-designer',
      path: '/workflows/:id',
      layout: 'bare',
      component: () => import('@/views/AgentWorkflowDesignerView.vue'),
    },
    {
      name: 'agent-execution-detail',
      path: '/executions/:id',
      layout: 'bare',
      component: () => import('@/views/AgentExecutionDetailView.vue'),
    },
    {
      name: 'workflow-debug',
      path: '/debug/workflow/:id',
      childPath: 'debug/workflow/:id',
      layout: 'ai-layout',
      component: () => import('@/views/WorkflowDebugView.vue'),
    },
  ]
  for (const r of routes) ctx.shellRoutes.register(r)
}
