/**
 * 插件适配层唯一出口。
 *
 * 铁律（见 ai/docs/design/plugin-architecture-principles.md）：
 * - 业务代码只允许 `import ... from '@/plugins'`，禁止直接 import `@deepseek-ai/cordis`
 * - 插件（代码）静态装载；工具（数据）动态注册
 * - 配置分层：builtin < registry overlay < local patch
 */

import './types'

export {
  startPluginHost,
  ensurePluginHost,
  stopPluginHost,
  getPluginHost,
  isPluginHostStarted,
} from './host'
export { serviceState } from './bridge'
export {
  BUILT_IN_TOOLS,
  BUILT_IN_TOOL_NAMES,
  getBuiltInTool,
  getToolsByCategory,
  getGroupedBuiltInTools,
  resolveToolCategory,
} from './config/builtin'
export { builtinLayers, mergeLayers } from './config/layers'
export type { ChatToolsLayer, PluginHostLayers, PartialLayers } from './config/layers'
export { registryToolToDef, registryToolsToDefs } from './registry-adapter'
export type { PluginToolSummary as RegistryToolSummary } from '@/api/pluginApi'
export { platformSkillToDef, platformSkillsToDefs } from './skill-adapter'
export type { SkillDef, PlatformSkillSummary } from './skill-adapter'
export type { ToolCategory, ToolDef, ToolGroup } from './plugins/chat-tools/types'
export { TOOL_CATEGORY_LABELS, TOOL_CATEGORY_ORDER } from './plugins/chat-tools/types'
export {
  AGENT_PALETTE_ITEMS,
  AGENT_NODE_COLORS,
  getPaletteItem,
} from './config/nodeTypes'
export type { AgentPaletteItem } from './config/nodeTypes'
export type { MessageRenderer } from './plugins/renderers/types'
export type { ShellNavItem, ShellNavGroup, ShellSettingsGroup } from './plugins/shell-nav/types'
export type { ShellRouteContribution, ShellLayout } from './plugins/shell-routes/types'
export type { NodePanelEntry } from './plugins/node-panels/types'
export type { McpServerDef } from './plugins/mcp-defs/types'
export { exampleSupportPack } from './packs/example-support'
