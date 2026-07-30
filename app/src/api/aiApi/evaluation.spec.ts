/**
 * evaluation.ts API 单测：评测数据集 CRUD + 评测运行。
 * mock ./base 的 request，验证调用参数（path/method/body）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./base', () => ({ request: requestMock }))

import {
  listEvalDatasets,
  createEvalDataset,
  updateEvalDataset,
  deleteEvalDataset,
  runEvaluation,
  listEvalRuns,
  getEvalRun,
} from './evaluation'

describe('evaluation API', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it('listEvalDatasets: GET /ai/eval/datasets', async () => {
    requestMock.mockResolvedValue([])
    await listEvalDatasets()
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/datasets')
  })

  it('createEvalDataset: POST', async () => {
    requestMock.mockResolvedValue({ id: 'd1' })
    await createEvalDataset({ name: '集1', testcases: [] })
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/datasets', {
      method: 'POST',
      body: { name: '集1', testcases: [] },
    })
  })

  it('updateEvalDataset: PUT /ai/eval/datasets/:id', async () => {
    requestMock.mockResolvedValue({ id: 'd1' })
    await updateEvalDataset('d1', { name: '改名' })
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/datasets/d1', {
      method: 'PUT',
      body: { name: '改名' },
    })
  })

  it('updateEvalDataset: id 编码特殊字符', async () => {
    requestMock.mockResolvedValue({})
    await updateEvalDataset('a/b', { name: 'x' })
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/datasets/a%2Fb', expect.any(Object))
  })

  it('deleteEvalDataset: DELETE', async () => {
    requestMock.mockResolvedValue({ deleted: true })
    await deleteEvalDataset('d1')
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/datasets/d1', { method: 'DELETE' })
  })

  it('runEvaluation: POST /ai/eval/runs', async () => {
    requestMock.mockResolvedValue({ id: 'r1' })
    await runEvaluation({ datasetId: 'd1', target: { type: 'workflow', id: 'wf-1' } })
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/runs', {
      method: 'POST',
      body: { datasetId: 'd1', target: { type: 'workflow', id: 'wf-1' } },
    })
  })

  it('listEvalRuns: GET', async () => {
    requestMock.mockResolvedValue([])
    await listEvalRuns()
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/runs')
  })

  it('getEvalRun: GET /ai/eval/runs/:id', async () => {
    requestMock.mockResolvedValue({ id: 'r1' })
    await getEvalRun('r1')
    expect(requestMock).toHaveBeenCalledWith('/ai/eval/runs/r1')
  })
})
