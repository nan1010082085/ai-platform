/**
 * 官方 Pack 静态适配器：example.support
 * 写入 Cordis builtin 层；租户/市场包仍走 registry → bridge overlay。
 * 字段对齐 server/config/plugins/packs/example.support（前端精简视图）。
 */

import type { Context } from '@deepseek-ai/cordis'
import { registryToolsToDefs } from '../../registry-adapter'
import type { PluginToolSummary } from '@/api/pluginApi'
import type { SkillDef } from '../../skill-adapter'

const PACK_TOOLS: PluginToolSummary[] = [
  {
    name: 'kb__search',
    kind: 'mcp',
    source: 'example.external-kb',
    label: '知识库检索',
    argsHint: '{"query":"{{$input.message}}","limit":5}',
  },
]

/** 与 server pack 文件名一致；含点号，不经 platformSkillToDef kebab 校验 */
const PACK_SKILL: SkillDef = {
  name: 'example.support-tone',
  description: '客服语气',
  userInvocable: true,
  tools: [],
}

/**
 * 装载 example.support 到 builtin 层（同名项可被 registry overlay 覆盖）。
 * @param ctx Cordis Context
 */
export function exampleSupportPackPlugin(ctx: Context): void {
  const toolDefs = registryToolsToDefs(PACK_TOOLS)
  ctx.chatTools.setBase([...ctx.chatTools.listBase(), ...toolDefs])
  ctx.skillDefs.setBase([PACK_SKILL])
  ctx.mcpDefs.setBase([
    {
      id: 'example.external-kb',
      transport: 'sse',
      namespace: 'kb__',
      source: 'builtin',
    },
  ])
}

export const exampleSupportPack = {
  id: 'example.support',
  plugin: exampleSupportPackPlugin,
}
