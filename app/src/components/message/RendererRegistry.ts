/**
 * 消息渲染器注册表
 *
 * 统一管理所有 StepData 渲染器的注册、查找与排序。
 * 各渲染器按 priority 升序匹配，第一个 matcher 返回 true 的渲染器胜出。
 */

import { type Component } from 'vue'
import type { StepData } from '@/types'

// 同步导入所有渲染器（替代 defineAsyncComponent 以避免测试中的异步时序问题）
import ImageGenerateRenderer from './renderers/ImageGenerateRenderer.vue'
import PptGenerateRenderer from './renderers/PptGenerateRenderer.vue'
import RequirementRenderer from './renderers/RequirementRenderer.vue'
import ActionProposalRenderer from './renderers/ActionProposalRenderer.vue'
import ImageInlineRenderer from './renderers/ImageInlineRenderer.vue'
import DocumentAttachmentRenderer from './renderers/DocumentAttachmentRenderer.vue'
import DocumentSummaryRenderer from './renderers/DocumentSummaryRenderer.vue'
import WorkflowExecutionRenderer from './renderers/WorkflowExecutionRenderer.vue'
import CodeRenderer from './renderers/CodeRenderer.vue'
import ThinkingRenderer from './renderers/ThinkingRenderer.vue'
import ToolCallRenderer from './renderers/ToolCallRenderer.vue'
import SchemaResultRenderer from './renderers/SchemaResultRenderer.vue'
import FlowResultRenderer from './renderers/FlowResultRenderer.vue'
import TextRenderer from './renderers/TextRenderer.vue'

/**
 * 尚未加入 StepType 联合的渲染器类型，matcher 中用此函数安全判断。
 * 当 StepType 扩展后，此辅助函数可移除。
 */
function isStepType(step: StepData, type: string): boolean {
  return step.type === (type as StepData['type'])
}

// ---- 接口定义 ----

export interface MessageRenderer {
  /** 渲染器类型标识（唯一键） */
  type: string
  /** Vue 组件 */
  component: Component
  /** 匹配逻辑：判断该渲染器是否处理当前步骤 */
  matcher: (step: StepData) => boolean
  /** 优先级（数字越小越优先） */
  priority: number
  /** 该渲染器可能触发的事件 */
  emitEvents?: string[]
}

// ---- 内部状态 ----

/** 已注册渲染器列表（按 priority 升序排列） */
const renderers: MessageRenderer[] = []

/** 按 type 建立索引，用于快速注销 */
const rendererIndex = new Map<string, MessageRenderer>()

// ---- 内部工具 ----

/** 按 priority 升序插入，保持有序 */
function insertSorted(renderer: MessageRenderer): void {
  const idx = renderers.findIndex((r) => r.priority > renderer.priority)
  if (idx === -1) {
    renderers.push(renderer)
  } else {
    renderers.splice(idx, 0, renderer)
  }
}

/** 从有序列表和索引中移除 */
function removeByType(type: string): MessageRenderer | undefined {
  const existing = rendererIndex.get(type)
  if (!existing) return undefined
  const idx = renderers.indexOf(existing)
  if (idx !== -1) renderers.splice(idx, 1)
  rendererIndex.delete(type)
  return existing
}

// ---- 公开 API ----

/**
 * 注册一个渲染器。
 * 如果已存在同 type 的渲染器，先移除旧的再插入新的。
 */
export function registerRenderer(renderer: MessageRenderer): void {
  removeByType(renderer.type)
  rendererIndex.set(renderer.type, renderer)
  insertSorted(renderer)
}

/**
 * 按 type 注销渲染器。
 */
export function unregisterRenderer(type: string): void {
  removeByType(type)
}

/**
 * 按优先级查找第一个匹配 step 的渲染器。
 * 未匹配到返回 null。
 */
export function getRenderer(step: StepData): MessageRenderer | null {
  for (const r of renderers) {
    if (r.matcher(step)) return r
  }
  return null
}

/**
 * 返回当前所有已注册渲染器的副本（按 priority 升序）。
 */
export function getAllRenderers(): MessageRenderer[] {
  return [...renderers]
}

// ---- 预置渲染器 ----

const presetRenderers: MessageRenderer[] = [
  {
    type: 'image_generate',
    component: ImageGenerateRenderer,
    matcher: (step) => step.type === 'image_generate',
    priority: 10,
    emitEvents: ['image-retry', 'image-download'],
  },
  {
    type: 'ppt_generate',
    component: PptGenerateRenderer,
    matcher: (step) => step.type === 'ppt_generate',
    priority: 11,
    emitEvents: ['ppt-download', 'ppt-retry'],
  },
  {
    type: 'requirement_confirm',
    component: RequirementRenderer,
    matcher: (step) => step.type === 'requirement_confirm',
    priority: 15,
    emitEvents: ['requirement-confirm', 'requirement-answer', 'requirement-skip'],
  },
  {
    type: 'action_proposal',
    component: ActionProposalRenderer,
    matcher: (step) => step.type === 'action_proposal',
    priority: 16,
    emitEvents: ['proposal-approve', 'proposal-reject', 'proposal-toggle-item', 'proposal-toggle-all', 'proposal-modify', 'proposal-reset'],
  },
  {
    type: 'image_inline',
    component: ImageInlineRenderer,
    matcher: (step) => step.type === 'text' && /\!\[.*?\]\(.*?\)/.test(step.content ?? ''),
    priority: 18,
    emitEvents: ['image-preview'],
  },
  {
    type: 'document_attachment',
    component: DocumentAttachmentRenderer,
    matcher: (step) => isStepType(step, 'document_attachment'),
    priority: 19,
    emitEvents: ['document-download'],
  },
  {
    type: 'document_summary',
    component: DocumentSummaryRenderer,
    matcher: (step) => isStepType(step, 'document_summary'),
    priority: 20,
    emitEvents: ['document-expand'],
  },
  {
    type: 'workflow_execution',
    component: WorkflowExecutionRenderer,
    matcher: (step) => isStepType(step, 'workflow_execution'),
    priority: 21,
    emitEvents: ['workflow-retry', 'workflow-detail'],
  },
  {
    type: 'code',
    component: CodeRenderer,
    matcher: (step) => step.type === 'code',
    priority: 30,
    emitEvents: ['code-copy', 'code-insert'],
  },
  {
    type: 'thinking',
    component: ThinkingRenderer,
    matcher: (step) => step.type === 'thinking',
    priority: 40,
  },
  {
    type: 'tool_call',
    component: ToolCallRenderer,
    matcher: (step) => step.type === 'tool_call',
    priority: 50,
    emitEvents: ['tool-retry', 'tool-expand'],
  },
  {
    type: 'tool_error',
    component: ToolCallRenderer,
    matcher: (step) => step.type === 'tool_error',
    priority: 51,
    emitEvents: ['tool-retry'],
  },
  {
    type: 'schema_result',
    component: SchemaResultRenderer,
    matcher: (step) => step.type === 'result' && step.cardType === 'schema',
    priority: 60,
    emitEvents: ['schema-publish', 'schema-preview'],
  },
  {
    type: 'flow_result',
    component: FlowResultRenderer,
    matcher: (step) => step.type === 'result' && step.cardType === 'flow',
    priority: 61,
    emitEvents: ['flow-publish', 'flow-preview'],
  },
  {
    type: 'text',
    component: TextRenderer,
    matcher: () => true,
    priority: 100,
    emitEvents: ['copy'],
  },
]

// 自动注册所有预置渲染器
for (const renderer of presetRenderers) {
  registerRenderer(renderer)
}
