/**
 * usePluginRuntime — Cordis 运行时视图（PluginCenterView 的"运行时"tab 数据源）。
 *
 * 只读暴露三个服务的分层状态 + harness 连接健康：
 * - chatTools：builtin / registry overlay / 前端 patch 三层清单与分类分组
 * - nodeTypes：内置目录 + 动态注册条目
 * - renderers：已注册渲染器清单
 * - harness：服务可达性 / 版本 / 网关统计
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
}

export interface CordisServiceStatus {
  name: string
  status: 'running' | 'error'
  details: string[]
}

export interface HarnessStatus {
  reachable: boolean
  gateway: Record<string, unknown> | null
  error: string | null
}

export interface PluginRuntimeView {
  // Cordis 服务状态
  services: CordisServiceStatus[]
  // 分层统计
  toolLayers: ToolLayerStats
  toolGroups: ToolGroup[]
  nodeTypeBuiltin: number
  nodeTypeDynamic: number
  rendererCount: number
  // harness 连接
  harness: HarnessStatus
}

/** 探测 harness 可达性（GET /healthz） */
async function checkHarnessHealth(): Promise<HarnessStatus> {
  const base = import.meta.env.VITE_HARNESS_BASE_URL as string | undefined ?? '/schema-platform/harness'
  try {
    const resp = await fetch(`${base}/healthz`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!resp.ok) return { reachable: false, gateway: null, error: `HTTP ${resp.status}` }
    const data = await resp.json()
    return { reachable: true, gateway: data.gateway ?? null, error: null }
  } catch (err) {
    return { reachable: false, gateway: null, error: err instanceof Error ? err.message : String(err) }
  }
}

export function usePluginRuntime(): { view: Ref<PluginRuntimeView>; refresh: () => void } {
  ensurePluginHost()
  const host = getPluginHost()

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

    return {
      services: [
        {
          name: 'chatTools（工具注册表）',
          status: 'running',
          details: [
            `base: ${baseTools.length} 内置`,
            `overlay: ${overlayTools.length} registry`,
            `patch: ${patchTools.length} 本地覆盖`,
            `合并后: ${allTools.length} 工具`,
          ],
        },
        {
          name: 'nodeTypes（节点类型）',
          status: 'running',
          details: [
            `内置: ${nodeTypeList.length - nodeTypeDynamic.length}`,
            `动态注册: ${nodeTypeDynamic.length}`,
            `合计: ${nodeTypeList.length}`,
          ],
        },
        {
          name: 'renderers（渲染器）',
          status: 'running',
          details: [
            `已注册: ${allRenderers.length}`,
            `优先级范围: ${allRenderers[0]?.priority ?? 0} - ${allRenderers[allRenderers.length - 1]?.priority ?? 0}`,
          ],
        },
      ],
      toolLayers: {
        builtin: baseTools.length,
        overlay: overlayTools.length,
        patch: patchTools.length,
        total: allTools.length,
      },
      toolGroups: chatTools.groupedByCategory('all'),
      nodeTypeBuiltin: nodeTypeList.length - nodeTypeDynamic.length,
      nodeTypeDynamic: nodeTypeDynamic.length,
      rendererCount: allRenderers.length,
      harness: { reachable: false, gateway: null, error: null }, // 异步刷新
    }
  }

  const view = ref<PluginRuntimeView>(build())

  const refresh = async () => {
    view.value = build()
    view.value.harness = await checkHarnessHealth()
  }

  // 服务变更事件桥接
  const offTools = host.on('chatTools/changed', () => { view.value = build() })
  const offNodes = host.on('nodeTypes/changed', () => { view.value = build() })
  const offRenderers = host.on('renderers/changed', () => { view.value = build() })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      offTools()
      offNodes()
      offRenderers()
    })
  }

  return { view, refresh }
}
