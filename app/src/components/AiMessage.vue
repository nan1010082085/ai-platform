<script setup lang="ts">
/**
 * AiMessage — 消息外壳组件（瘦壳）
 *
 * 职责：Props/Emits 定义、hover 状态、steps 计算、事件转发。
 * 渲染委托给 AiMessageContent（内容）和 AiMessageActionBar（操作栏）。
 */

import { ref, computed, watch } from 'vue'
import { getToolDisplayLabel } from '@schema-platform/platform-shared/ai/toolNames'
import { splitTextAndCodeBlocks } from '@/utils/textParser'
import { getNextQuestion } from '@/utils/requirementConfirmFlow'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AiMessageContent from './message/AiMessageContent.vue'
import AiMessageActionBar from './message/AiMessageActionBar.vue'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'
import type {
  StepData,
  Widget,
  FlowGraph,
  MessageDocumentAttachment,
  MessageDocumentSummary,
  ActionProposal,
  ActionItem,
  WorkflowMessageExecution,
} from '@/types'

// ---- Exported types (backward compat) ----

export type MessageRole = 'user' | 'assistant'

export interface MessageSchemaCard {
  type: 'schema'
  title: string
  fields: SchemaField[]
  primaryAction?: string
  secondaryAction?: string
}

export interface MessageFlowCard {
  type: 'flow'
  title: string
  nodes: FlowNode[]
  graph?: FlowGraph
  primaryAction?: string
  secondaryAction?: string
}

export type MessageEmbeddedCard = MessageSchemaCard | MessageFlowCard

export interface ToolCallDisplay {
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  error?: string
}

export interface AiMessageProps {
  role: MessageRole
  label: string
  agent?: 'editor' | 'flow' | 'page' | 'auto' | 'general'
  content?: string
  thinking?: string
  tip?: string
  toolCalls?: ToolCallDisplay[]
  loading?: boolean
  cards?: MessageEmbeddedCard[]
  schemaWidgets?: Widget[]
  messageId?: string
  feedback?: 'positive' | 'negative' | null
  attachments?: MessageDocumentAttachment[]
  documentSummaries?: MessageDocumentSummary[]
  workflowExecution?: WorkflowMessageExecution
}

// ---- Props & Emits ----

const props = defineProps<AiMessageProps>()

const emit = defineEmits<{
  'card-primary-action': [cardIndex: number]
  'card-secondary-action': [cardIndex: number]
  'open-json-drawer': []
  'retry-tool': [toolIndex: number]
  'requirement-confirm': [answers: Record<string, string>]
  'requirement-answer': [questionId: string, value: string]
  'requirement-skip': []
  'action-proposal-toggle-item': [proposalIndex: number, itemId: string]
  'action-proposal-toggle-all': [proposalIndex: number]
  'action-proposal-approve': [proposalIndex: number, selectedIds: string[]]
  'action-proposal-reject': [proposalIndex: number]
  'action-proposal-modify': [proposalIndex: number, itemId: string, changes: Partial<ActionItem>]
  'action-proposal-reset': [proposalIndex: number]
  'image-regenerate': [stepIndex: number]
  'image-download': [stepIndex: number]
  'ppt-download': [stepIndex: number]
  'preview-document': [documentId: string]
  copy: []
  regenerate: []
  feedback: [type: 'positive' | 'negative']
}>()

// ---- Hover state ----

const isHovered = ref(false)

const currentFeedback = ref<'positive' | 'negative' | null>(props.feedback ?? null)

watch(() => props.feedback, (newVal) => {
  currentFeedback.value = newVal ?? null
})

function handleMouseEnter(): void {
  isHovered.value = true
}

function handleMouseLeave(): void {
  isHovered.value = false
}

// ---- Steps computed (derives StepData[] from flat message props) ----

const steps = computed<StepData[]>(() => {
  const result: StepData[] = []
  const now = new Date()

  const pendingRequirementConfirm = props.toolCalls?.some((tc) => {
    if (tc.name !== 'requirement_confirm' || !tc.result) return false
    const resultData = tc.result as Record<string, unknown>
    return resultData.waitingConfirmation !== false
  })

  // Step: thinking
  if (props.thinking && !pendingRequirementConfirm) {
    result.push({
      type: 'thinking',
      title: '思考过程',
      content: props.thinking,
      status: 'done',
      timestamp: now,
      agent: props.agent,
    })
  }

  // Steps: tool calls
  if (props.toolCalls && props.toolCalls.length > 0) {
    for (let tcIdx = 0; tcIdx < props.toolCalls.length; tcIdx++) {
      const tc = props.toolCalls[tcIdx]
      const hasError = !!tc.error
      const hasResult = tc.result !== undefined
      const status = hasError ? 'error' : hasResult ? 'done' : 'running'

      // 需求确认卡片
      if (tc.name === 'requirement_confirm' && tc.result) {
        const resultData = tc.result as Record<string, unknown>
        if (resultData.analysis) {
          const analysis = resultData.analysis as import('@/types').RequirementAnalysis
          const partialAnswers = (resultData.partialAnswers ?? {}) as Record<string, string>
          const nextQuestion = getNextQuestion(analysis, partialAnswers)
          result.push({
            type: 'requirement_confirm',
            title: '需求分析',
            status: 'done',
            requirementAnalysis: analysis,
            requirementPartialAnswers: partialAnswers,
            requirementNextQuestionId: nextQuestion?.id ?? null,
            waitingConfirmation: resultData.waitingConfirmation !== false,
            timestamp: now,
            agent: props.agent,
          })
          continue
        }
      }

      // 行动方案卡片
      if ((tc.name === 'action_proposals' || tc.name === 'generate_action_proposals') && tc.result) {
        const resultData = tc.result as Record<string, unknown>
        const proposalData = resultData.proposal ?? resultData
        if (proposalData && typeof proposalData === 'object' && 'actionItems' in proposalData) {
          result.push({
            type: 'action_proposal',
            title: '智能拟办',
            status: 'done',
            actionProposal: proposalData as ActionProposal,
            timestamp: now,
            agent: props.agent,
          })
          continue
        }
      }

      // 图片生成卡片
      if ((tc.name === 'image__generate' || tc.name === 'generate_image') && tc.result) {
        const resultData = tc.result as Record<string, unknown>
        result.push({
          type: 'image_generate',
          title: '图片生成',
          status: hasError ? 'error' : 'done',
          imageGenerateData: {
            imageUrl: resultData.imageUrl as string | undefined,
            prompt: (resultData.prompt as string) ?? (tc.arguments?.prompt as string),
            model: (resultData.model as string) ?? (tc.arguments?.model as string),
            size: (resultData.size as string) ?? (tc.arguments?.size as string),
            style: (resultData.style as string) ?? (tc.arguments?.style as string),
            quality: (resultData.quality as string) ?? (tc.arguments?.quality as string),
            error: tc.error,
          },
          timestamp: now,
          agent: props.agent,
        })
        continue
      }

      // PPT 生成卡片
      if ((tc.name === 'ppt__generate' || tc.name === 'generate_ppt') && tc.result) {
        const resultData = tc.result as Record<string, unknown>
        result.push({
          type: 'ppt_generate',
          title: 'PPT 生成',
          status: hasError ? 'error' : 'done',
          pptGenerateData: {
            slides: resultData.slides as import('@/types').PptSlideData[] | undefined,
            metadata: resultData.metadata as import('@/types').PptGenerateResult['metadata'],
            error: tc.error,
          },
          timestamp: now,
          agent: props.agent,
        })
        continue
      }

      result.push({
        type: hasError ? 'tool_error' : 'tool_call',
        title: getToolDisplayLabel(tc.name),
        status,
        toolName: tc.name,
        toolDisplayName: getToolDisplayLabel(tc.name),
        toolResult: tc.result,
        toolArguments: tc.arguments,
        error: tc.error,
        toolCallIndex: tcIdx,
        timestamp: now,
        agent: props.agent,
      })
    }
  }

  // Step: text reply — split text and code blocks
  if (props.content) {
    const parts = splitTextAndCodeBlocks(props.content)
    for (const part of parts) {
      if (part.type === 'text' && part.content.trim()) {
        result.push({
          type: 'text',
          title: '回复',
          content: part.content,
          status: 'done',
          timestamp: now,
          agent: props.agent,
        })
      } else if (part.type === 'code') {
        result.push({
          type: 'code',
          title: 'JSON 数据',
          content: part.content,
          status: 'done',
          timestamp: now,
          agent: props.agent,
        })
      }
    }
  }

  // Steps: embedded result cards
  if (props.cards && props.cards.length > 0) {
    for (const card of props.cards) {
      result.push({
        type: 'result',
        title: card.title,
        status: 'done',
        cardType: card.type,
        cardTitle: card.title,
        primaryAction: card.primaryAction,
        secondaryAction: card.secondaryAction,
        timestamp: now,
        agent: props.agent,
      })
    }
  }

  return result
})

// ---- Content event mapping ----

/** Compute proposal index from step index (counts action_proposal steps before stepIdx) */
function getProposalIndex(stepIdx: number): number {
  let count = 0
  for (let i = 0; i < stepIdx; i++) {
    if (steps.value[i]?.type === 'action_proposal') count++
  }
  return count
}

const contentEvents = {
  'image-retry': (stepIndex: number) => emit('image-regenerate', stepIndex),
  'image-download': (stepIndex: number) => emit('image-download', stepIndex),
  'image-preview': () => { /* preview handled by ElImageViewer */ },
  'ppt-download': (stepIndex: number) => emit('ppt-download', stepIndex),
  'ppt-retry': () => { /* no matching emit */ },
  'requirement-confirm': (answers: Record<string, string>) => emit('requirement-confirm', answers),
  'requirement-answer': (questionId: string, value: string) => emit('requirement-answer', questionId, value),
  'requirement-skip': () => emit('requirement-skip'),
  'proposal-approve': (stepIndex: number, selectedIds: string[]) => emit('action-proposal-approve', getProposalIndex(stepIndex), selectedIds),
  'proposal-reject': (stepIndex: number) => emit('action-proposal-reject', getProposalIndex(stepIndex)),
  'proposal-toggle-item': (stepIndex: number, itemId: string) => emit('action-proposal-toggle-item', getProposalIndex(stepIndex), itemId),
  'proposal-toggle-all': (stepIndex: number) => emit('action-proposal-toggle-all', getProposalIndex(stepIndex)),
  'proposal-modify': (stepIndex: number, itemId: string, changes: Partial<ActionItem>) => emit('action-proposal-modify', getProposalIndex(stepIndex), itemId, changes),
  'proposal-reset': (stepIndex: number) => emit('action-proposal-reset', getProposalIndex(stepIndex)),
  'document-download': () => { /* no matching emit */ },
  'document-expand': () => { /* no matching emit */ },
  'workflow-retry': () => { /* no matching emit */ },
  'workflow-detail': () => { /* no matching emit */ },
  'code-copy': () => { /* no matching emit */ },
  'code-insert': () => { /* no matching emit */ },
  'tool-retry': (toolCallIndex: number) => emit('retry-tool', toolCallIndex),
  'tool-expand': () => { /* no matching emit */ },
  'schema-publish': (stepIndex: number) => emit('card-primary-action', stepIndex),
  'schema-preview': () => emit('open-json-drawer'),
  'flow-publish': (stepIndex: number) => emit('card-primary-action', stepIndex),
  'flow-preview': (stepIndex: number) => emit('card-secondary-action', stepIndex),
  copy: () => emit('copy'),
  'preview-document': (documentId: string) => emit('preview-document', documentId),
}

const actionEvents = {
  copy: () => emit('copy'),
  regenerate: () => emit('regenerate'),
  feedback: (type: 'positive' | 'negative') => emit('feedback', type),
}
</script>

<template>
  <div
    :class="[$style.msg, role === 'user' ? $style.msgUser : $style.msgAssistant]"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Avatar -->
    <div :class="[$style.avatar, role === 'user' ? $style.avatarUser : $style.avatarAssistant]">
      <AppIcon :name="role === 'user' ? 'user' : 'connection'" :size="16" />
    </div>

    <!-- Content area -->
    <div :class="$style.content">
      <AiMessageContent
        :role="role"
        :steps="steps"
        :content="content"
        :loading="loading"
        :tip="tip"
        :attachments="attachments"
        :document-summaries="documentSummaries"
        :workflow-execution="workflowExecution"
        :agent="agent"
        :cards="cards"
        :schema-widgets="schemaWidgets"
        v-on="contentEvents"
      />
      <AiMessageActionBar
        v-if="role === 'assistant' && !loading"
        :content="content"
        :message-id="messageId"
        :feedback="currentFeedback"
        :is-hovered="isHovered"
        v-on="actionEvents"
      />
    </div>
  </div>
</template>

<style module src="./AiMessage.module.scss" />
