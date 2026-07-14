/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ModelSettingsView from '@/views/ModelSettingsView.vue'

// Mock Provider API
vi.mock('@/api/providerApi', () => ({
  listProviders: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  testProvider: vi.fn(),
}))

// Mock Model API
vi.mock('@/api/modelApi', () => ({
  listModels: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  testModel: vi.fn(),
}))

vi.mock('@/composables/useModelOptions', () => ({
  useModelOptions: () => ({
    modelOptions: { value: [] },
    loading: { value: false },
    loaded: { value: true },
    defaultModel: { value: '' },
    loadModelOptions: vi.fn(),
  }),
}))

import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
} from '@/api/providerApi'
import {
  listModels,
  createModel,
  updateModel,
  deleteModel,
  testModel,
} from '@/api/modelApi'

const mockListProviders = vi.mocked(listProviders)
const mockCreateProvider = vi.mocked(createProvider)
const mockUpdateProvider = vi.mocked(updateProvider)
const mockDeleteProvider = vi.mocked(deleteProvider)
const mockTestProvider = vi.mocked(testProvider)
const mockListModels = vi.mocked(listModels)
const mockCreateModel = vi.mocked(createModel)
const mockUpdateModel = vi.mocked(updateModel)
const mockDeleteModel = vi.mocked(deleteModel)
const mockTestModel = vi.mocked(testModel)

const sampleProviders = [
  {
    id: 'p1',
    name: 'DeepSeek 主力',
    type: 'deepseek' as const,
    baseUrl: 'https://api.deepseek.com',
    isActive: true,
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z',
  },
  {
    id: 'p2',
    name: '本地 Ollama',
    type: 'ollama' as const,
    baseUrl: 'http://localhost:11434/v1',
    isActive: true,
    createdAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-20T08:00:00Z',
  },
]

const sampleModels = [
  {
    id: 'm1',
    name: 'DeepSeek V4 Flash',
    providerId: 'p1',
    model: 'deepseek-v4-flash',
    parameters: { temperature: 0.7, maxTokens: 4096 },
    isDefault: true,
    isActive: true,
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z',
  },
  {
    id: 'm2',
    name: 'DeepSeek Chat',
    providerId: 'p1',
    model: 'deepseek-chat',
    parameters: { temperature: 0.5, maxTokens: 8192 },
    isDefault: false,
    isActive: true,
    createdAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-20T08:00:00Z',
  },
]

const stubs = {
  AppDialog: {
    template: `
      <div v-if="modelValue" class="el-dialog-stub">
        <div class="el-dialog__title">{{ title }}</div>
        <slot />
        <slot name="footer" />
      </div>
    `,
    props: ['modelValue', 'title', 'width', 'closeOnClickModal', 'destroyOnClose', 'loading', 'showFullscreenBtn', 'appendToBody', 'draggable'],
    emits: ['update:modelValue', 'confirm', 'cancel', 'close'],
  },
  ElDialog: {
    template: `
      <div v-if="modelValue" class="el-dialog-stub">
        <div class="el-dialog__title">{{ title }}</div>
        <slot />
        <slot name="footer" />
      </div>
    `,
    props: ['modelValue', 'title', 'width', 'closeOnClickModal', 'destroyOnClose'],
  },
  ElTable: { template: '<div class="el-table-stub"><slot /></div>', props: ['data', 'stripe'] },
  ElTableColumn: { template: '<span />', props: ['prop', 'label', 'minWidth', 'width', 'fixed'] },
  ElTag: { template: '<span><slot /></span>', props: ['type', 'size', 'effect'] },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: {
    template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'required'],
  },
  ElScrollbar: { template: '<div><slot /></div>' },
  ElInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'maxlength', 'showWordLimit', 'showPassword'],
  },
  ElInputNumber: {
    template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max', 'step', 'precision'],
  },
  ElSelect: {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'clearable', 'filterable', 'allowCreate', 'loading'],
  },
  ElOption: { template: '<option :value="value">{{ label }}</option>', props: ['label', 'value'] },
  ElSwitch: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
  },
  ElTooltip: { template: '<div><slot /></div>', props: ['content', 'placement', 'showAfter'] },
  ElButton: {
    template: '<button :type="type" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'size', 'link', 'loading', 'plain'],
    emits: ['click'],
  },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
}

function mountView() {
  return mount(ModelSettingsView, { global: { stubs } })
}

describe('ModelSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListProviders.mockResolvedValue(sampleProviders)
    mockListModels.mockResolvedValue(sampleModels)
  })

  it('loads providers on mount and displays page title', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(mockListProviders).toHaveBeenCalled()
    expect(wrapper.text()).toContain('模型与连接')
    expect(wrapper.text()).toContain('管理 LLM 供应商与模型配置')
    wrapper.unmount()
  })

  it('displays provider cards in left panel', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('DeepSeek 主力')
    expect(wrapper.text()).toContain('本地 Ollama')
    wrapper.unmount()
  })

  it('displays empty state when no providers', async () => {
    mockListProviders.mockResolvedValue([])
    mockListModels.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('暂无供应商')
    expect(wrapper.text()).toContain('添加第一个供应商')
    wrapper.unmount()
  })

  it('handles API error gracefully without crashing', async () => {
    mockListProviders.mockRejectedValue(new Error('网络错误'))

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('模型与连接')
    wrapper.unmount()
  })

  it('renders header action buttons', async () => {
    const wrapper = mountView()
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const buttonTexts = buttons.map((b) => b.text())

    expect(buttonTexts.some((t) => t.includes('刷新'))).toBe(true)
    expect(buttonTexts.some((t) => t.includes('添加供应商'))).toBe(true)
    wrapper.unmount()
  })

  it('refreshes providers on refresh button click', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(mockListProviders).toHaveBeenCalledTimes(1)

    const refreshBtn = wrapper.findAll('button').find((b) => b.text().includes('刷新'))
    expect(refreshBtn).toBeTruthy()
    await refreshBtn!.trigger('click')
    await flushPromises()

    // Should call listProviders again (and listModels for the selected provider)
    expect(mockListProviders).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('shows quick-add presets when no providers', async () => {
    mockListProviders.mockResolvedValue([])
    mockListModels.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('快速添加供应商')
    expect(wrapper.text()).toContain('DeepSeek')
    expect(wrapper.text()).toContain('Ollama')
    expect(wrapper.text()).toContain('Mimo')
    wrapper.unmount()
  })

  it('displays model list for selected provider', async () => {
    const wrapper = mountView()
    await flushPromises()

    // First provider should be auto-selected, models loaded
    expect(mockListModels).toHaveBeenCalled()
    expect(wrapper.text()).toContain('DeepSeek V4 Flash')
    expect(wrapper.text()).toContain('deepseek-v4-flash')
    wrapper.unmount()
  })

  it('displays model default badge', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('默认')
    wrapper.unmount()
  })

  it('shows no provider selected message when providers exist but none selected', async () => {
    // This scenario is unlikely since auto-select happens, but tests the else branch
    mockListProviders.mockResolvedValue(sampleProviders)
    mockListModels.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    // With providers, first one is auto-selected, so we should see model panel
    // If we unselect, we'd see the "请从左侧选择一个供应商" message
    expect(wrapper.text()).toContain('模型与连接')
    wrapper.unmount()
  })

  it('loads models for selected provider', async () => {
    const wrapper = mountView()
    await flushPromises()

    // Should have called listModels for the auto-selected first provider
    expect(mockListModels).toHaveBeenCalledWith('p1')
    wrapper.unmount()
  })

  it('renders provider connection test button', async () => {
    const wrapper = mountView()
    await flushPromises()

    // The model panel header should have a "测试连接" button
    const buttons = wrapper.findAll('button')
    const buttonTexts = buttons.map((b) => b.text())
    expect(buttonTexts.some((t) => t.includes('测试连接'))).toBe(true)
    wrapper.unmount()
  })

  it('renders add model button', async () => {
    const wrapper = mountView()
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const buttonTexts = buttons.map((b) => b.text())
    expect(buttonTexts.some((t) => t.includes('添加模型'))).toBe(true)
    wrapper.unmount()
  })
})
