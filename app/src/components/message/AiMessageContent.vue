<script setup lang="ts">
/**
 * AiMessageContent — 消息内容调度器
 *
 * 使用 RendererRegistry 查找匹配的渲染器，通过 Vue <component :is="...">
 * 动态渲染每个 step。文档附件/摘要单独由 DocumentRenderer 处理。
 * 同时处理用户消息（气泡、图片网格）和助手消息（步骤卡片）。
 */

import { computed, ref } from 'vue'
import { ElImageViewer } from 'element-plus'
import { getRenderer } from './RendererRegistry'
import DocumentRenderer from './renderers/DocumentRenderer.vue'
import DocumentAttachmentCard from '@/components/document/DocumentAttachmentCard.vue'
import DocumentSummaryCard from '@/components/document/DocumentSummaryCard.vue'
import AiLoadingDots from '@/components/AiLoadingDots.vue'
import WorkflowExecutionTimeline from '@/components/workflow/WorkflowExecutionTimeline.vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { getDocumentFileUrl } from '@/api/aiApi'
import type {
  StepData,
  Widget,
  MessageDocumentAttachment,
  MessageDocumentSummary,
  WorkflowMessageExecution,
} from '@/types'
import type { MessageSchemaCard } from './renderers/SchemaResultRenderer.vue'
import type { MessageFlowCard } from './renderers/FlowResultRenderer.vue'

// ---- Props ----

const props = defineProps<{
  /** 消息角色 */
  role?: 'user' | 'assistant'
  /** 步骤数据列表 */
  steps: StepData[]
  /** 消息文本内容（用户气泡用） */
  content?: string
  /** 文件附件列表 */
  attachments?: MessageDocumentAttachment[]
  /** 文档摘要列表 */
  documentSummaries?: MessageDocumentSummary[]
  /** 智能体类型，透传给渲染器 */
  agent?: string
  /** 加载状态 */
  loading?: boolean
  /** 提示信息 */
  tip?: string
  /** 嵌入式卡片数据（Schema/Flow 结果渲染用） */
  cards?: Array<MessageSchemaCard | MessageFlowCard>
  /** 原始 Widget 数据（SchemaPreviewCard 渲染用） */
  schemaWidgets?: Widget[]
  /** 工作流执行数据 */
  workflowExecution?: WorkflowMessageExecution
}>()

// ---- Emits ----
// 汇总所有渲染器可能触发的事件，统一向上透传

const emit = defineEmits<{
  'image-retry': [stepIndex: number]
  'image-download': [stepIndex: number]
  'image-preview': [url: string]
  'ppt-download': [stepIndex: number]
  'ppt-retry': [stepIndex: number]
  'requirement-confirm': [answers: Record<string, string>]
  'requirement-answer': [questionId: string, value: string]
  'requirement-skip': []
  'proposal-approve': [stepIndex: number, selectedIds: string[]]
  'proposal-reject': [stepIndex: number]
  'proposal-toggle-item': [stepIndex: number, itemId: string]
  'proposal-toggle-all': [stepIndex: number]
  'proposal-modify': [stepIndex: number, itemId: string, changes: Record<string, unknown>]
  'proposal-reset': [stepIndex: number]
  'document-download': [documentId: string]
  'document-expand': [documentId: string]
  'workflow-retry': [executionId: string]
  'workflow-detail': [executionId: string]
  'code-copy': [content: string]
  'code-insert': [content: string]
  'tool-retry': [toolCallIndex: number]
  'tool-expand': [toolCallIndex: number]
  'schema-publish': [stepIndex: number]
  'schema-preview': [stepIndex: number]
  'flow-publish': [stepIndex: number]
  'flow-preview': [stepIndex: number]
  copy: []
  'preview-document': [documentId: string]
}>()

// ---- User message state ----

const imageAttachments = computed(() =>
  (props.attachments ?? []).filter(a => a.mimetype.startsWith('image/')),
)

const nonImageAttachments = computed(() =>
  (props.attachments ?? []).filter(a => !a.mimetype.startsWith('image/')),
)

const imageUrls = computed(() =>
  imageAttachments.value.map(a => getDocumentFileUrl(a.documentId)),
)

const imageViewerVisible = ref(false)
const imageViewerIndex = ref(0)

function openImageViewer(index: number) {
  imageViewerIndex.value = index
  imageViewerVisible.value = true
}

// ---- 调度函数 ----

/**
 * 获取渲染器对应的 Vue 组件。
 * 未匹配到渲染器时返回 null（模板中 v-if 会跳过）。
 */
function getRendererComponent(step: StepData) {
  const renderer = getRenderer(step)
  return renderer?.component ?? null
}

/**
 * 根据渲染器类型，将 StepData 映射为对应组件所需的 props。
 */
function getRendererProps(step: StepData): Record<string, unknown> {
  const renderer = getRenderer(step)
  if (!renderer) return {}

  switch (renderer.type) {
    case 'text':
      return {
        content: step.content ?? '',
        agent: step.agent ?? props.agent,
      }
    case 'image_inline':
      return {
        content: step.content ?? '',
        agent: step.agent ?? props.agent,
      }
    case 'thinking':
      return {
        content: step.content ?? '',
        agent: step.agent ?? props.agent,
      }
    case 'code':
      return {
        content: step.content ?? '',
      }
    case 'schema_result':
      return {
        step,
        cards: props.cards,
        schemaWidgets: props.schemaWidgets,
      }
    case 'flow_result':
      return {
        step,
        cards: props.cards,
      }
    default:
      return { step }
  }
}

/**
 * 根据渲染器声明的 emitEvents，生成事件转发处理函数。
 */
function getRendererEvents(step: StepData, stepIndex: number): Record<string, (...args: unknown[]) => void> {
  const renderer = getRenderer(step)
  if (!renderer?.emitEvents) return {}

  const handlers: Record<string, (...args: unknown[]) => void> = {}
  for (const eventName of renderer.emitEvents) {
    handlers[eventName] = (...args: unknown[]) => {
      const eventsNeedingIndex = new Set([
        'image-retry', 'image-download', 'ppt-download', 'ppt-retry',
        'schema-publish', 'schema-preview', 'flow-publish', 'flow-preview',
        'proposal-approve', 'proposal-reject', 'proposal-toggle-item',
        'proposal-toggle-all', 'proposal-modify', 'proposal-reset',
      ])
      if (eventsNeedingIndex.has(eventName)) {
        emit(eventName as never, stepIndex, ...args)
      } else {
        emit(eventName as never, ...args)
      }
    }
  }
  return handlers
}

// ---- DocumentRenderer 事件 ----

const documentEvents = computed(() => ({
  'preview-document': (documentId: string) => emit('preview-document', documentId),
}))
</script>

<template>
  <!-- User message -->
  <template v-if="role === 'user'">
    <!-- Inline image grid -->
    <div v-if="imageAttachments.length" :class="$style.imageGrid">
      <div
        v-for="(att, imgIdx) in imageAttachments"
        :key="att.documentId"
        :class="$style.imageItem"
        @click="openImageViewer(imgIdx)"
      >
        <img
          :src="imageUrls[imgIdx]"
          :alt="att.filename"
          :class="$style.inlineImage"
        />
        <div :class="$style.imageZoomHint">
          <AppIcon name="full-screen" :size="14" />
        </div>
      </div>
    </div>

    <!-- Non-image attachment chips -->
    <div v-if="nonImageAttachments.length" :class="$style.attachmentCards">
      <DocumentAttachmentCard
        v-for="att in nonImageAttachments"
        :key="att.documentId"
        :attachment="att"
        @preview="emit('preview-document', $event)"
      />
    </div>

    <div v-if="content" :class="$style.userBubble">{{ content }}</div>

    <!-- Full-screen image viewer -->
    <ElImageViewer
      v-if="imageViewerVisible && imageUrls.length"
      :url-list="imageUrls"
      :initial-index="imageViewerIndex"
      :close-on-press-escape="true"
      teleported
      @close="imageViewerVisible = false"
    />
  </template>

  <!-- Assistant message -->
  <template v-else>
    <!-- Document summaries -->
    <div v-if="documentSummaries?.length" :class="$style.summaryCards">
      <DocumentSummaryCard
        v-for="item in documentSummaries"
        :key="item.documentId"
        :item="item"
      />
    </div>

    <!-- Workflow execution timeline -->
    <WorkflowExecutionTimeline
      v-if="workflowExecution"
      :execution="workflowExecution"
    />

    <!-- Loading placeholder -->
    <div
      v-if="loading && steps.length === 0 && !workflowExecution?.nodeRecords?.length"
      :class="$style.loadingPlaceholder"
    >
      <AiLoadingDots />
    </div>

    <!-- Step card list -->
    <div v-if="steps.length > 0" :class="$style.stepList">
      <template v-for="(step, idx) in steps" :key="idx">
        <component
          :is="getRendererComponent(step)"
          v-if="getRendererComponent(step)"
          v-bind="getRendererProps(step)"
          v-on="getRendererEvents(step, idx)"
        />
      </template>
    </div>

    <!-- Document attachments (separate from steps) -->
    <DocumentRenderer
      v-if="attachments?.length"
      :attachments="attachments"
      :document-summaries="documentSummaries"
      v-on="documentEvents"
    />

    <!-- Tip -->
    <div v-if="tip" :class="$style.tip">
      <AppIcon name="info-filled" :class="$style.tipIcon" :size="18" />
      <span :class="$style.tipText">{{ tip }}</span>
    </div>
  </template>
</template>

<style module>
/* ---- User bubble ---- */
.userBubble {
  background: var(--color-primary, #0060A2);
  color: var(--text-color-inverse, #FFFFFF);
  padding: 10px 16px;
  border-radius: 16px 16px 4px 16px;
  font-size: 14px;
  line-height: 1.6;
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ---- Inline image grid (user uploaded images) ---- */
.imageGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
  margin-bottom: 6px;
  max-width: 80%;
  margin-left: auto;
}

.imageItem {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.imageItem:hover {
  border-color: var(--color-primary-light-5, #a0cfff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.imageItem:hover .imageZoomHint {
  opacity: 1;
}

.inlineImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.imageZoomHint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

/* ---- Attachment cards ---- */
.attachmentCards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  max-width: 100%;
  margin-left: auto;
}

.summaryCards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  max-width: 100%;
}

/* ---- Step list ---- */
.stepList {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

/* ---- Loading placeholder ---- */
.loadingPlaceholder {
  padding: 12px 0;
}

/* ---- Tip section ---- */
.tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--color-primary-lighter, #EEF5FF);
  border: 1px solid var(--color-primary-light, #4581E9);
  margin-top: 8px;
}

.tipIcon {
  flex-shrink: 0;
  color: var(--color-primary, #0060A2);
  margin-top: 1px;
}

.tipText {
  font-size: 12px;
  color: var(--text-color-secondary, #666666);
  line-height: 1.6;
}
</style>
