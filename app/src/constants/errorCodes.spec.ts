/**
 * errorCodes 单测：验证 code / message / status 三层映射 + 前缀兜底
 */
import { describe, it, expect } from 'vitest'
import { resolveErrorText, ERROR_CODE_TEXT, ERROR_MESSAGE_TEXT, HTTP_STATUS_TEXT } from './errorCodes'

describe('resolveErrorText', () => {
  // ── code 映射（最高优先级）──
  it('有 code 时返回 code 对应的中文', () => {
    expect(resolveErrorText({ code: 'invalid_api_key', message: 'whatever' })).toBe('API Key 无效或已失效')
    expect(resolveErrorText({ code: 'workflow_not_found' })).toBe('工作流不存在')
    expect(resolveErrorText({ code: 'not_found' })).toBe('资源不存在')
  })

  // ── message 精确映射 ──
  it('code 无映射时，message 精确匹配返回中文', () => {
    expect(resolveErrorText({ message: 'Workflow not found' })).toBe('工作流不存在')
    expect(resolveErrorText({ message: 'Invalid workflowId' })).toBe('工作流 ID 格式无效')
    expect(resolveErrorText({ message: 'Invalid workflow id' })).toBe('工作流 ID 格式无效')
    expect(resolveErrorText({ message: 'Invalid execution id' })).toBe('执行 ID 格式无效')
    expect(resolveErrorText({ message: 'Authentication required' })).toBe('请先登录')
    expect(resolveErrorText({ message: 'Execution not found or not cancellable' })).toBe('执行不存在或无法取消')
  })

  it('server 中文 message 原样返回', () => {
    expect(resolveErrorText({ message: '仅已发布工作流可轮换调用密钥' })).toBe('仅已发布工作流可轮换调用密钥')
  })

  // ── 前缀映射（动态拼接的 message）──
  it('"Invalid X" 前缀映射为 "X 格式无效"', () => {
    expect(resolveErrorText({ message: 'Invalid plugin id' })).toBe('plugin id 格式无效')
    expect(resolveErrorText({ message: 'Invalid dataset id' })).toBe('dataset id 格式无效')
    expect(resolveErrorText({ message: 'Invalid some new field' })).toBe('some new field 格式无效')
  })

  it('"X not found" 后缀映射为 "X 不存在"', () => {
    expect(resolveErrorText({ message: 'Tenant not found' })).toBe('Tenant 不存在')
    expect(resolveErrorText({ message: 'SomeResource not found.' })).toBe('SomeResource 不存在')
  })

  it('"X is required" 后缀映射为 "X 不能为空"', () => {
    expect(resolveErrorText({ message: 'title is required' })).toBe('title 不能为空')
    expect(resolveErrorText({ message: 'email is required' })).toBe('email 不能为空')
  })

  // ── 原始 message（无映射时原样返回）──
  it('message 不在映射中且不匹配前缀时原样返回', () => {
    expect(resolveErrorText({ message: 'some custom server message' })).toBe('some custom server message')
  })

  // ── HTTP status 兜底 ──
  it('无 code 无 message 时按 status 兜底', () => {
    expect(resolveErrorText({ status: 401 })).toBe('登录已过期，请重新登录')
    expect(resolveErrorText({ status: 404 })).toBe('资源不存在')
    expect(resolveErrorText({ status: 500 })).toBe('服务器内部错误，请稍后重试')
  })

  // ── fallback ──
  it('空对象返回 fallback', () => {
    expect(resolveErrorText({})).toBe('操作失败')
    expect(resolveErrorText(null)).toBe('操作失败')
    expect(resolveErrorText(undefined, '自定义')).toBe('自定义')
  })
})

describe('ERROR_MESSAGE_TEXT 覆盖 server 全部裸 message', () => {
  const serverMessages = [
    'Authentication required',
    'Workflow not found',
    'Execution not found',
    'Execution not found or not cancellable',
    'Execution not found or not waiting',
    'Flow not found',
    'Flow has no version',
    'Schema not found',
    'Document not found',
    'Conversation not found.',
    'Message not found.',
    'Model not found.',
    'Provider not found.',
    'Associated provider not found.',
    'Node not found',
    'Plugin not found',
    'Webhook not found',
    'Original file not found',
    'Proposal not found',
    'Dataset not found',
    'Version not found',
    'Version not found.',
    'Version not found in this conversation.',
    'Shared conversation not found.',
    'Run not found',
    'Prompt template not found',
    'Invalid workflow id',
    'Invalid execution id',
    'Invalid workflowId',
    'Invalid ID format.',
    'Invalid slugOrId',
    'Invalid providerId format.',
    'Invalid feedback type. Must be "positive" or "negative".',
    'Invalid layer',
    'content is required',
    'name is required',
    'file is required',
    'prompt is required',
    'query is required',
    'query parameter is required',
    'image or documentId is required',
    'datasetId is required',
    'versionId is required',
    'behaviors array is required',
    'schemaId, flowId, nodeId are required',
    'target.id is required',
    'variables object is required',
    'JSON body required',
    'templateId、name、graph 为必填',
    'title 和 content 必填',
    '缺少 graph 数据',
    'server and tool are required',
    'Only userTask nodes can bind schemas',
    'Cannot compare versions of different types (schema vs flow).',
    'Cannot delete built-in templates',
    'Cannot modify built-in templates. Create a copy instead.',
    '仅已发布工作流可轮换调用密钥',
    'Maximum 50 behaviors per batch',
    'type must be schema, flow, or widget',
    'API key is required for this provider.',
    'API key is required to list remote models.',
    'API key is required to sync models.',
    'Failed to start workflow',
    'Failed to update feedback.',
    'Failed to generate action proposals',
    'Webhook execution failed',
    'v1 and v2 query parameters are required',
  ]

  it.each(serverMessages)('server message "%s" 有中文映射', (msg) => {
    expect(ERROR_MESSAGE_TEXT[msg]).toBeDefined()
    expect(typeof ERROR_MESSAGE_TEXT[msg]).toBe('string')
    expect(ERROR_MESSAGE_TEXT[msg].length).toBeGreaterThan(0)
  })

  it('所有映射值为非空字符串', () => {
    for (const [key, value] of Object.entries(ERROR_MESSAGE_TEXT)) {
      expect(value).toBeTruthy()
      expect(typeof value).toBe('string')
    }
  })
})
