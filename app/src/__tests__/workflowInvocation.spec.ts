import { describe, it, expect } from 'vitest'
import {
  EXECUTION_TRIGGER_LABELS,
  getExecutionTriggerLabel,
  INVOCATION_METHODS,
} from '@/constants/workflowInvocation'

describe('workflowInvocation', () => {
  it('maps execution triggers to Chinese labels', () => {
    expect(getExecutionTriggerLabel('chat')).toBe('AI 对话')
    expect(getExecutionTriggerLabel('api')).toBe('API / 脚本')
    expect(getExecutionTriggerLabel('unknown')).toBe('unknown')
  })

  it('defines invocation channels including unified invoke and JWT', () => {
    expect(INVOCATION_METHODS.length).toBeGreaterThanOrEqual(5)
    expect(EXECUTION_TRIGGER_LABELS.chat).toBe('AI 对话')
  })
})
