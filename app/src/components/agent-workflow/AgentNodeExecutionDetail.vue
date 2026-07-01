<script setup lang="ts">
import { computed } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { AgentNodeRecord, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import { buildAgentNodeExecutionDetail } from '@/utils/agentNodeExecutionDetail'
import type { PreviewTone } from '@/utils/agentNodePreview'
import styles from './AgentNodeExecutionDetail.module.scss'

const props = defineProps<{
  record: AgentNodeRecord
  nodeData?: AgentWorkflowNodeData | null
  expanded?: boolean
}>()

const STATUS_LABELS: Record<string, string> = {
  pending: '等待',
  running: '执行中',
  success: '成功',
  error: '失败',
  skipped: '跳过',
  waiting: '待确认',
}

const STATUS_TYPE: Record<string, string> = {
  running: 'primary',
  success: 'success',
  error: 'danger',
  waiting: 'warning',
  skipped: 'info',
  pending: 'info',
}

const TONE_CLASS: Partial<Record<PreviewTone, string>> = {
  muted: styles.toneMuted,
  primary: styles.tonePrimary,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
}

const detail = computed(() => buildAgentNodeExecutionDetail(props.record, props.nodeData))

function toneClass(tone?: PreviewTone): string {
  if (!tone || tone === 'default') return ''
  return TONE_CLASS[tone] ?? ''
}

function formatJson(value: unknown): string {
  if (value == null) return '—'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

async function copyJson(label: string, value: unknown) {
  const text = formatJson(value)
  if (text === '—') return
  await navigator.clipboard.writeText(text)
  message.success(`${label}已复制`)
}
</script>

<template>
  <div :class="styles.root">
    <div :class="styles.header">
      <div :class="styles.headerMain">
        <div :class="styles.iconWrap" :style="{ '--node-accent': detail.accentColor }">
          <AppIcon :name="detail.typeIcon" :size="16" />
        </div>
        <div :class="styles.headerText">
          <div :class="styles.headerTop">
            <span :class="styles.nodeName">{{ record.nodeName }}</span>
            <el-tag size="small" :type="(STATUS_TYPE[record.status] as any) ?? 'info'">
              {{ STATUS_LABELS[record.status] ?? record.status }}
            </el-tag>
          </div>
          <span :class="styles.nodeType">{{ detail.typeLabel }} · {{ record.nodeId }}</span>
        </div>
      </div>
    </div>

    <section :class="styles.section">
      <div :class="styles.sectionTitle">基本信息</div>
      <div :class="styles.fieldGrid">
        <div v-for="field in detail.overview" :key="field.key" :class="styles.field">
          <span :class="styles.fieldLabel">{{ field.label }}</span>
          <span :class="[styles.fieldValue, field.mono && styles.mono, toneClass(field.tone)]">
            {{ field.value }}
          </span>
        </div>
      </div>
    </section>

    <section v-if="detail.config.length" :class="styles.section">
      <div :class="styles.sectionTitle">节点配置</div>
      <div :class="styles.fieldList">
        <div v-for="row in detail.config" :key="row.key" :class="styles.fieldRow">
          <span :class="styles.fieldLabel">{{ row.label }}</span>
          <span :class="[styles.fieldValue, toneClass(row.tone)]">{{ row.value }}</span>
        </div>
      </div>
    </section>

    <section v-if="detail.runtimeSummary.length" :class="styles.section">
      <div :class="styles.sectionTitle">执行摘要</div>
      <div :class="styles.fieldList">
        <div v-for="row in detail.runtimeSummary" :key="row.key" :class="styles.fieldRow">
          <span :class="styles.fieldLabel">{{ row.label }}</span>
          <span :class="[styles.fieldValue, toneClass(row.tone)]">{{ row.value }}</span>
        </div>
      </div>
    </section>

    <section v-if="detail.highlights.length" :class="styles.section">
      <div :class="styles.sectionTitle">关键结果</div>
      <div :class="styles.highlightList">
        <div v-for="field in detail.highlights" :key="field.key" :class="styles.highlightItem">
          <span :class="styles.fieldLabel">{{ field.label }}</span>
          <pre :class="[styles.highlightValue, toneClass(field.tone)]">{{ field.value }}</pre>
        </div>
      </div>
    </section>

    <section v-if="record.nodeType === 'hitl' && (detail.hitlMessage || detail.hitlItems.length)" :class="styles.section">
      <div :class="styles.sectionTitle">人工确认</div>
      <div v-if="detail.hitlMessage" :class="styles.hitlMessage">{{ detail.hitlMessage }}</div>
      <div v-if="detail.hitlItems.length" :class="styles.fieldList">
        <div v-for="(item, idx) in detail.hitlItems" :key="idx" :class="styles.fieldRow">
          <span :class="styles.fieldLabel">{{ item.question }}</span>
          <span :class="styles.fieldValue">{{ item.answer }}</span>
        </div>
      </div>
    </section>

    <section v-if="record.error" :class="styles.section">
      <div :class="styles.sectionTitle">错误信息</div>
      <div :class="styles.errorBox">{{ record.error }}</div>
    </section>

    <section :class="styles.section">
      <div :class="styles.sectionHeader">
        <div :class="styles.sectionTitle">输入数据</div>
        <button :class="styles.copyBtn" type="button" @click="copyJson('输入数据', record.input)">
          复制
        </button>
      </div>
      <pre :class="[styles.jsonPre, expanded && styles.jsonPreExpanded]">{{ formatJson(record.input) }}</pre>
    </section>

    <section :class="styles.section">
      <div :class="styles.sectionHeader">
        <div :class="styles.sectionTitle">输出数据</div>
        <button :class="styles.copyBtn" type="button" @click="copyJson('输出数据', record.output)">
          复制
        </button>
      </div>
      <pre :class="[styles.jsonPre, expanded && styles.jsonPreExpanded]">{{ formatJson(record.output) }}</pre>
    </section>
  </div>
</template>
