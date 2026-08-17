/**
 * 配置分层：builtin（内置 bundle）< overlay（registry / 租户）< local patch。
 * 与 DSH 的 bundle -> patch 语义一致；合并规则为"同名后层覆盖前层"。
 */

import type { ToolDef } from '../plugins/chat-tools/types'
import { BUILT_IN_TOOLS } from './builtin'

export interface ChatToolsLayer {
  tools: ToolDef[]
}

export interface PluginHostLayers {
  chatTools: ChatToolsLayer
}

export interface PartialLayers {
  chatTools?: ChatToolsLayer
}

/** 内置层配置（随代码打包） */
export function builtinLayers(): PluginHostLayers {
  return { chatTools: { tools: BUILT_IN_TOOLS } }
}

/**
 * 合并配置层：base 为内置层，override 依次覆盖（同名 last-wins）。
 * 仅用于 boot 期静态配置；运行时 overlay/patch 经 chatTools.setOverlay/setPatch 动态写入。
 */
export function mergeLayers(base: PluginHostLayers, override?: PartialLayers): PluginHostLayers {
  if (!override) return base
  return {
    chatTools: mergeToolLayers(base.chatTools, override.chatTools),
  }
}

function mergeToolLayers(base: ChatToolsLayer, override?: ChatToolsLayer): ChatToolsLayer {
  if (!override?.tools?.length) return base
  const byName = new Map(base.tools.map((tool) => [tool.name, tool]))
  for (const tool of override.tools) byName.set(tool.name, tool)
  return { tools: [...byName.values()] }
}
