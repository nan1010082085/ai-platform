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

import { ref, computed, getCurrentScope, onScopeDispose, type Ref } from 'vue'
import { ensurePluginHost, getPluginHost } from '@/plugins'
import type { ToolGroup, ToolDef } from '@/plugins'

export interface ToolLayerStats {
  builtin: number
  overlay: number
  patch: number
  total: number
  disabled: number
}

export interface CordisServiceStatus {
  name: string
  status: 'running' | 'error'
  details: string[]
}

export interface PluginRuntimeView {
  // Cordis 服务状态
  services: CordisServiceStatus[]
  // 分层统计
  toolLayers: ToolLayerStats
  /** 工具分类树（过滤禁用） */
  toolGroups: ToolGroup[]
  /** 启停管理用：含禁用项，禁用后仍可见可再开 */
  toolGroupsAll: ToolGroup[]
  nodeTypeBuiltin: number
  nodeTypeDynamic: number
  rendererCount: number
}

export function usePluginRuntime(): { view: Ref<PluginRuntimeView>; refresh: () => void } {
  ensurePluginHost()
  const host = getPluginHost()

  /** 探测单个服务可用性 */
  function probeService(name: string, probe: () => string[]): CordisServiceStatus {
    try {
      const details = probe()
      return { name, status: 'running', details }
    } catch (err) {
      return { name, status: 'error', details: [err instanceof Error ? err.message : String(err)] }
    }
  }

  function build(): PluginRuntimeView {
    const chatTools = host.chatTools
    const nodeTypes = host.nodeTypes
    const renderers = host.renderers

    const baseTools = chatTools.listBase()
    const overlayTools = chatTools.listOverlay()
    const patchTools = chatTools.listPatch()
    const allTools = chatTools.list()

    const nodeTypeList = nodeTypes.list()
    const nodeTypeDynamic = nodeTypes.listDynamic()
    const allRenderers = renderers.getAllRenderers()

    const disabledCount = chatTools.listDisabled().length
    return {
      services: [
        probeService('chatTools（工具注册表）', () => [
          `base: ${baseTools.length} 内置`,
          `overlay: ${overlayTools.length} registry`,
          `patch: ${patchTools.length} 本地覆盖`,
          `合并后: ${allTools.length} 工具`,
          `已禁用: ${disabledCount}`,
        ]),
        probeService('nodeTypes（节点类型）', () => [
          `内置: ${nodeTypeList.length - nodeTypeDynamic.length}`,
          `动态注册: ${nodeTypeDynamic.length}`,
          `合计: ${nodeTypeList.length}`,
        ]),
        probeService('renderers（渲染器）', () => [
          `已注册: ${allRenderers.length}`,
          `优先级范围: ${allRenderers[0]?.priority ?? 0} - ${allRenderers[allRenderers.length - 1]?.priority ?? 0}`,
        ]),
      ],
      toolLayers: {
        builtin: baseTools.length,
        overlay: overlayTools.length,
        patch: patchTools.length,
        total: allTools.length,
        disabled: disabledCount,
      },
      toolGroups: chatTools.groupedByCategory('all'),
      toolGroupsAll: chatTools.groupedByCategoryAll(),
      nodeTypeBuiltin: nodeTypeList.length - nodeTypeDynamic.length,
      nodeTypeDynamic: nodeTypeDynamic.length,
      rendererCount: allRenderers.length,
    }
  }

  const view = ref<PluginRuntimeView>(build())

  const refresh = () => {
    view.value = build()
  }

  // 服务变更事件桥接
  const rebuild = () => {
    view.value = build()
  }
  const offTools = host.on('chatTools/changed', () => { rebuild() })
  const offNodes = host.on('nodeTypes/changed', () => { rebuild() })
  const offRenderers = host.on('renderers/changed', () => { rebuild() })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      offTools()
      offNodes()
      offRenderers()
    })
  }

  return { view, refresh }
}
