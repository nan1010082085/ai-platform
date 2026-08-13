/**
 * @vitest-environment jsdom
 * Agent 编排列表：客户端分页（默认 10 条）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} }),
}))

vi.mock('@schema-platform/platform-shared/utils/message', () => ({
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

const listWorkflows = vi.fn()

vi.mock('@/api/agentWorkflowApi', () => ({
  listWorkflows: (...args: unknown[]) => listWorkflows(...args),
  createWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  publishWorkflow: vi.fn(),
  exportWorkflow: vi.fn(),
  importWorkflow: vi.fn(),
}))

import AgentWorkflowListView from '@/views/AgentWorkflowListView.vue'

function makeWorkflows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i + 1}`,
    name: `工作流 ${String(i + 1).padStart(2, '0')}`,
    description: `desc-${i + 1}`,
    slug: `wf-${i + 1}`,
    status: i % 2 === 0 ? 'published' : 'draft',
    version: '20260813120000',
    publishedVersion: i % 2 === 0 ? '20260813120000' : null,
    updatedAt: new Date(Date.UTC(2026, 7, 13, 12, i)).toISOString(),
    createdAt: new Date(Date.UTC(2026, 7, 1)).toISOString(),
    hasRunningExecution: false,
  }))
}

const stubs = {
  AppIcon: { template: '<span />', props: ['name', 'size'] },
  PageShell: { template: '<div><slot /></div>' },
  PageHeader: { template: '<div><slot name="actions" /></div>' },
  FilterTabs: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template: `
      <div>
        <button
          v-for="opt in options"
          :key="opt.value"
          :data-tab="opt.value"
          @click="$emit('update:modelValue', opt.value)"
        >{{ opt.label }}</button>
      </div>
    `,
  },
  AppDialog: { template: '<div />', props: ['modelValue'] },
  AgentWorkflowTemplatePreviewDialog: { template: '<div />' },
  WorkflowInvokeInfo: { template: '<div />' },
  WorkflowTemplateCard: { template: '<div />' },
  AppPagination: {
    props: ['currentPage', 'pageSize', 'total'],
    emits: ['update:currentPage', 'update:pageSize'],
    template: `
      <div data-testid="app-pagination">
        <span data-testid="total">{{ total }}</span>
        <span data-testid="page-size">{{ pageSize }}</span>
        <button data-testid="goto-page-2" @click="$emit('update:currentPage', 2)">2</button>
      </div>
    `,
  },
  'el-button': { template: '<button><slot /></button>' },
  'el-input': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'el-tag': { template: '<span><slot /></span>' },
  'el-tooltip': { template: '<span><slot /></span>' },
  'el-dropdown': { template: '<div><slot /></div>' },
  'el-dropdown-menu': { template: '<div />' },
  'el-dropdown-item': { template: '<div />' },
  'el-checkbox': { template: '<input type="checkbox" />' },
}

describe('AgentWorkflowListView pagination', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    listWorkflows.mockResolvedValue(makeWorkflows(25))
  })

  it('默认每页 10 条，并展示统一分页器', async () => {
    const wrapper = mount(AgentWorkflowListView, { global: { stubs } })
    await flushPromises()

    const names = wrapper.findAll('h3').map((n) => n.text())
    expect(names).toHaveLength(10)
    expect(wrapper.find('[data-testid="app-pagination"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-size"]').text()).toBe('10')
    expect(wrapper.find('[data-testid="total"]').text()).toBe('25')
  })

  it('翻页后展示下一页', async () => {
    const wrapper = mount(AgentWorkflowListView, { global: { stubs } })
    await flushPromises()

    await wrapper.find('[data-testid="goto-page-2"]').trigger('click')
    await wrapper.vm.$nextTick()

    const names = wrapper.findAll('h3').map((n) => n.text())
    expect(names).toHaveLength(10)
    expect(names[0]).toContain('15')
  })
})
