/**
 * Cordis Context/Events 类型扩展（适配层内部）。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ChatToolsService } from './plugins/chat-tools'
import type { NodeTypesService } from './plugins/node-types'
import type { RenderersService } from './plugins/renderers'
import type { SkillDefsService } from './plugins/skill-defs'
import type { NodePanelsService } from './plugins/node-panels'
import type { ShellNavService } from './plugins/shell-nav'
import type { ShellRoutesService } from './plugins/shell-routes'
import type { RegistryBridgeService } from './plugins/registry-bridge'
import type { McpDefsService } from './plugins/mcp-defs'

declare module '@deepseek-ai/cordis' {
  interface Context {
    chatTools: ChatToolsService
    nodeTypes: NodeTypesService
    renderers: RenderersService
    skillDefs: SkillDefsService
    nodePanels: NodePanelsService
    shellNav: ShellNavService
    shellRoutes: ShellRoutesService
    registryBridge: RegistryBridgeService
    mcpDefs: McpDefsService
  }

  interface Events {
    'chatTools/changed': void
    'nodeTypes/changed': void
    'renderers/changed': void
    'skillDefs/changed': void
    'nodePanels/changed': void
    'shellNav/changed': void
    'shellRoutes/changed': void
    'registryBridge/changed': void
    'mcpDefs/changed': void
  }
}

export type PluginHostContext = Context
