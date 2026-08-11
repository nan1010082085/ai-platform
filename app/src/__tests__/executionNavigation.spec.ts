import { describe, it, expect } from 'vitest'
import {
  resolveExecutionDetailBackTo,
  buildExecutionDetailQuery,
} from '@/utils/executionNavigation'

describe('executionNavigation', () => {
  it('全局来源返回 agent-executions', () => {
    expect(
      resolveExecutionDetailBackTo({ fromGlobal: true, workflowId: '507f1f77bcf86cd799439000' }),
    ).toEqual({ name: 'agent-executions' })
  })

  it('工作流来源返回该工作流执行列表', () => {
    expect(
      resolveExecutionDetailBackTo({ fromGlobal: false, workflowId: '507f1f77bcf86cd799439000' }),
    ).toEqual({
      name: 'agent-workflow-executions',
      params: { id: '507f1f77bcf86cd799439000' },
    })
  })

  it('缺少 workflowId 时回退全部执行', () => {
    expect(resolveExecutionDetailBackTo({ fromGlobal: false })).toEqual({
      name: 'agent-executions',
    })
  })

  it('全局列表进详情时带 from=global', () => {
    expect(buildExecutionDetailQuery(true)).toEqual({ from: 'global' })
    expect(buildExecutionDetailQuery(false)).toBeUndefined()
  })
})
