/**
 * MCP 服务器元数据（前端仅声明/展示，连接在 server）。
 */

export interface McpServerDef {
  id: string
  transport: string
  namespace?: string
  builtin?: string
  /** 来源：pack builtin / registry overlay */
  source?: 'builtin' | 'registry'
}
