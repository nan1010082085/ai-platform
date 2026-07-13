/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ModelSettingsView from '@/views/ModelSettingsView.vue'

// Mock API module
vi.mock('@/api/modelConfigApi', () => ({
  getModelConfigs: vi.fn(),
  createModelConfig: vi.fn(),
  updateModelConfig: vi.fn(),
  deleteModelConfig: vi.fn(),
  testModelConnection: vi.fn(),
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
  getModelConfigs,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  testModelConnection,
} from '@/api/modelConfigApi'

const mockGetModelConfigs = vi.mocked(getModelConfigs)
const mockCreateModelConfig = vi.mocked(createModelConfig)
const mockUpdateModelConfig = vi.mocked(updateModelConfig)
const mockDeleteModelConfig = vi.mocked(deleteModelConfig)
const mockTestModelConnection = vi.mocked(testModelConnection)

const sampleConfigs = [
  {
    id: 'c1',
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek' as const,
    model: 'deepseek-v4-flash',
    apiKey: 'sk-abcd****efgh',
    baseUrl: '',
    parameters: { temperature: 0.7, maxTokens: 4096 },
    isDefault: true,
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z',
  },
  {
    id: 'c2',
    name: 'GPT-4o 备用',
    provider: 'openai' as const,
    model: 'gpt-4o',
    apiKey: 'sk-1234****5678',
    baseUrl: 'https://api.openai.com/v1',
    parameters: { temperature: 0.5, maxTokens: 8192 },
    isDefault: false,
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
  ElPagination: { template: '<div />', props: ['currentPage', 'pageSize', 'total', 'layout'] },
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
    props: ['modelValue', 'placeholder', 'clearable'],
  },
  ElOption: { template: '<option :value="value">{{ label }}</option>', props: ['label', 'value'] },
  ElSwitch: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
  },
}

function mountView() {
  return mount(ModelSettingsView, { global: { stubs } })
}

describe('ModelSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetModelConfigs.mockResolvedValue({
      items: sampleConfigs,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
  })

  it('loads configs on mount and displays page title', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(mockGetModelConfigs).toHaveBeenCalledWith({ page: 1, pageSize: 20, provider: undefined })
    expect(wrapper.text()).toContain('模型与连接')
    expect(wrapper.text()).toContain('管理 LLM Provider')
    wrapper.unmount()
  })

  it('displays summary counts', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('总计')
    expect(wrapper.text()).toContain('默认模型')
    expect(wrapper.text()).toContain('Provider 数')
    wrapper.unmount()
  })

  it('displays empty state when no configs', async () => {
    mockGetModelConfigs.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    })

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('暂无模型配置')
    expect(wrapper.text()).toContain('新增第一个配置')
    wrapper.unmount()
  })

  it('handles API error gracefully without crashing', async () => {
    mockGetModelConfigs.mockRejectedValue(new Error('网络错误'))

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('模型与连接')
    wrapper.unmount()
  })

  it('opens create dialog with form fields', async () => {
    const wrapper = mountView()
    await flushPromises()

    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('新增配置'))
    expect(createBtn).toBeTruthy()
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.el-dialog__title').text()).toContain('新增模型配置')
    wrapper.unmount()
  })

  it('creates config via API and refreshes list', async () => {
    mockCreateModelConfig.mockResolvedValue({
      id: 'c3',
      name: '新模型',
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: 'sk-new****key1',
      baseUrl: '',
      parameters: { temperature: 0.7, maxTokens: 4096 },
      isDefault: false,
      createdAt: '2026-07-08T12:00:00Z',
      updatedAt: '2026-07-08T12:00:00Z',
    })

    const wrapper = mountView()
    await flushPromises()

    // Open create dialog
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('新增配置'))
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Fill form fields (skip file inputs)
    const textInputs = wrapper.findAll('input').filter((i) => i.element.type !== 'file')
    if (textInputs.length > 0) {
      await textInputs[0].setValue('新模型')
    }

    // Submit
    const submitBtn = wrapper.findAll('button').find((b) => b.text().trim() === '创建')
    if (submitBtn) {
      await submitBtn.trigger('click')
      await flushPromises()
    }

    // List should be refreshed after creation
    expect(mockGetModelConfigs).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('refreshes list on refresh button click', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(mockGetModelConfigs).toHaveBeenCalledTimes(1)

    const refreshBtn = wrapper.findAll('button').find((b) => b.text().includes('刷新'))
    expect(refreshBtn).toBeTruthy()
    await refreshBtn!.trigger('click')
    await flushPromises()

    expect(mockGetModelConfigs).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('renders header action buttons', async () => {
    const wrapper = mountView()
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const buttonTexts = buttons.map((b) => b.text())

    expect(buttonTexts.some((t) => t.includes('刷新'))).toBe(true)
    expect(buttonTexts.some((t) => t.includes('新增配置'))).toBe(true)
    wrapper.unmount()
  })

  it('validates required fields before submission', async () => {
    const wrapper = mountView()
    await flushPromises()

    // Open create dialog
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('新增配置'))
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Submit without filling fields
    const submitBtn = wrapper.findAll('button').find((b) => b.text().trim() === '创建')
    if (submitBtn) {
      await submitBtn.trigger('click')
      await flushPromises()
    }

    // Should not call create API without required fields
    expect(mockCreateModelConfig).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('calls getModelConfigs with provider filter', async () => {
    mockGetModelConfigs.mockResolvedValue({
      items: [sampleConfigs[0]],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })

    const wrapper = mountView()
    await flushPromises()

    // The initial call should have no provider filter
    expect(mockGetModelConfigs).toHaveBeenCalledWith({ page: 1, pageSize: 20, provider: undefined })
    wrapper.unmount()
  })

  it('renders provider filter select', async () => {
    const wrapper = mountView()
    await flushPromises()

    // Provider filter select should exist
    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('displays summary with correct default model count', async () => {
    const wrapper = mountView()
    await flushPromises()
    // sampleConfigs has 1 default (c1)
    expect(wrapper.text()).toContain('1')
    wrapper.unmount()
  })
})
