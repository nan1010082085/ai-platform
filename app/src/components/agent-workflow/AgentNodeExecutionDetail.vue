<script setup lang="ts">
import { computed, ref } from 'vue'
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

const STATUS_TYPE: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'danger'> = {
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

/** agent-loop 思考链：每轮迭代的工具调用详情 */
const agentLoopSteps = computed<Array<{
  iteration: number
  toolCalls: Array<{ name: string; success: boolean }>
}>>(() => {
  if (props.record.nodeType !== 'agent-loop') return []
  const output = props.record.output as Record<string, unknown> | undefined
  const steps = output?.steps
  if (!Array.isArray(steps)) return []
  return steps as Array<{ iteration: number; toolCalls: Array<{ name: string; success: boolean }> }>
})

/** agent-team 成员方案：vote/parallel 模式下各成员的输出（steps / details） */
const agentTeamProposals = computed<Array<{ member: string; proposal?: string; task?: string; result?: string }>>(() => {
  if (props.record.nodeType !== 'agent-team') return []
  const output = props.record.output as Record<string, unknown> | undefined
  const steps = output?.steps ?? output?.details
  if (!Array.isArray(steps)) return []
  return steps as Array<{ member: string; proposal?: string; task?: string; result?: string }>
})

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

const diagnosing = ref(false)
const diagnosis = ref('')

async function diagnoseError() {
  diagnosing.value = true
  diagnosis.value = ''
  try {
    const { request } = await import('@/api/aiApi/base')
    const data = await request<{ analysis: string }>('/ai/debug/diagnose-node', {
      method: 'POST',
      body: {
        nodeType: props.record.nodeType,
        error: props.record.error,
        input: props.record.input,
        output: props.record.output,
      },
      raw: true,
    })
    diagnosis.value = data.analysis
  } catch (err) {
    message.error(err instanceof Error ? err.message : '诊断失败')
  } finally {
    diagnosing.value = false
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
            <el-tag size="small" :type="STATUS_TYPE[record.status] ?? 'info'">
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

    <section v-if="agentLoopSteps.length" :class="styles.section">
      <div :class="styles.sectionTitle">思考链（{{ agentLoopSteps.length }} 轮）</div>
      <div :class="styles.stepList">
        <div v-for="step in agentLoopSteps" :key="step.iteration" :class="styles.stepItem">
          <span :class="styles.stepIteration">第 {{ step.iteration }} 轮</span>
          <span v-if="step.tokens?.totalTokens" style="font-size: 11px; color: var(--el-text-color-secondary); margin-left: 6px;">{{ step.tokens.totalTokens }} token</span>
          <span v-if="step.durationMs" style="font-size: 11px; color: var(--el-text-color-secondary); margin-left: 6px;">{{ step.durationMs }}ms</span>
          <div v-if="step.reasoning" style="font-size: 12px; color: var(--el-text-color-regular); margin-top: 4px; padding-left: 12px; border-left: 2px solid var(--el-border-color-lighter);">{{ step.reasoning }}</div>
          <span v-if="step.toolCalls.length === 0" :class="styles.stepIdle">给出最终回答</span>
          <div v-else :class="styles.stepTools">
            <span
              v-for="(tc, idx) in step.toolCalls"
              :key="idx"
              :class="[styles.stepTool, tc.success ? styles.stepToolOk : styles.stepToolFail]"
            >
              <AppIcon :name="tc.success ? 'circle-check' : 'circle-close'" :size="12" />
              {{ tc.name }}
              <span v-if="tc.args" style="font-size: 11px; color: var(--el-text-color-secondary); margin-left: 4px; cursor: help;" :title="tc.result ?? undefined">({{ tc.args }})</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="agentTeamProposals.length" :class="styles.section">
      <div :class="styles.sectionTitle">成员方案（{{ agentTeamProposals.length }} 名）</div>
      <div :class="styles.stepList">
        <div v-for="(p, idx) in agentTeamProposals" :key="idx" :class="styles.stepItem">
          <span :class="styles.stepIteration">{{ p.member }}</span>
          <span v-if="p.task" :class="styles.stepIdle">{{ p.task }}</span>
          <pre v-if="p.proposal || p.result" :class="styles.highlightValue">{{ p.proposal || p.result }}</pre>
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
      <div :class="styles.sectionHeader">
        <div :class="styles.sectionTitle">错误信息</div>
        <el-button
          type="primary"
          size="small"
          plain
          :loading="diagnosing"
          @click="diagnoseError"
        >
          <AppIcon name="magic-stick" :size="12" style="margin-right: 2px" />
          AI 诊断
        </el-button>
      </div>
      <div :class="styles.errorBox">{{ record.error }}</div>
      <div v-if="diagnosis" :class="styles.diagnosisBox">
        <div :class="styles.diagnosisTitle">
          <AppIcon name="magic-stick" :size="12" /> 诊断结果
        </div>
        <pre :class="styles.diagnosisText">{{ diagnosis }}</pre>
      </div>
    </section>

    <section :class="styles.section">
      <div :class="styles.sectionHeader">
        <div :class="styles.sectionTitle">输入数据</div>
        <button :class="styles.copyBtn" type="button" @click="copyJson('输入数据', record.input)">
          <AppIcon name="copy-document" :size="12" />
        </button>
      </div>
      <pre :class="[styles.jsonPre, expanded && styles.jsonPreExpanded]">{{ formatJson(record.input) }}</pre>
    </section>

    <section :class="styles.section">
      <div :class="styles.sectionHeader">
        <div :class="styles.sectionTitle">输出数据</div>
        <button :class="styles.copyBtn" type="button" @click="copyJson('输出数据', record.output)">
          <AppIcon name="copy-document" :size="12" />
        </button>
      </div>
      <pre :class="[styles.jsonPre, expanded && styles.jsonPreExpanded]">{{ formatJson(record.output) }}</pre>
    </section>
  </div>
</template>
