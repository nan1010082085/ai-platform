<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AiStepCard from './AiStepCard.vue'
import AiLoadingDots from './AiLoadingDots.vue'
import SchemaCard from './SchemaCard.vue'
import SchemaPreviewCard from './SchemaPreviewCard.vue'
import FlowCard from './FlowCard.vue'
import FlowPreviewCard from './FlowPreviewCard.vue'
import RequirementConfirmCard from './RequirementConfirmCard.vue'
import { getNextQuestion } from '@/utils/requirementConfirmFlow'
import JsonCard from './JsonCard.vue'
import JsonDetailDialog from './JsonDetailDialog.vue'
import ActionProposalCard from './ActionProposalCard.vue'
import ImagePreviewCard from './ImagePreviewCard.vue'
import PptPreviewCard from './PptPreviewCard.vue'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'
import type { StepData, Widget, FlowGraph, MessageDocumentAttachment, MessageDocumentSummary, ActionProposal, ActionItem } from '@/types'
import DocumentAttachmentCard from './document/DocumentAttachmentCard.vue'
import DocumentSummaryCard from './document/DocumentSummaryCard.vue'
import WorkflowExecutionTimeline from './workflow/WorkflowExecutionTimeline.vue'
import type { WorkflowMessageExecution } from '@/types'

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
  /** Full FlowGraph for Vue Flow rendering */
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
  /** label shown above the message, e.g. "You", "Editor", "Flow" */
  label: string
  /** agent type for coloring — only used when role is 'assistant' */
  agent?: 'editor' | 'flow' | 'page' | 'auto' | 'general'
  content?: string
  thinking?: string
  tip?: string
  toolCalls?: ToolCallDisplay[]
  loading?: boolean
  cards?: MessageEmbeddedCard[]
  /** 原始 Widget 数据，用于渲染器预览卡片 */
  schemaWidgets?: Widget[]
  /** 消息 ID，用于反馈 API */
  messageId?: string
  /** 当前反馈状态 */
  feedback?: 'positive' | 'negative' | null
  attachments?: MessageDocumentAttachment[]
  documentSummaries?: MessageDocumentSummary[]
  workflowExecution?: WorkflowMessageExecution
}

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

// ---- Action menu state ----

const isHovered = ref(false)
const showActions = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

const currentFeedback = ref<'positive' | 'negative' | null>(props.feedback ?? null)

watch(() => props.feedback, (newVal) => {
  currentFeedback.value = newVal ?? null
})

function handleCopy(): void {
  if (props.content) {
    navigator.clipboard.writeText(props.content)
    message.success('已复制到剪贴板')
  }
  emit('copy')
}

function handleRegenerate(): void {
  emit('regenerate')
}

function handleFeedback(type: 'positive' | 'negative'): void {
  // Toggle off if clicking the same feedback
  if (currentFeedback.value === type) {
    currentFeedback.value = null
  } else {
    currentFeedback.value = type
  }
}

function handleMouseEnter(): void {
  isHovered.value = true
  hoverTimer = setTimeout(() => {
    showActions.value = true
  }, 300)
}

function handleMouseLeave(): void {
  isHovered.value = false
  showActions.value = false
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
}

// ---- F2: rAF-batched content for streaming ----

/** Buffered content that only updates at animation frame cadence */
const renderedContentRef = ref('')
let latestContent = ''

watch(() => props.content, (newContent) => {
  latestContent = newContent ?? ''
  // 直接更新，不使用 requestAnimationFrame，确保流式响应实时显示
  renderedContentRef.value = latestContent
}, { immediate: true })

// ---- JSON detail dialog state ----

const jsonDialogVisible = ref(false)
const jsonDialogTitle = ref('')
const jsonDialogContent = ref('')

function openJsonDialog(title: string, content: string): void {
  jsonDialogTitle.value = title
  jsonDialogContent.value = content
  jsonDialogVisible.value = true
}

// 获取 JSON 卡片类型
function getJsonCardType(content: string): 'json' | 'schema' | 'flow' {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      // 检查是否是 Schema（包含 type 字段的数组）
      if (parsed.length > 0 && parsed[0].type) {
        return 'schema'
      }
    }
    if (parsed.nodes && Array.isArray(parsed.nodes)) {
      return 'flow'
    }
  } catch {
    // ignore
  }
  return 'json'
}

// ---- Tool name display map ----

const TOOL_NAME_MAP: Record<string, string> = {
  // MCP Schema 相关（domain__ 前缀）
  schema__search: '搜索表单',
  schema__get_detail: '获取表单详情',
  schema__search_published: '搜索已发布表单',
  schema__fuzzy_search: '模糊搜索表单',
  schema__validate: '校验 Schema 文档',
  schema__validate_widgets: '校验组件 Schema',
  schema__find_flow_references: '查找流程引用',
  // MCP Flow 相关
  flow__search: '搜索流程',
  flow__get_detail: '获取流程详情',
  flow__validate: '校验流程',
  flow__search_users: '搜索用户',
  flow__get_node_schema: '获取流程节点表单',
  // MCP Widget 相关
  widget__query: '查询组件',
  widget__validate: '校验组件 Schema',
  // MCP RAG
  rag__search: '智能匹配',
  // MCP Industry
  industry__search_templates: '搜索行业模板',
  industry__validate_form: '校验行业表单',
  // LangGraph 专有（无前缀）
  update_schema: '更新表单',
  generate_schema: '生成表单',
  save_and_bind_schema: '保存并绑定表单',
  update_flow: '更新流程',
  bind_schema_to_flow_node: '绑定表单到流程节点',
  rag_index: 'RAG 索引',
  request_collaboration: '请求协作',
  action_proposals: '生成行动方案',
  generate_action_proposals: '生成行动方案',
  image__generate: '图片生成',
  generate_image: '图片生成',
  ppt__generate: 'PPT 生成',
  generate_ppt: 'PPT 生成',
}

function formatToolName(name: string): string {
  return TOOL_NAME_MAP[name] ?? name
}

// ---- Markdown rendering for text replies ----

import { marked } from 'marked'
import DOMPurify from 'dompurify'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

function renderMarkdown(content: string): string {
  if (!content) return ''
  const rawHtml = marked.parse(content, { breaks: true }) as string
  // 给 <table> 包裹可滚动的 div，只让表格区域左右滚动
  const wrappedHtml = rawHtml.replace(
    /<table>/g,
    '<div class="tableScroll"><table>',
  ).replace(
    /<\/table>/g,
    '</table></div>',
  )
  return DOMPurify.sanitize(wrappedHtml, { ADD_ATTR: ['class'] })
}

// ---- Split text and code blocks for better rendering ----

interface TextPart {
  type: 'text' | 'code'
  content: string
  language?: string
}

/**
 * 判断文本是否是 LLM 输出的多余总结性内容
 * 匹配 <schema> 标签后常见的总结模式
 */
function isRedundantSummary(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const patterns = [
    /^(好的|已|我|现在|以上|这就是|这是|根据|基于)/,
    /^(表单|流程|Schema|JSON|数据)\s*(已|已经|已生成|已创建|已更新)/,
    /已(生成|创建|更新|完成|应用)(好|了)?/,
    /以上(就是|是)/,
    /请(查看|确认|检查|参考)/,
    /希望(这|这个)/,
  ]
  // 只匹配短文本（< 100 字符），长文本大概率是有意义的内容
  return trimmed.length < 100 && patterns.some(p => p.test(trimmed))
}

/**
 * 将 Markdown 内容拆分为文字和代码块两部分
 * 识别 ```json ... ``` 格式和 <schema>...</schema> 标签
 * 过滤 <schema> 标签后的多余总结文本
 */
function splitTextAndCodeBlocks(content: string): TextPart[] {
  const parts: TextPart[] = []

  // 同时匹配 ```json 代码块和 <schema> 标签
  const blockRegex = /(<schema>[\s\S]*?<\/schema>|```(\w+)?\n([\s\S]*?)```)/g
  let lastIndex = 0
  let match
  let hasSchemaTag = false

  while ((match = blockRegex.exec(content)) !== null) {
    // 添加代码块之前的文字
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore })
      }
    }

    const fullMatch = match[0]

    // <schema> 标签
    if (fullMatch.startsWith('<schema>')) {
      const jsonContent = fullMatch.replace(/<\/?schema>/g, '').trim()
      parts.push({ type: 'code', content: jsonContent, language: 'json' })
      hasSchemaTag = true
    }
    // ```json 代码块
    else {
      const language = match[2] || 'json'
      const codeContent = match[3].trim()
      parts.push({ type: 'code', content: codeContent, language })
    }

    lastIndex = match.index + fullMatch.length
  }

  // 添加最后剩余的文字（如果有 <schema> 标签，过滤多余总结）
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex)
    if (remaining.trim()) {
      // 如果前面有 <schema> 标签，检查是否是多余总结
      if (hasSchemaTag && isRedundantSummary(remaining)) {
        // 过滤掉多余总结文本
      } else {
        parts.push({ type: 'text', content: remaining })
      }
    }
  }

  // 如果没有代码块，返回原始内容
  if (parts.length === 0) {
    parts.push({ type: 'text', content })
  }

  return parts
}

// ---- Derive step list from flat message data ----

const steps = computed<StepData[]>(() => {
  const result: StepData[] = []
  const now = new Date()

  const pendingRequirementConfirm = props.toolCalls?.some((tc) => {
    if (tc.name !== 'requirement_confirm' || !tc.result) return false
    const resultData = tc.result as Record<string, unknown>
    return resultData.waitingConfirmation !== false
  })

  // Step: thinking（有需求确认卡片时不展示冗长思考过程）
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
        title: formatToolName(tc.name),
        status,
        toolName: tc.name,
        toolDisplayName: formatToolName(tc.name),
        toolResult: tc.result,
        toolArguments: tc.arguments,
        error: tc.error,
        toolCallIndex: tcIdx,
        timestamp: now,
        agent: props.agent,
      })
    }
  }

  // Step: text reply — 拆分文字和 JSON 代码块
  if (renderedContentRef.value) {
    const parts = splitTextAndCodeBlocks(renderedContentRef.value)
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

  // Steps: embedded result cards（最后显示渲染结果）
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

/** 追踪 action_proposal 步骤在 steps 中的序号（用于 emit 回传索引） */
function getActionProposalIndex(stepIdx: number): number {
  let count = 0
  for (let i = 0; i <= stepIdx; i++) {
    if (steps.value[i]?.type === 'action_proposal') count++
  }
  return count - 1
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
      <!-- User icon -->
      <AppIcon name="user" v-if="role === 'user'" :size="16" />
      <!-- AI icon -->
      <AppIcon name="connection" v-else :size="16" />
    </div>

    <!-- Content area -->
    <div :class="$style.content">
      <!-- User message: bubble style -->
      <template v-if="role === 'user'">
        <div v-if="attachments?.length" :class="$style.attachmentCards">
          <DocumentAttachmentCard
            v-for="att in attachments"
            :key="att.documentId"
            :attachment="att"
            @preview="emit('preview-document', $event)"
          />
        </div>
        <div v-if="content" :class="$style.userBubble">{{ content }}</div>
      </template>

      <!-- Assistant message: step cards -->
      <template v-else>
        <div v-if="documentSummaries?.length" :class="$style.summaryCards">
          <DocumentSummaryCard
            v-for="item in documentSummaries"
            :key="item.documentId"
            :item="item"
          />
        </div>

        <WorkflowExecutionTimeline
          v-if="workflowExecution"
          :execution="workflowExecution"
        />

        <!-- Loading placeholder when no steps yet -->
        <div
          v-if="loading && steps.length === 0 && !workflowExecution?.nodeRecords?.length"
          :class="$style.loadingPlaceholder"
        >
          <AiLoadingDots />
        </div>

        <!-- Step card list -->
        <div v-if="steps.length > 0" :class="$style.stepList">
          <template v-for="(step, idx) in steps" :key="idx">
            <!-- Text reply: 直接渲染 Markdown，不包裹卡片 -->
            <div v-if="step.type === 'text' && step.content" :class="$style.markdownContent" v-html="renderMarkdown(step.content)" />

            <!-- Code/JSON: 用卡片展示，点击查看详情 -->
            <JsonCard
              v-else-if="step.type === 'code' && step.content"
              :title="step.title"
              :content="step.content"
              :type="getJsonCardType(step.content)"
              @click="openJsonDialog(step.title, step.content)"
            />

            <!-- Requirement Confirm: 需求确认卡片 -->
            <RequirementConfirmCard
              v-else-if="step.type === 'requirement_confirm' && step.requirementAnalysis"
              :analysis="step.requirementAnalysis"
              :partial-answers="step.requirementPartialAnswers ?? {}"
              :next-question-id="step.requirementNextQuestionId"
              :waiting-confirmation="step.waitingConfirmation ?? true"
              @answer="(qid, val) => emit('requirement-answer', qid, val)"
              @skip="emit('requirement-skip')"
            />

            <!-- Action Proposal: 行动方案卡片 -->
            <ActionProposalCard
              v-else-if="step.type === 'action_proposal' && step.actionProposal"
              :proposal="step.actionProposal"
              @toggle-item="(itemId) => emit('action-proposal-toggle-item', getActionProposalIndex(idx), itemId)"
              @toggle-all="emit('action-proposal-toggle-all', getActionProposalIndex(idx))"
              @approve="(selectedIds) => emit('action-proposal-approve', getActionProposalIndex(idx), selectedIds)"
              @reject="emit('action-proposal-reject', getActionProposalIndex(idx))"
              @modify="(itemId, changes) => emit('action-proposal-modify', getActionProposalIndex(idx), itemId, changes)"
              @reset="emit('action-proposal-reset', getActionProposalIndex(idx))"
            />

            <!-- Image Generate: 图片生成预览卡片 -->
            <ImagePreviewCard
              v-else-if="step.type === 'image_generate'"
              :image-url="step.imageGenerateData?.imageUrl"
              :prompt="step.imageGenerateData?.prompt"
              :model="step.imageGenerateData?.model"
              :size="step.imageGenerateData?.size"
              :style="step.imageGenerateData?.style"
              :quality="step.imageGenerateData?.quality"
              :loading="step.imageGenerateData?.loading ?? step.status === 'running'"
              :error="step.imageGenerateData?.error ?? step.error"
              @download="emit('image-download', idx)"
              @regenerate="emit('image-regenerate', idx)"
            />

            <!-- PPT Generate: PPT 生成预览卡片 -->
            <PptPreviewCard
              v-else-if="step.type === 'ppt_generate'"
              :slides="step.pptGenerateData?.slides"
              :metadata="step.pptGenerateData?.metadata"
              :loading="step.pptGenerateData?.loading ?? step.status === 'running'"
              :error="step.pptGenerateData?.error ?? step.error"
              :blob="step.pptGenerateData?.blob"
              @download="emit('ppt-download', idx)"
            />

            <!-- Thinking/Tool/Result: 用卡片包裹 -->
            <AiStepCard
              v-else
              :index="idx + 1"
              :type="step.type"
              :title="step.title"
              :content="step.content"
              :status="step.status"
              :tool-name="step.toolName"
              :tool-display-name="step.toolDisplayName"
              :tool-result="step.toolResult"
              :tool-arguments="step.toolArguments"
              :error="step.error"
              :tool-call-index="step.toolCallIndex"
              :card-type="step.cardType"
              :card-title="step.cardTitle"
              :primary-action="step.primaryAction"
              :secondary-action="step.secondaryAction"
              :timestamp="step.timestamp"
              :agent="step.agent"
              :is-last="idx === steps.length - 1"
              @primary-action="step.type === 'result' && emit('card-primary-action', 0)"
              @secondary-action="step.type === 'result' && emit('card-secondary-action', 0)"
              @retry-tool="step.toolCallIndex !== undefined && emit('retry-tool', step.toolCallIndex)"
            >
              <!-- Result card slot -->
              <template v-if="step.type === 'result' && cards">
                <!-- 有原始 Widget 数据时，使用渲染器预览卡片 -->
                <SchemaPreviewCard
                  v-if="schemaWidgets && schemaWidgets.length > 0"
                  :widgets="schemaWidgets"
                  :title="cards.find((c) => c.type === 'schema')?.title ?? '生成的表单'"
                  compact
                  @click="emit('open-json-drawer')"
                  @primary-action="emit('card-primary-action', 0)"
                  @secondary-action="emit('card-secondary-action', 0)"
                />
                <!-- fallback: 字段列表卡片 -->
                <template v-else>
                  <SchemaCard
                    v-for="(card, cIdx) in cards.filter((c) => c.type === 'schema')"
                    :key="'s' + cIdx"
                    :title="card.title"
                    :fields="card.fields"
                    :primary-action="card.primaryAction"
                    :secondary-action="card.secondaryAction"
                    compact
                    @primary-action="emit('card-primary-action', cIdx)"
                    @secondary-action="emit('card-secondary-action', cIdx)"
                  />
                </template>
                <template v-for="(card, cIdx) in cards.filter((c) => c.type === 'flow')" :key="'f' + cIdx">
                  <FlowPreviewCard
                    v-if="card.graph"
                    :title="card.title"
                    :graph="card.graph"
                    :primary-action="card.primaryAction"
                    :secondary-action="card.secondaryAction"
                    compact
                    @primary-action="emit('card-primary-action', cIdx)"
                    @secondary-action="emit('card-secondary-action', cIdx)"
                  />
                  <FlowCard
                    v-else
                    :title="card.title"
                    :nodes="card.nodes"
                    :primary-action="card.primaryAction"
                    :secondary-action="card.secondaryAction"
                    compact
                    @primary-action="emit('card-primary-action', cIdx)"
                    @secondary-action="emit('card-secondary-action', cIdx)"
                  />
                </template>
              </template>
            </AiStepCard>
          </template>
        </div>

        <!-- Tip -->
        <div v-if="tip" :class="$style.tip">
          <AppIcon name="info-filled" :class="$style.tipIcon" :size="18" />
          <span :class="$style.tipText">{{ tip }}</span>
        </div>
      </template>

      <!-- Action menu (hover 300ms to show) -->
      <div
        v-if="role === 'assistant' && !loading"
        :class="[$style.actionMenu, { [$style.actionMenuVisible]: showActions }]"
      >
        <el-tooltip content="复制" placement="top" :show-after="300">
          <button :class="$style.actionBtn" @click="handleCopy">
            <AppIcon name="copy-document" :size="14" />
          </button>
        </el-tooltip>
        <el-tooltip content="重新生成" placement="top" :show-after="300">
          <button :class="$style.actionBtn" @click="handleRegenerate">
            <AppIcon name="refresh" :size="14" />
          </button>
        </el-tooltip>
        <el-tooltip content="点赞" placement="top" :show-after="300">
          <button
            :class="[$style.actionBtn, { [$style.actionBtnActive]: currentFeedback === 'positive' }]"
            @click="handleFeedback('positive')"
          >
            <AppIcon name="star" :size="14" />
          </button>
        </el-tooltip>
        <el-tooltip content="点踩" placement="top" :show-after="300">
          <button
            :class="[$style.actionBtn, { [$style.actionBtnActive]: currentFeedback === 'negative' }]"
            @click="handleFeedback('negative')"
          >
            <AppIcon name="star" :size="14" />
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- JSON 详情弹框 -->
    <JsonDetailDialog
      v-model:visible="jsonDialogVisible"
      :title="jsonDialogTitle"
      :content="jsonDialogContent"
    />
  </div>
</template>

<style module src="./AiMessage.module.scss" />
