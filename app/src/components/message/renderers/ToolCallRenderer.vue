<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { StepData } from '@/types'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { getToolDisplayLabel } from '@schema-platform/platform-shared/ai/toolNames'

const props = defineProps<{
  /** 工具调用/错误步骤数据 */
  step: StepData
}>()

const emit = defineEmits<{
  'retry-tool': []
}>()

// ---- Constants ----

const SEARCH_TOOL_NAMES = new Set([
  'schema__search', 'schema__search_published', 'schema__fuzzy_search',
  'flow__search', 'flow__search_users',
  'widget__query', 'industry__search_templates',
])

const RAG_TOOL_NAMES = new Set(['rag__search', 'rag_index'])

/** 错误类型到用户友好描述的映射 */
const ERROR_DESCRIPTION_MAP: Record<string, string> = {
  timeout: '服务响应超时，请稍后重试',
  database: '数据库操作失败，请稍后重试',
  validation: '数据校验失败，请检查输入内容',
  network: '网络连接异常，请检查网络后重试',
  permission: '权限不足，无法执行此操作',
  not_found: '请求的资源不存在',
  conflict: '数据冲突，请刷新后重试',
  rate_limit: '请求过于频繁，请稍后重试',
}

const agentLabels: Record<string, string> = {
  editor: 'Editor 专家',
  flow: 'Flow 专家',
  page: 'Page 专家',
  general: '通用助手',
}

// ---- Computed ----

const isError = computed(() => props.step.status === 'error' || props.step.type === 'tool_error')
const isRunning = computed(() => props.step.status === 'running')
const isDone = computed(() => props.step.status === 'done' && !isError.value)

/** 工具显示名称 — 优先 step.toolDisplayName，其次 getToolDisplayLabel */
const displayName = computed(() =>
  props.step.toolDisplayName || getToolDisplayLabel(props.step.toolName ?? ''),
)

/** 用户友好的错误描述 */
const friendlyErrorDescription = computed(() => {
  const raw = props.step.error ?? ''
  const lower = raw.toLowerCase()
  for (const [keyword, description] of Object.entries(ERROR_DESCRIPTION_MAP)) {
    if (lower.includes(keyword)) return description
  }
  return raw || '工具执行失败，请重试'
})

const statusLabel = computed(() => {
  if (isRunning.value) return '调用中...'
  if (isDone.value) return '完成'
  if (isError.value) return '失败'
  return ''
})

/** 是否有工具参数 */
const hasToolDetails = computed(() =>
  props.step.toolArguments && Object.keys(props.step.toolArguments).length > 0,
)

/** 是否有工具结果 */
const hasToolResult = computed(() => props.step.toolResult !== undefined)

// ---- Tool result parsing ----

/**
 * 将 toolResult 规范化为对象。
 * rag_search 等工具返回 JSON.stringify(result)，存入 MongoDB 后仍是字符串，
 * 历史回显时需要先解析。
 */
function normalizeToolResult(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch { /* not JSON */ }
  }
  return null
}

const parsedToolResult = computed(() => normalizeToolResult(props.step.toolResult))

const toolResultSummary = computed(() => {
  const r = parsedToolResult.value
  if (!r) return null
  return typeof r.summary === 'string' ? r.summary : null
})

// ---- Search tool compact display ----

const compactResult = computed(() => {
  const r = parsedToolResult.value
  if (!r) return null
  if (!SEARCH_TOOL_NAMES.has(props.step.toolName ?? '')) return null
  if (r.error) return null

  const data = r.data as Record<string, unknown> | undefined
  if (!data) return null

  const items = (data.schemas ?? data.flows ?? data.users ?? data.widgets ?? []) as Array<Record<string, unknown>>
  const names = items
    .map(item => (item.name ?? item.displayName ?? item.username ?? item.id) as string)
    .filter(Boolean)
    .slice(0, 5)
  const total = (data.total as number) ?? items.length

  return { total, names, summary: r.summary as string | undefined }
})

// ---- RAG tool friendly display ----

function extractToolQuery(args?: Record<string, unknown>): string {
  if (!args) return ''
  if (typeof args.query === 'string') return args.query
  if (typeof args.input === 'string') {
    try {
      const parsed = JSON.parse(args.input) as { query?: string }
      return parsed.query ?? ''
    } catch {
      return ''
    }
  }
  return ''
}

const ragDisplay = computed(() => {
  if (!RAG_TOOL_NAMES.has(props.step.toolName ?? '')) return null
  const r = parsedToolResult.value
  const query = extractToolQuery(props.step.toolArguments)

  if (!r) {
    return { query, error: null as string | null, empty: true, items: [] as Array<{ name: string; score?: number; type?: string }>, summary: null as string | null }
  }

  if (r.success === false || r.error) {
    return {
      query,
      error: String(r.error ?? '搜索失败'),
      empty: true,
      items: [] as Array<{ name: string; score?: number; type?: string }>,
      summary: null as string | null,
    }
  }

  const data = r.data as { schemas?: Array<{ name: string; score?: number; type?: string }>; total?: number } | undefined
  const items = data?.schemas ?? []
  const summary = typeof r.summary === 'string' ? r.summary : null

  if (items.length === 0) {
    return { query, error: null, empty: true, items, summary }
  }

  return { query, error: null, empty: false, items, summary }
})

const showRawToolJson = computed(() => !ragDisplay.value)

// ---- Collapse ----

// 默认展开逻辑：
// - tool_error: 始终展开
// - tool_call: 运行中展开，完成后折叠
const collapsed = ref(true)
watch(() => [props.step.type, props.step.status], () => {
  if (props.step.type === 'tool_error') collapsed.value = false
  else if (props.step.status === 'running') collapsed.value = false
  else collapsed.value = true
}, { immediate: true })

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
}

// ---- Time formatting ----

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div :class="[$style.root, isError ? $style.rootError : '']">
    <!-- Header -->
    <div
      :class="[$style.header, isError ? $style.headerError : '']"
      @click="toggleCollapse"
    >
      <div :class="$style.headerLeft">
        <!-- Icon -->
        <div :class="[$style.icon, isError ? $style.iconError : $style.iconSuccess]">
          <AppIcon name="edit" v-if="!isError" :size="14" />
          <AppIcon name="circle-close-filled" v-else :size="14" />
        </div>
        <!-- Title + subtitle -->
        <div :class="$style.headerText">
          <div :class="$style.title">
            {{ isError ? '工具调用失败' : step.title }}
            <span v-if="step.agent" :class="[$style.agentBadge, $style[`agent_${step.agent}`]]">
              {{ agentLabels[step.agent] ?? step.agent }}
            </span>
          </div>
          <div :class="$style.subtitle">
            {{ displayName }}
          </div>
        </div>
      </div>
      <div :class="$style.headerRight">
        <!-- Timestamp -->
        <div v-if="step.timestamp" :class="$style.timestamp">
          {{ formatTime(step.timestamp) }}
        </div>
        <!-- Status indicator -->
        <div :class="$style.status">
          <span :class="[$style.statusDot, isRunning ? $style.statusDotLoading : isError ? $style.statusDotError : $style.statusDotSuccess]" />
          <span>{{ statusLabel }}</span>
        </div>
        <!-- Collapse toggle -->
        <div :class="[$style.toggle, { [$style.toggleExpanded]: !collapsed }]">
          <AppIcon name="arrow-down" :size="12" />
        </div>
      </div>
    </div>

    <!-- Body -->
    <div v-if="!collapsed" :class="$style.body">
      <!-- Error display -->
      <div v-if="isError" :class="$style.errorContent">
        <AppIcon name="circle-close-filled" :class="$style.errorIcon" :size="20" />
        <div :class="$style.errorBody">
          <div :class="$style.errorText">{{ friendlyErrorDescription }}</div>
          <div v-if="step.error && step.error !== friendlyErrorDescription" :class="$style.errorDetail">{{ step.error }}</div>
          <button
            :class="$style.retryBtn"
            @click.stop="emit('retry-tool')"
          >
            <AppIcon name="refresh" :size="12" />
            重试
          </button>
        </div>
      </div>

      <!-- Success content -->
      <template v-else>
        <!-- RAG tool friendly display -->
        <div v-if="ragDisplay" :class="$style.toolSection">
          <div v-if="ragDisplay.query" :class="$style.ragQuery">
            <span :class="$style.toolSectionLabel">查询</span>
            <span>{{ ragDisplay.query }}</span>
          </div>
          <div :class="$style.toolSectionLabel">结果</div>
          <div v-if="ragDisplay.error" :class="$style.ragEmpty">{{ ragDisplay.error }}</div>
          <div v-else-if="ragDisplay.empty" :class="$style.ragEmpty">没有匹配结果</div>
          <template v-else>
            <div v-if="ragDisplay.summary" :class="$style.toolSummary">{{ ragDisplay.summary }}</div>
            <ul :class="$style.compactList">
              <li v-for="(item, i) in ragDisplay.items.slice(0, 5)" :key="i">
                {{ item.name }}
                <span v-if="item.score != null" :class="$style.ragScore">（{{ item.score }}%）</span>
              </li>
              <li v-if="ragDisplay.items.length > 5" :class="$style.moreItem">
                ...共 {{ ragDisplay.items.length }} 条
              </li>
            </ul>
          </template>
        </div>

        <!-- Tool arguments (raw JSON) -->
        <div v-if="hasToolDetails && showRawToolJson" :class="$style.toolSection">
          <div :class="$style.toolSectionLabel">参数</div>
          <div :class="$style.toolJson">
            <pre>{{ JSON.stringify(step.toolArguments, null, 2) }}</pre>
          </div>
        </div>

        <!-- Search tool compact display -->
        <div v-if="compactResult" :class="$style.toolSection">
          <div :class="$style.toolSectionLabel">结果</div>
          <div v-if="compactResult.summary" :class="$style.toolSummary">{{ compactResult.summary }}</div>
          <ul v-if="compactResult.names.length > 0" :class="$style.compactList">
            <li v-for="(name, i) in compactResult.names" :key="i">{{ name }}</li>
            <li v-if="compactResult.total > compactResult.names.length" :class="$style.moreItem">
              ...共 {{ compactResult.total }} 条
            </li>
          </ul>
          <details :class="$style.rawDetails">
            <summary>查看原始数据</summary>
            <div :class="$style.toolJson"><pre>{{ JSON.stringify(parsedToolResult ?? step.toolResult, null, 2) }}</pre></div>
          </details>
        </div>

        <!-- Non-search tool raw result -->
        <template v-else-if="showRawToolJson">
          <div v-if="hasToolResult" :class="$style.toolSection">
            <div :class="$style.toolSectionLabel">结果</div>
            <div v-if="toolResultSummary" :class="$style.toolSummary">{{ toolResultSummary }}</div>
            <div :class="$style.toolJson">
              <pre>{{ JSON.stringify(parsedToolResult ?? step.toolResult, null, 2) }}</pre>
            </div>
          </div>
        </template>

        <!-- Running indicator -->
        <div v-if="isRunning" :class="$style.typingIndicator">
          <span :class="$style.typingDot" />
          <span :class="$style.typingDot" />
          <span :class="$style.typingDot" />
        </div>
      </template>
    </div>
  </div>
</template>

<style module src="./ToolCallRenderer.module.scss" />
