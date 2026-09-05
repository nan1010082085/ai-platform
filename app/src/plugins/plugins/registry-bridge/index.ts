/**
 * registry-bridge：Registry snapshot → Cordis Service 的唯一写入入口。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import type { PluginRegistrySnapshot } from '@/api/pluginApi'
import { registryToolsToDefs } from '../../registry-adapter'

export class RegistryBridgeService extends Service {
  private lastSnapshot: PluginRegistrySnapshot | null = null

  constructor(ctx: Context) {
    super(ctx, 'registryBridge')
  }

  /**
   * 将 snapshot 灌入能力 Service（overlay 语义）。
   * @param snapshot GET /plugins 快照
   */
  ingest(snapshot: PluginRegistrySnapshot): void {
    const toolDefs = registryToolsToDefs(snapshot.tools)
    this.ctx.chatTools.setOverlay(toolDefs)

    // 工具/专家改为节点内二级选择，不再平铺进 palette
    this.ctx.nodeTypes.setDynamic([])

    this.ctx.skillDefs.syncFromRegistry(snapshot.skills)

    this.ctx.mcpDefs.setOverlay(
      snapshot.mcpServers.map((s) => ({
        id: s.id,
        transport: s.transport,
        namespace: s.namespace,
        builtin: s.builtin,
        source: 'registry' as const,
      })),
    )

    this.lastSnapshot = {
      experts: [...snapshot.experts],
      skills: [...snapshot.skills],
      tools: [...snapshot.tools],
      mcpServers: [...snapshot.mcpServers],
      workflows: [...(snapshot.workflows ?? [])],
    }
    this.ctx.emit('registryBridge/changed')
  }

  /** 最近一次成功 ingest 的快照（供 UI 列表）；未 ingest 则为 null */
  getSnapshot(): PluginRegistrySnapshot | null {
    return this.lastSnapshot
      ? {
          experts: [...this.lastSnapshot.experts],
          skills: [...this.lastSnapshot.skills],
          tools: [...this.lastSnapshot.tools],
          mcpServers: [...this.lastSnapshot.mcpServers],
          workflows: [...(this.lastSnapshot.workflows ?? [])],
        }
      : null
  }
}

export const registryBridgePlugin = (ctx: Context): void => {
  new RegistryBridgeService(ctx)
}
