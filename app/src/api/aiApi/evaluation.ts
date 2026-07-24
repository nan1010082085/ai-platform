/**
 * 评测体系 API：测试集 CRUD、评测运行、结果查询
 */
import type {
  EvaluationDataset,
  EvaluationRun,
  EvaluationTestcase,
  JudgeType,
} from '@/types'
import { request } from './base'

// ---- Datasets ----

export interface EvaluationDatasetInput {
  name: string
  description?: string
  testcases?: EvaluationTestcase[]
}

export async function listEvalDatasets(): Promise<EvaluationDataset[]> {
  return request<EvaluationDataset[]>('/ai/eval/datasets')
}

export async function createEvalDataset(data: EvaluationDatasetInput): Promise<EvaluationDataset> {
  return request<EvaluationDataset>('/ai/eval/datasets', { method: 'POST', body: data })
}

export async function updateEvalDataset(
  id: string,
  data: Partial<EvaluationDatasetInput>,
): Promise<EvaluationDataset> {
  return request<EvaluationDataset>(`/ai/eval/datasets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteEvalDataset(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/ai/eval/datasets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ---- Runs ----

export interface RunEvaluationInput {
  datasetId: string
  target: { type: 'workflow' | 'agent'; id: string }
  judgeMethods?: JudgeType[]
}

export async function runEvaluation(input: RunEvaluationInput): Promise<EvaluationRun> {
  return request<EvaluationRun>('/ai/eval/runs', { method: 'POST', body: input })
}

export async function listEvalRuns(): Promise<EvaluationRun[]> {
  return request<EvaluationRun[]>('/ai/eval/runs')
}

export async function getEvalRun(id: string): Promise<EvaluationRun> {
  return request<EvaluationRun>(`/ai/eval/runs/${encodeURIComponent(id)}`)
}
