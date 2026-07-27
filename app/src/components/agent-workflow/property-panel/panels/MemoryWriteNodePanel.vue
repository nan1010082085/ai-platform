<script setup lang="ts">
/**
 * MemoryWriteNodePanel - 长程记忆写入节点配置面板
 *
 * 将一条记忆持久化到用户长程记忆库（跨会话可召回）。
 * 典型用法：接在 memory-extract 之后，把提取结果写入。
 */
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const namespaceOptions = [
  { label: '偏好', value: 'preference' },
  { label: '事实', value: 'fact' },
  { label: '事件', value: 'event' },
  { label: '技能', value: 'skill' },
]

const userIdSourceOptions = [
  { label: '自动（执行上下文）', value: 'auto' },
  { label: '工作流输入', value: 'input' },
  { label: '固定值', value: 'custom' },
]
</script>

<template>
  <SectionToggle title="长程记忆写入" :count="4">
    <FieldRow label="记忆内容" hint="支持 {{$input.xxx}} / {{$node.xxx}}">
      <el-input
        :model-value="String(props.node.data?.memoryWriteContent ?? '')"
        type="textarea"
        :rows="3"
        placeholder="要持久化的记忆内容"
        @update:model-value="update('memoryWriteContent', $event)"
      />
    </FieldRow>

    <FieldRow label="记忆类型" hint="记忆 namespace">
      <el-select
        :model-value="String(props.node.data?.memoryWriteNamespace ?? 'fact')"
        @update:model-value="update('memoryWriteNamespace', $event)"
      >
        <el-option v-for="opt in namespaceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>

    <FieldRow label="重要性" hint="0-1，影响检索排序与遗忘，默认 0.5">
      <el-slider
        :model-value="Number(props.node.data?.memoryWriteImportance ?? 0.5)"
        :min="0"
        :max="1"
        :step="0.1"
        show-input
        @update:model-value="update('memoryWriteImportance', $event)"
      />
    </FieldRow>

    <FieldRow label="用户来源" hint="记忆按 userId 隔离">
      <el-select
        :model-value="String(props.node.data?.memoryWriteUserIdSource ?? 'auto')"
        @update:model-value="update('memoryWriteUserIdSource', $event)"
      >
        <el-option v-for="opt in userIdSourceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>

    <FieldRow
      v-if="(props.node.data?.memoryWriteUserIdSource ?? 'auto') === 'custom'"
      label="固定用户 ID"
    >
      <el-input
        :model-value="String(props.node.data?.memoryWriteUserId ?? '')"
        placeholder="自定义用户 ID"
        @update:model-value="update('memoryWriteUserId', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
