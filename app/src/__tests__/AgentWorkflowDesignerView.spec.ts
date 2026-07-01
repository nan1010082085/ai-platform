import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/agentWorkflowApi', () => ({
  getWorkflow: vi.fn().mockResolvedValue({
    id: '6a445d513628ec12fe85a241',
    name: 'test-save',
    description: '',
    status: 'draft',
    publishedVersion: null,
    version: '20260701090000',
    publishId: null,
    hasRunningExecution: false,
    draftGraph: {
      entryNodeId: 'trigger-1',
      nodes: [{ id: 'trigger-1', type: 'manual-trigger', position: { x: 0, y: 0 }, data: { label: '手动触发' } }],
      edges: [],
    },
  }),
  listWorkflowVersions: vi.fn().mockResolvedValue([]),
  updateWorkflow: vi.fn().mockResolvedValue({}),
  publishWorkflow: vi.fn().mockResolvedValue({ versionId: 'v1', version: 1 }),
  executeWorkflow: vi.fn().mockResolvedValue({ id: 'exec-1' }),
}))

const AgentWorkflowDesignerView = (await import('@/views/AgentWorkflowDesignerView.vue')).default

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workflows/:id', name: 'agent-workflow-designer', component: AgentWorkflowDesignerView },
      { path: '/workflows', name: 'agent-workflows', component: { template: '<div>list</div>' } },
    ],
  })
}

describe('AgentWorkflowDesignerView render', () => {
  it('renders palette, canvas and property panel below toolbar', async () => {
    setActivePinia(createPinia())
    const router = makeRouter()
    router.push('/workflows/6a445d513628ec12fe85a241')
    await router.isReady()

    const wrapper = mount(AgentWorkflowDesignerView, {
      global: {
        plugins: [router],
        stubs: {
          VueFlow: { template: '<div class="vf-stub" style="height:100%"></div>' },
          Background: true,
          Controls: true,
        },
      },
    })

    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('节点')
    expect(text).toContain('属性配置')
    expect(text).toContain('手动触发')
    const titleInput = wrapper.find('input[placeholder="未命名工作流"]')
    expect((titleInput.element as HTMLInputElement).value).toBe('test-save')
    const buttons = wrapper.findAll('button')
    const titles = buttons.map((b) => b.attributes('title')).filter(Boolean)
    expect(titles).toContain('节点面板')
    expect(titles).toContain('属性面板')
  })
})
