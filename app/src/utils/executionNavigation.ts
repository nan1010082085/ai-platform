import type { RouteLocationRaw } from 'vue-router'

/**
 * 执行详情页「返回」目标：全局列表进入时回全部执行，否则回该工作流执行列表。
 */
export function resolveExecutionDetailBackTo(opts: {
  fromGlobal: boolean
  workflowId?: string
}): RouteLocationRaw {
  if (opts.fromGlobal || !opts.workflowId) {
    return { name: 'agent-executions' }
  }
  return {
    name: 'agent-workflow-executions',
    params: { id: opts.workflowId },
  }
}

/**
 * 从执行列表进详情时附带的 query（全局模式标记来源）。
 */
export function buildExecutionDetailQuery(isGlobal: boolean): { from: 'global' } | undefined {
  return isGlobal ? { from: 'global' } : undefined
}
