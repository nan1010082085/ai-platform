/**
 * useSmartSuggestions — 智能建议 Composable
 *
 * 监听聊天上下文变化（新消息、Schema 更新、Flow 更新），
 * 防抖后生成智能建议，并管理建议的采纳/忽略状态。
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { AIMessage, Widget, FlowGraph } from '@/types'

/** 建议类型 */
export type SuggestionType = 'action' | 'optimization' | 'reference'

/** 建议优先级 */
export type SuggestionPriority = 'high' | 'medium' | 'low'

/** 建议项 */
export interface SuggestionItem {
  id: string
  type: SuggestionType
  title: string
  description: string
  priority: SuggestionPriority
  targetId?: string
  targetName?: string
}

/** 上下文快照，用于检测变化 */
interface ContextSnapshot {
  messageCount: number
  lastMessageContent: string
  lastMessageRole: string
  schemaLength: number
  flowNodeCount: number
}

/** 生成建议 ID */
let suggestionCounter = 0
function nextSuggestionId(): string {
  return `sug_${Date.now()}_${++suggestionCounter}`
}

/** 从消息中提取建议 */
function extractSuggestionsFromMessages(
  messages: AIMessage[],
  currentSchema: Widget[] | null,
  currentFlow: FlowGraph | null,
): SuggestionItem[] {
  const suggestions: SuggestionItem[] = []
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.status === 'received')
  if (!lastAssistant) return suggestions

  // 基于 Schema 生成建议
  if (currentSchema && currentSchema.length > 0) {
    // 检查是否有字段缺少验证规则
    const fieldsWithoutValidation = currentSchema.filter(
      (w) => !w.rules || (Array.isArray(w.rules) && w.rules.length === 0),
    )
    if (fieldsWithoutValidation.length > 0) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'optimization',
        title: '添加验证规则',
        description: `${fieldsWithoutValidation.length} 个字段缺少验证规则，建议为必填字段添加校验`,
        priority: 'high',
        targetName: fieldsWithoutValidation.map((w) => w.label ?? w.field ?? w.type).join(', '),
      })
    }

    // 检查 Schema 规模是否较大
    if (currentSchema.length >= 8) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'optimization',
        title: '拆分为分步表单',
        description: `当前表单包含 ${currentSchema.length} 个字段，建议使用分步表单提升用户体验`,
        priority: 'medium',
      })
    }

    // 检查是否有重复字段名
    const fieldNames = currentSchema.map((w) => w.field).filter(Boolean)
    const duplicates = fieldNames.filter((name, i) => fieldNames.indexOf(name) !== i)
    if (duplicates.length > 0) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'action',
        title: '修复重复字段',
        description: `检测到重复字段名：${[...new Set(duplicates)].join(', ')}`,
        priority: 'high',
      })
    }
  }

  // 基于 Flow 生成建议
  if (currentFlow && currentFlow.nodes.length > 0) {
    const startNodes = currentFlow.nodes.filter((n) => n.data.bpmnType === 'startEvent')
    const endNodes = currentFlow.nodes.filter((n) => n.data.bpmnType === 'endEvent')

    if (startNodes.length === 0) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'action',
        title: '添加开始节点',
        description: '流程缺少开始节点，无法正常执行',
        priority: 'high',
      })
    }

    if (endNodes.length === 0) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'action',
        title: '添加结束节点',
        description: '流程缺少结束节点，建议补充以确保流程完整性',
        priority: 'high',
      })
    }

    // 检查是否有孤立节点（无入边也无出边）
    const connectedNodeIds = new Set<string>()
    for (const edge of currentFlow.edges) {
      connectedNodeIds.add(edge.source.cell)
      connectedNodeIds.add(edge.target.cell)
    }
    const orphanNodes = currentFlow.nodes.filter(
      (n) => n.data.bpmnType !== 'startEvent' && n.data.bpmnType !== 'endEvent' && !connectedNodeIds.has(n.id),
    )
    if (orphanNodes.length > 0) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'optimization',
        title: '处理孤立节点',
        description: `${orphanNodes.length} 个节点未连接到流程中`,
        priority: 'medium',
        targetName: orphanNodes.map((n) => n.data.label ?? n.id).join(', '),
      })
    }

    if (currentFlow.nodes.length >= 10) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'reference',
        title: '考虑使用子流程',
        description: `流程包含 ${currentFlow.nodes.length} 个节点，建议拆分为子流程提高可维护性`,
        priority: 'low',
      })
    }
  }

  // 基于助手消息内容的建议
  if (lastAssistant.content) {
    const content = lastAssistant.content

    // 如果助手提到错误或警告
    if (/错误|失败|异常|error|fail/i.test(content)) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'action',
        title: '查看错误详情',
        description: '助手回复中提到了错误，建议查看详情并尝试修复',
        priority: 'high',
      })
    }

    // 如果助手建议了下一步操作
    if (/建议|推荐|可以考虑|suggest|recommend/i.test(content)) {
      suggestions.push({
        id: nextSuggestionId(),
        type: 'reference',
        title: '查看 AI 建议',
        description: '助手回复中包含了建议，可以参考执行',
        priority: 'low',
      })
    }
  }

  // 限制最多 3 条建议，按优先级排序
  const priorityOrder: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 }
  return suggestions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 3)
}

export interface UseSmartSuggestionsOptions {
  /** 消息列表 */
  messages: Ref<AIMessage[]>
  /** 当前 Schema */
  currentSchema: Ref<Widget[] | null>
  /** 当前 Flow */
  currentFlow: Ref<FlowGraph | null>
  /** 防抖延迟（毫秒），默认 2000 */
  debounceMs?: number
  /** 是否启用，默认 true */
  enabled?: Ref<boolean>
}

export function useSmartSuggestions(options: UseSmartSuggestionsOptions) {
  const {
    messages,
    currentSchema,
    currentFlow,
    debounceMs = 2000,
    enabled = ref(true),
  } = options

  const suggestions = ref<SuggestionItem[]>([])
  const acceptedIds = ref<Set<string>>(new Set())
  const dismissedIds = ref<Set<string>>(new Set())
  const isGenerating = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastSnapshot: ContextSnapshot | null = null

  /** 构建当前上下文快照 */
  function buildSnapshot(): ContextSnapshot {
    const msgs = messages.value
    const last = msgs[msgs.length - 1]
    return {
      messageCount: msgs.length,
      lastMessageContent: last?.content?.slice(0, 100) ?? '',
      lastMessageRole: last?.role ?? '',
      schemaLength: currentSchema.value?.length ?? 0,
      flowNodeCount: currentFlow.value?.nodes?.length ?? 0,
    }
  }

  /** 检查快照是否有实质变化 */
  function hasSnapshotChanged(prev: ContextSnapshot | null, curr: ContextSnapshot): boolean {
    if (!prev) return true
    return (
      prev.messageCount !== curr.messageCount
      || prev.lastMessageContent !== curr.lastMessageContent
      || prev.schemaLength !== curr.schemaLength
      || prev.flowNodeCount !== curr.flowNodeCount
    )
  }

  /** 触发建议生成 */
  function triggerGeneration(): void {
    if (!enabled.value) return

    const snapshot = buildSnapshot()
    if (!hasSnapshotChanged(lastSnapshot, snapshot)) return

    lastSnapshot = snapshot

    // 仅在最后一条消息是已接收的助手消息时生成建议
    const lastMsg = messages.value[messages.value.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.status !== 'received') return

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      isGenerating.value = true
      try {
        const newSuggestions = extractSuggestionsFromMessages(
          messages.value,
          currentSchema.value,
          currentFlow.value,
        )
        // 过滤已采纳/忽略的建议（通过标题去重，避免重复建议）
        const existingTitles = new Set(suggestions.value.map((s) => s.title))
        const freshSuggestions = newSuggestions.filter(
          (s) => !existingTitles.has(s.title),
        )
        if (freshSuggestions.length > 0) {
          suggestions.value = [...suggestions.value, ...freshSuggestions]
        }
      } finally {
        isGenerating.value = false
      }
    }, debounceMs)
  }

  /** 采纳建议 */
  function acceptSuggestion(id: string): void {
    acceptedIds.value.add(id)
  }

  /** 忽略建议 */
  function dismissSuggestion(id: string): void {
    dismissedIds.value.add(id)
  }

  /** 清除所有建议 */
  function clearSuggestions(): void {
    suggestions.value = []
    acceptedIds.value.clear()
    dismissedIds.value.clear()
    lastSnapshot = null
  }

  /** 获取可见建议（排除已采纳/忽略的） */
  function getVisibleSuggestions(): SuggestionItem[] {
    return suggestions.value.filter(
      (s) => !acceptedIds.value.has(s.id) && !dismissedIds.value.has(s.id),
    )
  }

  // 监听上下文变化
  watch(
    () => {
      const msgs = messages.value
      const last = msgs[msgs.length - 1]
      return `${msgs.length}:${last?.content?.length ?? 0}:${last?.status ?? ''}`
    },
    () => triggerGeneration(),
  )

  watch(
    () => currentSchema.value?.length ?? 0,
    () => triggerGeneration(),
  )

  watch(
    () => currentFlow.value?.nodes?.length ?? 0,
    () => triggerGeneration(),
  )

  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  return {
    /** 当前所有建议 */
    suggestions,
    /** 已采纳的建议 ID 集合 */
    acceptedIds,
    /** 已忽略的建议 ID 集合 */
    dismissedIds,
    /** 是否正在生成建议 */
    isGenerating,
    /** 采纳建议 */
    acceptSuggestion,
    /** 忽略建议 */
    dismissSuggestion,
    /** 清除所有建议 */
    clearSuggestions,
    /** 获取可见建议 */
    getVisibleSuggestions,
  }
}
