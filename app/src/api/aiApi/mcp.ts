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

export async function fetchMcpTools(): Promise<McpServerInfo[]> {
  return request<McpServerInfo[]>('/ai/mcp/tools', { raw: true })
}

export async function testMcpTool(
  server: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<McpTestResult> {
  return request<McpTestResult>('/ai/mcp/test', {
    method: 'POST',
    body: { server, tool, args },
    raw: true,
  })
}
