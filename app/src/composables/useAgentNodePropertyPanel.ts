/**
 * 节点属性面板：经 Cordis nodePanels Service resolve，不再维护中央 Map。
 */

import type { Component } from 'vue'
import DefaultNodePanel from '@/components/agent-workflow/property-panel/panels/DefaultNodePanel.vue'
import { getPluginHost } from '@/plugins'
import { getToolNodeTypeLabel } from '@/constants/toolNodeTypes'
import { getExpertNodeTypeLabel } from '@/constants/expertNodeTypes'

export const AGENT_NODE_TYPE_LABELS: Record<string, string> = {
  'manual-trigger': '手动触发',
  'webhook-trigger': 'Webhook 触发',
  'schedule-trigger': '定时触发',
  'agent-team': '智能团队',
  'approval-analyze': '审批建议',
  'flow-interact': '流程交互',
  'compliance-check': '合规检查',
  'module-assemble': '模块组装',
  'form-query': '表单查询',
  'anomaly-detect': '异常检测',
  'chart-generate': '图表生成',
  'document-parse': '文档解析',
  'vision-analyze': '图片视觉分析',
  'audio-transcribe': '音频转录',
  'video-analyze': '视频分析',
  'conversation-memory': '对话记忆',
  'memory-recall': '长程记忆检索',
  'memory-write': '长程记忆写入',
  'memory-extract': '长程记忆提取',
  'handoff': '会话交接',
  llm: 'LLM',
  'agent-intent': getExpertNodeTypeLabel('agent-intent') ?? '意图识别',
  tool: getToolNodeTypeLabel('tool') ?? '工具',
  expert: '插件专家',
  if: '条件分支',
  hitl: '人工确认',
  end: '结束',
  'image-generate': '图片生成',
  'video-generate': '视频生成',
  'ppt-generate': 'PPT 生成',
  'intent-router': '意图路由',
  summarizer: '多步总结',
  'requirement-analyzer': '需求分析',
  'task-planner': '任务规划',
  'task-chain': '任务链',
  'collaboration-router': '协作路由',
  'agent-loop': '智能体循环',
  'code-execute': '代码执行',
  'variable-set': '变量赋值',
  'switch': '多路分支',
}

/**
 * 属性面板解析（依赖插件宿主已启动）。
 */
export function useAgentNodePropertyPanel() {
  function getPanelComponent(nodeType: string): Component {
    return getPluginHost().nodePanels.resolve(nodeType) ?? DefaultNodePanel
  }

  function getNodeTypeLabel(nodeType: string): string {
    return AGENT_NODE_TYPE_LABELS[nodeType] ?? nodeType
  }

  return { getPanelComponent, getNodeTypeLabel }
}
