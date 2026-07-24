<script setup lang="ts">
/**
 * ScheduleTriggerNodePanel - 定时触发节点配置面板
 *
 * 交互：cron 表达式输入 + 快捷预设 + 下 5 次执行预览（实时）+ 时区 + 启用开关。
 */
import { ref, computed, watch } from 'vue'
import { request } from '@/api/aiApi/base'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import type { AgentNodePanelProps } from '../types'
import styles from './shared.module.scss'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<{
  'updateNodeData': [key: string, value: unknown]
}>()
const store = useAgentWorkflowDesignerStore()

const cron = computed(() => String(props.node.data?.scheduleCron ?? '0 9 * * *'))
const timezone = computed(() => String(props.node.data?.scheduleTimezone ?? 'Asia/Shanghai'))
const enabled = computed(() => props.node.data?.scheduleEnabled !== false)

const PRESETS: Array<{ label: string; value: string }> = [
  { label: '每天 9 点', value: '0 9 * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每 5 分钟', value: '*/5 * * * *' },
  { label: '工作日 9 点', value: '0 9 * * 1-5' },
  { label: '每周一 9 点', value: '0 9 * * 1' },
  { label: '每月 1 号', value: '0 0 1 * *' },
]

const TIMEZONES = ['Asia/Shanghai', 'Asia/Tokyo', 'UTC', 'America/New_York', 'Europe/London']

const nextRuns = ref<string[]>([])
const previewError = ref('')
let previewTimer: ReturnType<typeof setTimeout> | null = null

async function fetchPreview(cronValue: string) {
  if (!cronValue.trim()) { nextRuns.value = []; return }
  try {
    const data = await request<{ nextRuns: string[] }>('/ai/debug/schedule-preview', {
      method: 'POST',
      body: { cron: cronValue.trim(), count: 5 },
      raw: true,
    })
    nextRuns.value = data.nextRuns.map((t) => new Date(t).toLocaleString('zh-CN'))
    previewError.value = ''
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : 'Cron 格式错误'
    nextRuns.value = []
  }
}

// 防抖预览
watch(cron, (val) => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => fetchPreview(val), 400)
}, { immediate: true })

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

function applyPreset(value: string) {
  update('scheduleCron', value)
}
</script>

<template>
  <SectionToggle title="定时触发配置" :count="5">
    <FieldRow label="入口节点" hint="工作流从此节点开始执行">
      <el-switch
        :model-value="store.entryNodeId === props.node.id"
        @update:model-value="(v: boolean) => { if (v) { store.entryNodeId = props.node.id; store.dirty = true } }"
      />
    </FieldRow>

    <FieldRow label="Cron 表达式" hint="5 字段：分 时 日 月 周（0-6，0=周日）">
      <el-input
        :model-value="cron"
        placeholder="0 9 * * *"
        @update:model-value="(v: string) => update('scheduleCron', v)"
      />
    </FieldRow>

    <FieldRow label="快捷预设" hint="点击填入">
      <div :class="styles.presetRow">
        <button
          v-for="p in PRESETS"
          :key="p.value"
          type="button"
          :class="styles.presetChip"
          @click="applyPreset(p.value)"
        >
          {{ p.label }}
        </button>
      </div>
    </FieldRow>

    <FieldRow label="下 5 次执行" hint="按当前 cron 预览">
      <div v-if="previewError" :class="styles.errorHint">{{ previewError }}</div>
      <div v-else :class="styles.nextRuns">
        <div v-for="(t, i) in nextRuns" :key="i" :class="styles.nextRunItem">
          {{ t }}
        </div>
        <div v-if="!nextRuns.length && !previewError" :class="styles.muted">输入有效 cron 后预览</div>
      </div>
    </FieldRow>

    <FieldRow label="时区">
      <el-select :model-value="timezone" style="width: 100%" @update:model-value="(v: string) => update('scheduleTimezone', v)">
        <el-option v-for="tz in TIMEZONES" :key="tz" :label="tz" :value="tz" />
      </el-select>
    </FieldRow>

    <FieldRow label="启用调度" hint="关闭后不触发，配置保留">
      <el-switch
        :model-value="enabled"
        @update:model-value="(v: boolean) => update('scheduleEnabled', v)"
      />
    </FieldRow>
  </SectionToggle>
</template>
