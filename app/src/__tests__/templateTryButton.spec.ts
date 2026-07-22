/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
  useRoute: () => ({ query: {} }),
}))

vi.mock('@/api/agentWorkflowApi', () => ({
  listWorkflows: vi.fn().mockResolvedValue([]),
  createWorkflow: vi.fn().mockResolvedValue({ id: 'new-wf-id', name: 'test' }),
  deleteWorkflow: vi.fn().mockResolvedValue({ deleted: true }),
  publishWorkflow: vi.fn().mockResolvedValue({ publishId: 'p1', version: 'v1' }),
}))

vi.mock('@schema-platform/platform-shared/utils/message', () => ({
  message: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

import AgentWorkflowListView from '@/views/AgentWorkflowListView.vue'
import * as api from '@/api/agentWorkflowApi'

// FilterTabs stub that renders tab buttons and emits on click
const FilterTabsStub = {
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: `
    <div>
      <button
        v-for="opt in options"
        :key="opt.value"
        :data-tab="opt.value"
        :class="{ active: modelValue === opt.value }"
        @click="$emit('update:modelValue', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  `,
}

const EP_STUBS = {
  'el-button': {
    template: '<button @click="$emit(\'click\')" :disabled="disabled"><slot /></button>',
    props: ['size', 'type', 'loading', 'disabled', 'text', 'plain'],
    emits: ['click'],
  },
  'el-input': {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue'],
  },
  'el-tag': { template: '<span><slot /></span>', props: ['size', 'type'] },
  'el-tooltip': { template: '<span><slot /></span>', props: ['content', 'placement', 'showAfter'] },
  'el-dropdown': { template: '<div><slot /><slot name="dropdown" /></div>' },
  'el-dropdown-menu': { template: '<div><slot /></div>' },
  'el-dropdown-item': { template: '<div><slot /></div>' },
  'el-dialog': {
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'width'],
    emits: ['update:modelValue'],
  },
  'el-icon': { template: '<span><slot /></span>' },
}

// Stub child components
const stubs = {
  ...EP_STUBS,
  AppIcon: { template: '<span />', props: ['name', 'size'] },
  FilterTabs: FilterTabsStub,
  AppDialog: {
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'width', 'showFullscreenBtn'],
    emits: ['update:modelValue'],
  },
  AgentWorkflowTemplatePreviewDialog: {
    template: '<div />',
    props: ['modelValue', 'template'],
    emits: ['update:modelValue', 'use'],
  },
}

function mountView() {
  return mount(AgentWorkflowListView, {
    global: { stubs },
  })
}

describe('Template Try Button', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows try button for assistant category templates', async () => {
    const wrapper = mountView()

    // Switch to templates tab by clicking the tab button
    const templatesTab = wrapper.find('[data-tab="templates"]')
    await templatesTab.trigger('click')
    await wrapper.vm.$nextTick()

    // Find the template cards
    const templateCards = wrapper.findAll('[data-testid="workflow-template-card"]')
    expect(templateCards.length).toBeGreaterThan(0)

    // The intelligent-assistant template (category: 'assistant') should have a try button
    const assistantCard = templateCards.find((card) =>
      card.text().includes('智能助手问答'),
    )
    expect(assistantCard).toBeTruthy()

    // Should have 3 buttons: preview, use, and try
    const actionButtons = assistantCard!.findAll('button')
    expect(actionButtons.length).toBe(3)
  })

  it('shows try button for document category templates', async () => {
    const wrapper = mountView()

    // Switch to templates tab
    const templatesTab = wrapper.find('[data-tab="templates"]')
    await templatesTab.trigger('click')
    await wrapper.vm.$nextTick()

    // Find the document-summary template (category: 'document')
    const templateCards = wrapper.findAll('[data-testid="workflow-template-card"]')
    const docCard = templateCards.find((card) =>
      card.text().includes('文档摘要'),
    )
    expect(docCard).toBeTruthy()

    // Should have 3 buttons: preview, use, and try
    const actionButtons = docCard!.findAll('button')
    expect(actionButtons.length).toBe(3)
  })

  it('creates workflow and navigates to chat on try click', async () => {
    const createWorkflowMock = vi.mocked(api.createWorkflow)
    createWorkflowMock.mockResolvedValueOnce({
      id: 'demo-wf-123',
      name: '试用-智能助手问答',
    } as any)

    const wrapper = mountView()

    // Switch to templates tab
    const templatesTab = wrapper.find('[data-tab="templates"]')
    await templatesTab.trigger('click')
    await wrapper.vm.$nextTick()

    // Find the assistant template card and click the try button (3rd button)
    const templateCards = wrapper.findAll('[data-testid="workflow-template-card"]')
    const assistantCard = templateCards.find((card) =>
      card.text().includes('智能助手问答'),
    )
    const actionButtons = assistantCard!.findAll('button')
    // The try button is the 3rd one
    await actionButtons[2].trigger('click')
    await wrapper.vm.$nextTick()
    await vi.dynamicImportSettled()

    // Should call createWorkflow with correct params
    expect(createWorkflowMock).toHaveBeenCalledWith(
      '试用-智能助手问答',
      expect.any(String),
      'intelligent-assistant',
    )

    // Should navigate to chat with workflowId
    expect(routerPush).toHaveBeenCalledWith({
      name: 'chat',
      query: { workflowId: 'demo-wf-123' },
    })
  })

  it('handles try template API error gracefully', async () => {
    const createWorkflowMock = vi.mocked(api.createWorkflow)
    createWorkflowMock.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mountView()

    // Switch to templates tab
    const templatesTab = wrapper.find('[data-tab="templates"]')
    await templatesTab.trigger('click')
    await wrapper.vm.$nextTick()

    // Find the assistant template card and click the try button
    const templateCards = wrapper.findAll('[data-testid="workflow-template-card"]')
    const assistantCard = templateCards.find((card) =>
      card.text().includes('智能助手问答'),
    )
    const actionButtons = assistantCard!.findAll('button')
    await actionButtons[2].trigger('click')
    await wrapper.vm.$nextTick()
    await vi.dynamicImportSettled()

    // Should show error message
    const { message } = await import('@schema-platform/platform-shared/utils/message')
    expect(message.error).toHaveBeenCalledWith('Network error')
  })
})
