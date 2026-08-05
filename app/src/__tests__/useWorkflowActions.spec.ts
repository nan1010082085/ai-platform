/**
 * useWorkflowActions：列表页删除/发布必须接收 string id（与模板 @click="onDelete(item.id)" 对齐）
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn().mockResolvedValue('confirm'),
  },
}))

vi.mock('@schema-platform/platform-shared/utils/message', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/utils/telemetry', () => ({
  trackAi: vi.fn(),
  AI_TELEMETRY_EVENTS: {
    TEMPLATE_SELECT: 'template_select',
    WORKFLOW_EXPORT: 'workflow_export',
    WORKFLOW_IMPORT: 'workflow_import',
    WORKFLOW_PUBLISH: 'workflow_publish',
  },
  reportAiError: vi.fn(),
}))

vi.mock('@/api/agentWorkflowApi', () => ({
  listWorkflows: vi.fn().mockResolvedValue([]),
  deleteWorkflow: vi.fn().mockResolvedValue({ deleted: true }),
  publishWorkflow: vi.fn().mockResolvedValue({ version: '20260805120000' }),
  createWorkflow: vi.fn(),
  exportWorkflow: vi.fn(),
  importWorkflow: vi.fn(),
}))

import { ElMessageBox } from 'element-plus'
import { deleteWorkflow, publishWorkflow } from '@/api/agentWorkflowApi'
import { useWorkflowActions } from '@/composables/useWorkflowActions'

const mockDelete = vi.mocked(deleteWorkflow)
const mockPublish = vi.mocked(publishWorkflow)
const mockConfirm = vi.mocked(ElMessageBox.confirm)

describe('useWorkflowActions onDelete / onPublish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue('confirm' as never)
  })

  it('onDelete 以 string id 调用 deleteWorkflow（非 wf.id）', async () => {
    const { onDelete } = useWorkflowActions()
    await onDelete('507f1f77bcf86cd799439011')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
    expect(mockDelete).not.toHaveBeenCalledWith(undefined)
  })

  it('onDelete 取消确认时不发删除请求', async () => {
    mockConfirm.mockRejectedValueOnce('cancel')
    const { onDelete } = useWorkflowActions()
    await onDelete('507f1f77bcf86cd799439011')
    await flushPromises()

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('onPublish 以 string id 调用 publishWorkflow（非 wf.id）', async () => {
    const { onPublish } = useWorkflowActions()
    await onPublish('507f1f77bcf86cd799439012')
    await flushPromises()

    expect(mockPublish).toHaveBeenCalledWith('507f1f77bcf86cd799439012')
    expect(mockPublish).not.toHaveBeenCalledWith(undefined)
  })
})
