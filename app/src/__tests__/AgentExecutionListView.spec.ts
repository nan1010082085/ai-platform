/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AgentExecutionListView from '@/views/AgentExecutionListView.vue'

vi.mock('@/api/agentWorkflowApi', () => ({
  listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 }),
  cancelExecution: vi.fn(),
}))

vi.mock('@/composables/useWorkflowExecutionStream', () => ({
  watchRunningWorkflowExecutions: vi.fn(() => () => {}),
}))

const mockExecutions = [
  {
    id: '507f1f77bcf86cd799439011',
    workflowId: '507f1f77bcf86cd799439000',
    workflowName: '测试工作流',
    status: 'success',
    version: '20260811120000',
    trigger: 'manual',
    durationMs: 5000,
    startedAt: '2026-08-11T12:00:00Z',
    nodeRecords: [],
  },
  {
    id: '507f1f77bcf86cd799439012',
    workflowId: '507f1f77bcf86cd799439000',
    workflowName: '测试工作流',
    status: 'running',
    version: '20260811120001',
    trigger: 'chat',
    durationMs: undefined,
    startedAt: '2026-08-11T12:01:00Z',
    nodeRecords: [{ nodeId: 'node1' }],
  },
]

describe('AgentExecutionListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('单工作流模式：返回按钮导航到 agent-workflows', async () => {
    const api = await import('@/api/agentWorkflowApi')
    vi.mocked(api.listExecutions).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workflows', name: 'agent-workflows', component: { template: '<div />' } },
        {
          path: '/workflows/:id/executions',
          name: 'agent-workflow-executions',
          component: AgentExecutionListView,
        },
        {
          path: '/workflows/:id',
          name: 'agent-workflow-designer',
          component: { template: '<div />' },
        },
        {
          path: '/executions',
          name: 'agent-executions',
          component: AgentExecutionListView,
        },
      ],
    })
    await router.push({ name: 'agent-workflow-executions', params: { id: '507f1f77bcf86cd799439000' } })
    const wrapper = mount(AgentExecutionListView, {
      global: {
        plugins: [router],
        stubs: {
          PageShell: { template: '<div><slot /></div>' },
          PageHeader: { template: '<div><slot name="actions" /></div>' },
          AppIcon: true,
          TableRowActions: true,
          FilterTabs: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          AppPagination: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
          ElButton: { template: '<button><slot /></button>' },
          ElMessage: { success: vi.fn(), error: vi.fn() },
        },
      },
    })
    await flushPromises()
    const backBtn = wrapper.findAll('button').find((b) => b.text().includes('返回'))
    expect(backBtn).toBeTruthy()
    await backBtn!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('agent-workflows')
  })

  it('全局模式：标题显示"全部执行记录"', async () => {
    const api = await import('@/api/agentWorkflowApi')
    vi.mocked(api.listExecutions).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workflows', name: 'agent-workflows', component: { template: '<div />' } },
        {
          path: '/workflows/:id/executions',
          name: 'agent-workflow-executions',
          component: AgentExecutionListView,
        },
        {
          path: '/executions',
          name: 'agent-executions',
          component: AgentExecutionListView,
        },
      ],
    })
    await router.push({ name: 'agent-executions' })
    const wrapper = mount(AgentExecutionListView, {
      global: {
        plugins: [router],
        stubs: {
          PageShell: { template: '<div><slot /></div>' },
          PageHeader: {
            template: '<div><h1>{{ title }}</h1><p>{{ subtitle }}</p><slot name="actions" /></div>',
            props: ['title', 'subtitle'],
          },
          AppIcon: true,
          TableRowActions: true,
          FilterTabs: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          AppPagination: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('全部执行记录')
    expect(wrapper.text()).toContain('所有工作流的执行历史')
  })

  it('全局模式：不显示"打开设计器"按钮', async () => {
    const api = await import('@/api/agentWorkflowApi')
    vi.mocked(api.listExecutions).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workflows', name: 'agent-workflows', component: { template: '<div />' } },
        {
          path: '/workflows/:id/executions',
          name: 'agent-workflow-executions',
          component: AgentExecutionListView,
        },
        {
          path: '/executions',
          name: 'agent-executions',
          component: AgentExecutionListView,
        },
      ],
    })
    await router.push({ name: 'agent-executions' })
    const wrapper = mount(AgentExecutionListView, {
      global: {
        plugins: [router],
        stubs: {
          PageShell: { template: '<div><slot /></div>' },
          PageHeader: {
            template: '<div><slot name="actions" /></div>',
            props: ['title', 'subtitle'],
          },
          AppIcon: true,
          TableRowActions: true,
          FilterTabs: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          AppPagination: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })
    await flushPromises()
    expect(wrapper.text()).not.toContain('打开设计器')
  })

  it('加载失败时展示错误态并可重试', async () => {
    const api = await import('@/api/agentWorkflowApi')
    vi.mocked(api.listExecutions)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 10 })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workflows', name: 'agent-workflows', component: { template: '<div />' } },
        {
          path: '/workflows/:id/executions',
          name: 'agent-workflow-executions',
          component: AgentExecutionListView,
        },
        {
          path: '/executions',
          name: 'agent-executions',
          component: AgentExecutionListView,
        },
      ],
    })
    await router.push({ name: 'agent-workflow-executions', params: { id: '507f1f77bcf86cd799439000' } })
    const wrapper = mount(AgentExecutionListView, {
      global: {
        plugins: [router],
        stubs: {
          PageShell: { template: '<div><slot /></div>' },
          PageHeader: { template: '<div><slot name="actions" /></div>' },
          AppIcon: true,
          TableRowActions: true,
          FilterTabs: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          AppPagination: true,
          ElSelect: true,
          ElOption: true,
          ElTag: true,
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('network')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('重试'))
    expect(retry).toBeTruthy()
    await retry!.trigger('click')
    await flushPromises()
    expect(api.listExecutions).toHaveBeenCalledTimes(2)
  })
})
