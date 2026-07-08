/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WorkflowInvokeInfo from '@/components/WorkflowInvokeInfo.vue'

// Mock API module
vi.mock('@/api/agentWorkflowApi', () => ({
  getWorkflow: vi.fn(),
  rotateWorkflowInvokeKey: vi.fn(),
}))

vi.mock('@schema-platform/platform-shared/components/common/AppIcon.vue', () => ({
  default: { template: '<span class="app-icon-stub" />', props: ['name', 'size'] },
}))

import { getWorkflow, rotateWorkflowInvokeKey } from '@/api/agentWorkflowApi'

const mockGetWorkflow = vi.mocked(getWorkflow)
const mockRotateWorkflowInvokeKey = vi.mocked(rotateWorkflowInvokeKey)

const sampleDetail = {
  id: 'wf-1',
  name: 'Test Workflow',
  slug: 'test-workflow',
  status: 'published' as const,
  version: '20260708000000',
  publishId: 'pub-1',
  publishedVersion: '20260708000000',
  hasRunningExecution: false,
  updatedAt: '2026-07-08T12:00:00Z',
  createdAt: '2026-07-01T12:00:00Z',
  draftGraph: { nodes: [], edges: [], entryNodeId: '' },
  invokeKeyMasked: 'sk-abc****xyz',
  invokePath: '/api/ai/workflows/invoke/test-workflow',
}

function mountComponent(workflowId = 'wf-1', workflowSlug?: string | null) {
  return mount(WorkflowInvokeInfo, {
    props: { workflowId, workflowSlug: workflowSlug ?? null },
  })
}

describe('WorkflowInvokeInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockGetWorkflow.mockResolvedValue(sampleDetail)
  })

  it('loads invoke info on mount', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-1')
    wrapper.unmount()
  })

  it('displays invoke URL', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('调用地址')
    expect(text).toContain('/api/ai/workflows/invoke/test-workflow')
    wrapper.unmount()
  })

  it('displays masked invoke key', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('调用密钥')
    expect(text).toContain('sk-abc****xyz')
    wrapper.unmount()
  })

  it('displays hint text', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('X-Workflow-Key')
    wrapper.unmount()
  })

  it('shows loading state initially', () => {
    mockGetWorkflow.mockReturnValue(new Promise(() => {})) // never resolves
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('加载中...')
    wrapper.unmount()
  })

  it('shows error state when API fails', async () => {
    mockGetWorkflow.mockRejectedValue(new Error('网络错误'))
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('网络错误')
    wrapper.unmount()
  })

  it('displays "未设置 slug" when invokePath is null', async () => {
    mockGetWorkflow.mockResolvedValue({
      ...sampleDetail,
      slug: null,
      invokePath: null,
    })
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('未设置 slug')
    wrapper.unmount()
  })

  it('displays "未生成" when invokeKeyMasked is null', async () => {
    mockGetWorkflow.mockResolvedValue({
      ...sampleDetail,
      invokeKeyMasked: null,
    })
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.text()).toContain('未生成')
    wrapper.unmount()
  })

  it('copies invoke URL to clipboard on copy button click', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: writeTextSpy } })

    const wrapper = mountComponent()
    await flushPromises()

    const copyButtons = wrapper.findAll('.invoke-copy-btn')
    expect(copyButtons.length).toBeGreaterThanOrEqual(1)

    await copyButtons[0].trigger('click')
    await flushPromises()

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/workflows/invoke/test-workflow'),
    )
    wrapper.unmount()
  })

  it('opens rotate key dialog on rotate button click', async () => {
    mockRotateWorkflowInvokeKey.mockResolvedValue({
      invokeKey: 'sk-new-full-key-12345',
      invokeKeyMasked: 'sk-new****12345',
      invokePath: '/api/ai/workflows/invoke/test-workflow',
    })

    const wrapper = mountComponent()
    await flushPromises()

    // The rotate button is the last .invoke-copy-btn (after the URL copy and key rotate)
    const copyButtons = wrapper.findAll('.invoke-copy-btn')
    // button 0 = URL copy, button 1 = rotate key
    expect(copyButtons.length).toBeGreaterThanOrEqual(2)
    const rotateBtn = copyButtons[1]

    await rotateBtn.trigger('click')
    await flushPromises()

    // Dialog is teleported to document.body
    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toContain('密钥已轮换')
    expect(bodyText).toContain('sk-new-full-key-12345')
    expect(bodyText).toContain('新密钥仅显示一次')
    wrapper.unmount()
  })

  it('copies rotated full key in dialog', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: writeTextSpy } })

    mockRotateWorkflowInvokeKey.mockResolvedValue({
      invokeKey: 'sk-full-key',
      invokeKeyMasked: 'sk-fu****ey',
      invokePath: '/api/ai/workflows/invoke/test-workflow',
    })

    const wrapper = mountComponent()
    await flushPromises()

    // Click rotate button (second .invoke-copy-btn)
    const copyButtons = wrapper.findAll('.invoke-copy-btn')
    await copyButtons[1].trigger('click')
    await flushPromises()

    // Find the copy button inside the rotate dialog (teleported to body)
    const dialogCopyBtn = document.body.querySelector('.rotate-key-row .invoke-copy-btn') as HTMLElement | null
    expect(dialogCopyBtn).toBeTruthy()
    dialogCopyBtn!.click()
    await flushPromises()

    expect(writeTextSpy).toHaveBeenCalledWith('sk-full-key')
    wrapper.unmount()
  })

  it('closes rotate dialog on close button click', async () => {
    mockRotateWorkflowInvokeKey.mockResolvedValue({
      invokeKey: 'sk-full-key',
      invokeKeyMasked: 'sk-fu****ey',
      invokePath: '/api/ai/workflows/invoke/test-workflow',
    })

    const wrapper = mountComponent()
    await flushPromises()

    // Click rotate button (second .invoke-copy-btn)
    const copyButtons = wrapper.findAll('.invoke-copy-btn')
    await copyButtons[1].trigger('click')
    await flushPromises()

    // Dialog is teleported to document.body
    expect(document.body.textContent).toContain('密钥已轮换')

    const closeBtn = document.body.querySelector('.rotate-close-btn') as HTMLElement | null
    expect(closeBtn).toBeTruthy()
    closeBtn!.click()
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).not.toContain('密钥已轮换')
    wrapper.unmount()
  })

  it('reloads when workflowId prop changes', async () => {
    const wrapper = mountComponent('wf-1')
    await flushPromises()
    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-1')

    await wrapper.setProps({ workflowId: 'wf-2' })
    await flushPromises()
    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-2')
    expect(mockGetWorkflow).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('displays error when rotate key API fails', async () => {
    mockRotateWorkflowInvokeKey.mockRejectedValue(new Error('权限不足'))

    const wrapper = mountComponent()
    await flushPromises()

    // Click rotate button (second .invoke-copy-btn)
    const copyButtons = wrapper.findAll('.invoke-copy-btn')
    await copyButtons[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('权限不足')
    wrapper.unmount()
  })
})
