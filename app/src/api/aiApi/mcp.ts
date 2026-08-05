/**
 * MCP 管理 API：工具列表 + 工具调用测试
 */
import { request } from './base'

export interface McpToolInputSchema {
  type?: string
  properties?: Record<string, {
    type?: string
    description?: string
    default?: unknown
    enum?: string[]
    items?: Record<string, unknown>
  }>
  required?: string[]
}

export interface McpToolInfo {
  name: string
  description: string
  inputSchema: McpToolInputSchema
}

export interface McpServerInfo {
  id: string
  transport: string
  builtin?: string
  tools: McpToolInfo[]
  error?: string
}

export interface McpTestResult {
  tool: string
  server: string
  result: unknown
  isError: boolean
  duration: number
}

/**
 * 获取 MCP Server 工具列表。
 * 服务端返回标准信封 `{ success, data }`，由 request 解包为数组。
 */
export async function fetchMcpTools(): Promise<McpServerInfo[]> {
  return request<McpServerInfo[]>('/ai/mcp/tools')
}

/**
 * 调用指定 MCP 工具（测试用途）。
 */
export async function testMcpTool(
  server: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<McpTestResult> {
  return request<McpTestResult>('/ai/mcp/test', {
    method: 'POST',
    body: { server, tool, args },
  })
}
