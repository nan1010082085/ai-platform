/**
 * usePluginRuntime — Cordis 运行时视图（PluginCenterView 的"运行时"tab 数据源）。
 *
 * 只读暴露三个服务的分层状态：
 * - chatTools：builtin / registry overlay / 前端 patch 三层清单与分类分组
 * - nodeTypes：内置目录 + 动态注册条目
 * - renderers：已注册渲染器清单
 *
 * 响应式桥接：订阅三个服务的变更事件，组件 scope 内自动退订。
 */

import { ref, getCurrentScope, onScopeDispose, type Ref } from 'vue'
import { ensurePluginHost, getPluginHost } from '@/plugins'
import type { ToolGroup } from '@/plugins'

export interface ToolLayerStats {
  builtin: number
  overlay: number
  patch: number
  total: number
}

export interface PluginRuntimeView {
  toolLayers: ToolLayerStats
  toolGroups: ToolGroup[]
  nodeTypeBuiltin: number
  nodeTypeDynamic: number
  rendererCount: number
}

export function usePluginRuntime(): { view: Ref<PluginRuntimeView> } {
  ensurePluginHost()
  const host = getPluginHost()

  function build(): PluginRuntimeView {
    const chatTools = host.chatTools
    return {
      toolLayers: {
        builtin: chatTools.listBase().length,
        overlay: chatTools.listOverlay().length,
        patch: chatTools.listPatch().length,
        total: chatTools.list().length,
      },
      toolGroups: chatTools.groupedByCategory('all'),
      nodeTypeBuiltin: host.nodeTypes.list().length - host.nodeTypes.listDynamic().length,
      nodeTypeDynamic: host.nodeTypes.listDynamic().length,
      rendererCount: host.renderers.getAllRenderers().length,
    }
  }

  const view = ref<PluginRuntimeView>(build())
  const refresh = () => {
    view.value = build()
  }
  const offTools = host.on('chatTools/changed', refresh)
  const offNodes = host.on('nodeTypes/changed', refresh)
  const offRenderers = host.on('renderers/changed', refresh)
  if (getCurrentScope()) {
    onScopeDispose(() => {
      offTools()
      offNodes()
      offRenderers()
    })
  }

  return { view }
}
