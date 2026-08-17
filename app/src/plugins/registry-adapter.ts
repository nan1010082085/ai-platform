/**
 * Registry 快照 -> chatTools overlay 层适配。
 *
 * 服务端 registry 快照已合并内置 + 租户 overlay + 服务端本地层（X-Tenant-Id 维度），
 * 前端只做最后一跳映射：补充内置回退（argsHint / category）与来源标记。
 *
 * 类型复用 pluginApi.ts 的 PluginToolSummary（与 PluginCenter 同源），不做重复定义。
 */

import { getToolDisplayLabel } from '@schema-platform/platform-shared/ai/toolNames'
import type { PluginToolSummary } from '@/api/pluginApi'
import type { ToolCategory, ToolDef } from './plugins/chat-tools/types'
import { TOOL_CATEGORY_LABELS } from './plugins/chat-tools/types'
import { getBuiltInTool, resolveToolCategory } from './config/builtin'

export function registryToolToDef(tool: PluginToolSummary): ToolDef {
  const builtin = getBuiltInTool(tool.name)
  const category = (tool.category as ToolCategory | undefined)
    ?? builtin?.category
    ?? resolveToolCategory(tool.name)
    ?? (tool.kind === 'graph' ? 'langgraph' : tool.kind === 'http' ? 'workflow' : undefined)
  return {
    name: tool.name,
    label: tool.label ?? builtin?.label ?? getToolDisplayLabel(tool.name),
    description: builtin?.description ?? tool.description ?? TOOL_CATEGORY_LABELS[category ?? 'langgraph'] ?? tool.name,
    argsHint: tool.argsHint ?? builtin?.argsHint ?? '{}',
    category: category ?? 'langgraph',
    source: tool.source ?? 'registry',
  }
}

export function registryToolsToDefs(tools: PluginToolSummary[]): ToolDef[] {
  return tools.map(registryToolToDef)
}
