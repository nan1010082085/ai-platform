/**
 * mcp.ts API 单测：MCP 工具列表 / 调用测试。
 *
 * 服务端 `/ai/mcp/*` 使用标准 `{ success, data }` 信封，
 * 前端必须走 request 默认解包，禁止 raw:true（否则会把信封对象当成数组，触发 .find is not a function）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./base', () => ({ request: requestMock }))

import { fetchMcpTools, testMcpTool } from './mcp'

describe('mcp API', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it('fetchMcpTools: GET /ai/mcp/tools，不解包旁路（无 raw）', async () => {
    const servers = [{ id: 'rag', transport: 'inmemory', tools: [] }]
    requestMock.mockResolvedValue(servers)

    const result = await fetchMcpTools()

    expect(result).toEqual(servers)
    expect(requestMock).toHaveBeenCalledWith('/ai/mcp/tools')
    const opts = requestMock.mock.calls[0]?.[1]
    expect(opts?.raw).toBeUndefined()
  })

  it('testMcpTool: POST /ai/mcp/test，不解包旁路（无 raw）', async () => {
    const payload = {
      tool: 'search',
      server: 'rag',
      result: { hits: [] },
      isError: false,
      duration: 12,
    }
    requestMock.mockResolvedValue(payload)

    const result = await testMcpTool('rag', 'search', { q: '表单' })

    expect(result).toEqual(payload)
    expect(requestMock).toHaveBeenCalledWith('/ai/mcp/test', {
      method: 'POST',
      body: { server: 'rag', tool: 'search', args: { q: '表单' } },
    })
    const opts = requestMock.mock.calls[0]?.[1]
    expect(opts?.raw).toBeUndefined()
  })
})
