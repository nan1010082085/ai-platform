<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import {
  getBuiltInTool,
  getToolsByCategory,
} from '@/constants/agentTools'
import { getToolCategoryForNode, getToolNodeCategoryLabel } from '@/constants/toolNodeTypes'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'
import type { AgentNodeType } from '@/types/agentWorkflow'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const jsonText = ref('')
const jsonError = ref('')

const nodeType = computed(() => (props.node.type ?? 'tool') as AgentNodeType)

const lockedCategory = computed(() =>
  getToolCategoryForNode(nodeType.value, props.node.data),
)

const categoryLabel = computed(() =>
  getToolNodeCategoryLabel(nodeType.value, props.node.data),
)

const toolsInCategory = computed(() =>
  lockedCategory.value ? getToolsByCategory(lockedCategory.value) : [],
)

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
    <div v-if="categoryLabel" :class="styles.hint">
      节点类型：{{ categoryLabel }}（由左侧拖拽节点决定，不可更改）
    </div>
    <FieldRow
      label="具体工具"
      :hint="lockedCategory ? `${toolsInCategory.length} 个可用` : '未知工具类'"
    >
      <el-select
        :model-value="String(props.node.data?.toolName ?? '')"
        placeholder="请选择具体工具"
        filterable
        :disabled="!lockedCategory"
        @update:model-value="onToolChange"
      >
        <el-option
          v-for="tool in toolsInCategory"
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
        :disabled="!selectedTool"
        @blur="onJsonBlur"
      />
    </FieldRow>
    <div v-if="jsonError" :class="styles.hint" style="color: var(--color-danger)">{{ jsonError }}</div>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
