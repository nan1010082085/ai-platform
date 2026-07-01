<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import { BUILT_IN_TOOLS, getBuiltInTool } from '@/constants/agentTools'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const jsonText = ref('')
const jsonError = ref('')

const selectedTool = computed(() =>
  getBuiltInTool(String(props.node.data?.toolName ?? '')),
)

const defaultArgsHint = '{"query":"{{$input.message}}"}'

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

watch(
  () => props.node.data?.toolArgs,
  (val) => {
    jsonText.value = val == null ? '{}' : JSON.stringify(val, null, 2)
    jsonError.value = ''
  },
  { immediate: true },
)

function onToolChange(name: string) {
  update('toolName', name)
  const tool = getBuiltInTool(name)
  if (tool && (!jsonText.value || jsonText.value === '{}')) {
    jsonText.value = tool.argsHint
    try {
      update('toolArgs', JSON.parse(tool.argsHint) as Record<string, unknown>)
      jsonError.value = ''
    } catch {
      // 保留 hint 文本，不解析
    }
  }
}

function onJsonBlur() {
  const text = jsonText.value.trim()
  if (!text) {
    update('toolArgs', {})
    jsonError.value = ''
    return
  }
  try {
    update('toolArgs', JSON.parse(text) as Record<string, unknown>)
    jsonError.value = ''
  } catch {
    jsonError.value = 'JSON 格式无效'
  }
}
</script>

<template>
  <SectionToggle title="工具配置" :count="2">
    <FieldRow label="工具" hint="选择内置工具">
      <el-select
        :model-value="String(props.node.data?.toolName ?? '')"
        placeholder="请选择工具"
        filterable
        @update:model-value="onToolChange"
      >
        <el-option
          v-for="tool in BUILT_IN_TOOLS"
          :key="tool.name"
          :label="`${tool.label} (${tool.name})`"
          :value="tool.name"
        />
      </el-select>
    </FieldRow>
    <div v-if="selectedTool" :class="styles.hint">{{ selectedTool.description }}</div>
    <FieldRow label="参数" textarea hint="工具参数 JSON，支持变量模板">
      <el-input
        v-model="jsonText"
        type="textarea"
        :rows="5"
        :placeholder="selectedTool?.argsHint || defaultArgsHint"
        @blur="onJsonBlur"
      />
    </FieldRow>
    <div v-if="jsonError" :class="styles.hint" style="color: var(--color-danger)">{{ jsonError }}</div>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
