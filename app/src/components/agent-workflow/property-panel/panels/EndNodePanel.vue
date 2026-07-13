<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const outputSourceOptions = [
  { label: '最后一个节点输出', value: 'lastOutput' },
  { label: '指定节点输出', value: 'node' },
  { label: '自定义 JSON', value: 'custom' },
]
</script>

<template>
  <SectionToggle title="输出配置" :count="2">
    <FieldRow label="输出来源" hint="选择工作流返回给调用方的数据">
      <el-select
        :model-value="String(props.node.data?.outputSource ?? 'lastOutput')"
        @update:model-value="update('outputSource', $event)"
      >
        <el-option
          v-for="opt in outputSourceOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </FieldRow>

    <FieldRow
      v-if="props.node.data?.outputSource === 'node'"
      label="节点 ID"
      hint="指定从哪个节点取输出"
    >
      <el-input
        :model-value="String(props.node.data?.outputNodeId ?? '')"
        placeholder="llm-1"
        @update:model-value="update('outputNodeId', $event)"
      />
    </FieldRow>

    <FieldRow
      v-if="props.node.data?.outputSource === 'custom'"
      label="输出模板"
      textarea
      hint="支持 {{$node.xxx}} 变量，输出 JSON"
    >
      <el-input
        type="textarea"
        :rows="4"
        :model-value="String(props.node.data?.outputTemplate ?? '')"
        placeholder='{ "summary": "{{$node.llm-1}}", "status": "done" }'
        @update:model-value="update('outputTemplate', $event)"
      />
    </FieldRow>

    <div class="el-form-item__hint" style="font-size: 12px; color: var(--el-text-color-secondary); padding: 8px 0;">
      💡 回调 URL 请在工作流设置的「完成回调」中配置
    </div>
  </SectionToggle>
</template>
