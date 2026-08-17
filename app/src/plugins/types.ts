/**
 * Cordis Context/Events 类型扩展（适配层内部）。
 * 新增扩展点时在此登记服务与事件声明。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ChatToolsService } from './plugins/chat-tools'
import type { NodeTypesService } from './plugins/node-types'
import type { RenderersService } from './plugins/renderers'

declare module '@deepseek-ai/cordis' {
  interface Context {
    chatTools: ChatToolsService
    nodeTypes: NodeTypesService
    renderers: RenderersService
  }

  interface Events {
    'chatTools/changed': void
    'nodeTypes/changed': void
    'renderers/changed': void
  }
}

export type PluginHostContext = Context
