/**
 * workflowTemplate.ts API 单测：模板 CRUD + 导入导出。
 * mock ./base 的 request，验证调用参数（path/method/body/query 拼接）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./base', () => ({ request: requestMock }))

import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  exportTemplate,
  importTemplate,
} from './workflowTemplate'

describe('workflowTemplate API', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it('listTemplates: 无参数 GET /ai/workflow-templates', async () => {
    requestMock.mockResolvedValue([])
    await listTemplates()
    expect(requestMock).toHaveBeenCalledWith('/ai/workflow-templates')
  })

  it('listTemplates: category+search+builtinOnly 拼接 query', async () => {
    requestMock.mockResolvedValue([])
    await listTemplates({ category: 'hr', search: '简历', builtinOnly: true })
    const path = requestMock.mock.calls[0][0] as string
    expect(path.startsWith('/ai/workflow-templates?')).toBe(true)
    expect(path).toContain('category=hr')
    expect(path).toContain('search=' + encodeURIComponent('简历'))
    expect(path).toContain('builtinOnly=true')
  })

  it('listTemplates: 仅 builtinOnly，不拼 category/search', async () => {
    requestMock.mockResolvedValue([])
    await listTemplates({ builtinOnly: true })
    const path = requestMock.mock.calls[0][0] as string
    expect(path).toContain('builtinOnly=true')
    expect(path).not.toContain('category=')
    expect(path).not.toContain('search=')
  })

  it('getTemplate: GET /ai/workflow-templates/:id', async () => {
    requestMock.mockResolvedValue({})
    await getTemplate('tpl-1')
    expect(requestMock).toHaveBeenCalledWith('/ai/workflow-templates/tpl-1')
  })

  it('createTemplate: POST', async () => {
    requestMock.mockResolvedValue({})
    await createTemplate({ templateId: 't1', name: '模板1', graph: {} })
    expect(requestMock).toHaveBeenCalledWith('/ai/workflow-templates', {
      method: 'POST',
      body: { templateId: 't1', name: '模板1', graph: {} },
    })
  })

  it('updateTemplate: PUT', async () => {
    requestMock.mockResolvedValue({})
    await updateTemplate('t1', { name: '改名' })
    expect(requestMock).toHaveBeenCalledWith('/ai/workflow-templates/t1', {
      method: 'PUT',
      body: { name: '改名' },
    })
  })

  it('deleteTemplate: DELETE', async () => {
    requestMock.mockResolvedValue({ deleted: true })
    await deleteTemplate('t1')
    expect(requestMock).toHaveBeenCalledWith('/ai/workflow-templates/t1', { method: 'DELETE' })
  })

  it('exportTemplate: GET /export', async () => {
    requestMock.mockResolvedValue({ templateId: 't1', version: 1 })
    await exportTemplate('t1')
    expect(requestMock).toHaveBeenCalledWith('/ai/workflow-templates/t1/export')
  })

  it('importTemplate: POST /import', async () => {
    requestMock.mockResolvedValue({})
    await importTemplate({ templateId: 't2', name: '导入', graph: {} })
    expect(requestMock).toHaveBeenCalledWith('/ai/workflow-templates/import', {
      method: 'POST',
      body: { templateId: 't2', name: '导入', graph: {} },
    })
  })
})
