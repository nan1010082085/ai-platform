/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ApiKeyManagerView from '@/views/ApiKeyManagerView.vue'

// Mock API module
vi.mock('@/api/apiKeyApi', () => ({
  createApiKey: vi.fn(),
  getApiKeys: vi.fn(),
  updateApiKeyStatus: vi.fn(),
  deleteApiKey: vi.fn(),
}))

import {
  createApiKey,
  getApiKeys,
  updateApiKeyStatus,
  deleteApiKey,
} from '@/api/apiKeyApi'

const mockCreateApiKey = vi.mocked(createApiKey)
const mockGetApiKeys = vi.mocked(getApiKeys)
const mockUpdateApiKeyStatus = vi.mocked(updateApiKeyStatus)
const mockDeleteApiKey = vi.mocked(deleteApiKey)

const sampleKeys = [
  {
    id: 'k1',
    name: '生产环境',
    key: 'sk-abcd****efgh',
    tenantId: 't1',
    createdBy: 'u1',
    permissions: [],
    status: 'active' as const,
    lastUsedAt: '2026-07-08T10:00:00Z',
    expiresAt: null,
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z',
  },
  {
    id: 'k2',
    name: '测试密钥',
    key: 'sk-1234****5678',
    tenantId: 't1',
    createdBy: 'u1',
    permissions: [],
    status: 'disabled' as const,
    lastUsedAt: null,
    expiresAt: null,
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
    props: ['modelValue', 'title', 'width', 'closeOnClickModal', 'destroyOnClose', 'loading', 'showFullscreenBtn', 'appendToBody', 'draggable', 'destroyOnClose'],
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
  ElTag: { template: '<span><slot /></span>', props: ['type', 'size'] },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: {
    template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'required'],
  },
  ElScrollbar: { template: '<div><slot /></div>' },
  ElInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'maxlength', 'showWordLimit'],
  },
}

function mountView() {
  return mount(ApiKeyManagerView, { global: { stubs } })
}

describe('ApiKeyManagerView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiKeys.mockResolvedValue({
      items: sampleKeys,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
  })

  it('loads keys on mount and displays page title', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(mockGetApiKeys).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(wrapper.text()).toContain('我的集成密钥')
    expect(wrapper.text()).toContain('创建和管理 API 密钥')
    wrapper.unmount()
  })

  it('displays summary counts', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('总计')
    expect(wrapper.text()).toContain('启用中')
    wrapper.unmount()
  })

  it('displays empty state when no keys', async () => {
    mockGetApiKeys.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    })

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('暂无集成密钥')
    expect(wrapper.text()).toContain('创建第一个密钥')
    wrapper.unmount()
  })

  it('handles API error gracefully without crashing', async () => {
    mockGetApiKeys.mockRejectedValue(new Error('网络错误'))

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('我的集成密钥')
    wrapper.unmount()
  })

  it('opens create dialog with form fields', async () => {
    const wrapper = mountView()
    await flushPromises()

    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('创建密钥'))
    expect(createBtn).toBeTruthy()
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.el-dialog__title').text()).toContain('创建集成密钥')
    expect(wrapper.find('.el-form-item label').text()).toContain('密钥名称')
    wrapper.unmount()
  })

  it('creates key and shows full key in reveal dialog', async () => {
    mockCreateApiKey.mockResolvedValue({
      id: 'k3',
      name: '新密钥',
      key: 'sk-abcdef1234567890abcdef1234567890',
      tenantId: 't1',
      createdBy: 'u1',
      permissions: [],
      status: 'active',
      lastUsedAt: null,
      expiresAt: null,
      createdAt: '2026-07-08T12:00:00Z',
      updatedAt: '2026-07-08T12:00:00Z',
    })

    const wrapper = mountView()
    await flushPromises()

    // Open create dialog
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('创建密钥'))
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Fill name
    const input = wrapper.find('input')
    await input.setValue('新密钥')

    // Submit
    const submitBtn = wrapper.findAll('button').find((b) => b.text().trim() === '创建')
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(mockCreateApiKey).toHaveBeenCalledWith({ name: '新密钥', permissions: ['workflow:execute'] })
    // Full key should be shown in reveal dialog
    expect(wrapper.text()).toContain('sk-abcdef1234567890abcdef1234567890')
    expect(wrapper.text()).toContain('此密钥仅展示一次')
    expect(wrapper.text()).toContain('我已保存，关闭')
    wrapper.unmount()
  })

  it('does not create key with empty name', async () => {
    const wrapper = mountView()
    await flushPromises()

    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('创建密钥'))
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Submit without filling name
    const submitBtn = wrapper.findAll('button').find((b) => b.text().trim() === '创建')
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(mockCreateApiKey).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('refreshes list on refresh button click', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(mockGetApiKeys).toHaveBeenCalledTimes(1)

    const refreshBtn = wrapper.findAll('button').find((b) => b.text().includes('刷新'))
    expect(refreshBtn).toBeTruthy()
    await refreshBtn!.trigger('click')
    await flushPromises()

    expect(mockGetApiKeys).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('renders header action buttons', async () => {
    const wrapper = mountView()
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const buttonTexts = buttons.map((b) => b.text())

    expect(buttonTexts.some((t) => t.includes('刷新'))).toBe(true)
    expect(buttonTexts.some((t) => t.includes('创建密钥'))).toBe(true)
    wrapper.unmount()
  })

  it('calls createApiKey with correct payload', async () => {
    mockCreateApiKey.mockResolvedValue({
      id: 'k4',
      name: '自定义名称',
      key: 'sk-test1234',
      tenantId: 't1',
      createdBy: 'u1',
      permissions: [],
      status: 'active',
      lastUsedAt: null,
      expiresAt: null,
      createdAt: '2026-07-08T12:00:00Z',
      updatedAt: '2026-07-08T12:00:00Z',
    })

    const wrapper = mountView()
    await flushPromises()

    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('创建密钥'))
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input')
    await input.setValue('自定义名称')

    const submitBtn = wrapper.findAll('button').find((b) => b.text().trim() === '创建')
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(mockCreateApiKey).toHaveBeenCalledTimes(1)
    expect(mockCreateApiKey).toHaveBeenCalledWith({ name: '自定义名称', permissions: ['workflow:execute'] })
    // After creation, list should be refreshed
    expect(mockGetApiKeys).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
