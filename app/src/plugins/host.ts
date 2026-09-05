/**
 * Cordis 宿主：根 Context 单例，负责插件装载与生命周期。
 */

import { Context } from '@deepseek-ai/cordis'
import { chatToolsPlugin } from './plugins/chat-tools'
import { nodeTypesPlugin } from './plugins/node-types'
import { renderersPlugin } from './plugins/renderers'
import { skillDefsPlugin } from './plugins/skill-defs'
import { nodePanelsPlugin } from './plugins/node-panels'
import { shellNavPlugin } from './plugins/shell-nav'
import { shellRoutesPlugin } from './plugins/shell-routes'
import { mcpDefsPlugin } from './plugins/mcp-defs'
import { registryBridgePlugin } from './plugins/registry-bridge'
import { exampleSupportPackPlugin } from './packs/example-support'
import { builtinLayers, mergeLayers, type PartialLayers } from './config/layers'

let root: Context | null = null
let bootPromise: Promise<Context> | null = null

/**
 * 启动插件宿主（幂等）。
 * 顺序：能力 Service → 壳层 → mcpDefs → 官方 pack builtin → registryBridge → 路由模块。
 * @param layers 可选覆盖层
 */
export async function startPluginHost(layers?: PartialLayers): Promise<Context> {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    const ctx = new Context()
    root = ctx
    const merged = mergeLayers(builtinLayers(), layers)
    await ctx.plugin(chatToolsPlugin, merged.chatTools)
    await ctx.plugin(nodeTypesPlugin)
    await ctx.plugin(renderersPlugin)
    await ctx.plugin(skillDefsPlugin)
    await ctx.plugin(nodePanelsPlugin)
    await ctx.plugin(shellNavPlugin)
    await ctx.plugin(mcpDefsPlugin)
    // Pack 须 inject 能力 Service，否则 Cordis 拒绝属性访问
    await ctx.inject(['chatTools', 'skillDefs', 'mcpDefs'], (c) => {
      exampleSupportPackPlugin(c)
    })
    await ctx.plugin(registryBridgePlugin)
    await ctx.plugin(shellRoutesPlugin)
    return ctx
  })().catch((err) => {
    root = null
    bootPromise = null
    throw err
  })
  return bootPromise
}

/** 使用默认内置层启动 */
export async function ensurePluginHost(): Promise<Context> {
  return startPluginHost()
}

/** 停止并释放宿主 */
export async function stopPluginHost(): Promise<void> {
  const ctx = root
  root = null
  bootPromise = null
  if (ctx) await ctx.fiber.dispose()
}

/** 同步获取宿主；未启动即报错 */
export function getPluginHost(): Context {
  if (!root) {
    throw new Error('[plugins] 宿主未启动：请先 await ensurePluginHost()')
  }
  return root
}

export function isPluginHostStarted(): boolean {
  return root !== null
}
