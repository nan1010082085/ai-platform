/**
 * Cordis 宿主：根 Context 单例，负责插件装载与生命周期。
 * 业务代码不直接 import cordis；本文件是适配层内部实现。
 */

import { Context } from '@deepseek-ai/cordis'
import { chatToolsPlugin } from './plugins/chat-tools'
import { nodeTypesPlugin } from './plugins/node-types'
import { renderersPlugin } from './plugins/renderers'
import { skillDefsPlugin } from './plugins/skill-defs'
import { builtinLayers, mergeLayers, type PartialLayers } from './config/layers'

let root: Context | null = null
let bootPromise: Promise<Context> | null = null

/**
 * 启动插件宿主（幂等）：内置层 + 可选覆盖层依次合并后装载插件。
 * 当前三个内置插件 apply 全为同步代码，装载同步完成（服务立即可用）；
 * 未来引入异步插件时再回到 await fiber 稳态。
 */
export async function startPluginHost(layers?: PartialLayers): Promise<Context> {
  if (bootPromise) return bootPromise
  const ctx = new Context()
  root = ctx
  const merged = mergeLayers(builtinLayers(), layers)
  ctx.plugin(chatToolsPlugin, merged.chatTools)
  ctx.plugin(nodeTypesPlugin)
  ctx.plugin(renderersPlugin)
  ctx.plugin(skillDefsPlugin)
  bootPromise = Promise.resolve(ctx)
  return bootPromise
}

/** 使用默认内置层启动（应用入口 / 测试通用） */
export async function ensurePluginHost(): Promise<Context> {
  return startPluginHost()
}

/** 停止并释放宿主（dispose 所有 fiber 效果：服务、监听器、定时器） */
export async function stopPluginHost(): Promise<void> {
  const ctx = root
  root = null
  bootPromise = null
  if (ctx) await ctx.fiber.dispose()
}

/** 同步获取宿主；未启动即报错（错误及时暴露，不做静默兜底） */
export function getPluginHost(): Context {
  if (!root) {
    throw new Error('[plugins] 宿主未启动：请先 await ensurePluginHost()')
  }
  return root
}

export function isPluginHostStarted(): boolean {
  return root !== null
}
