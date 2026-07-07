/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkflowExecutionTimeline from '@/components/workflow/WorkflowExecutionTimeline.vue'
import type { WorkflowMessageExecution } from '@/types'

function makeExecution(partial: Partial<WorkflowMessageExecution>): WorkflowMessageExecution {
  return {
    executionId: 'exec-1',
    workflowName: '智能助手',
    status: 'running',
    nodeRecords: [],
    streamingNodeId: null,
    ...partial,
  }
}

describe('WorkflowExecutionTimeline', () => {
  it('renders node records and streaming hint', () => {
    const wrapper = mount(WorkflowExecutionTimeline, {
      props: {
        execution: makeExecution({
          nodeRecords: [
            {
              nodeId: 'trigger-1',
              nodeType: 'manual-trigger',
              nodeName: '手动触发',
              status: 'success',
            },
            {
              nodeId: 'llm-1',
              nodeType: 'llm',
              nodeName: 'LLM',
              status: 'running',
            },
          ],
          streamingNodeId: 'llm-1',
        }),
      },
      global: {
        stubs: {
          AppIcon: { template: '<span />' },
        },
      },
    })

    expect(wrapper.text()).toContain('智能助手 · 执行中')
    expect(wrapper.text()).toContain('手动触发')
    expect(wrapper.text()).toContain('LLM')
    expect(wrapper.text()).toContain('生成回复中…')
    expect(wrapper.text()).toContain('1/2')
  })

  it('shows empty hint before first node starts', () => {
    const wrapper = mount(WorkflowExecutionTimeline, {
      props: {
        execution: makeExecution({ status: 'running' }),
      },
      global: {
        stubs: {
          AppIcon: { template: '<span />' },
        },
      },
    })

    expect(wrapper.text()).toContain('等待首个节点开始…')
  })
})
