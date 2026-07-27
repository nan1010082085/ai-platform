<script setup lang="ts">
/**
 * MemoryRecallNodePanel - 长程记忆检索节点配置面板
 *
 * 从用户长程记忆库（跨会话）检索相关记忆，注入下游 prompt。
 * 与 conversation-memory（会话窗口）分层共存：本节点检索持久化记忆。
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
  { label: '全部', value: 'all' },
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
  <SectionToggle title="长程记忆检索" :count="4">
    <FieldRow label="检索 query" hint="支持 {{$input.xxx}} / {{$node.xxx}}，默认 {{$input.message}}">
      <el-input
        :model-value="String(props.node.data?.memoryRecallQuery ?? '{{$input.message}}')"
        placeholder="{{$input.message}}"
        @update:model-value="update('memoryRecallQuery', $event)"
      />
    </FieldRow>

    <FieldRow label="召回条数" hint="top-k，默认 5">
      <el-input-number
        :model-value="Number(props.node.data?.memoryRecallLimit ?? 5)"
        :min="1"
        :max="20"
        @update:model-value="update('memoryRecallLimit', $event)"
      />
    </FieldRow>

    <FieldRow label="记忆类型" hint="按 namespace 过滤">
      <el-select
        :model-value="String(props.node.data?.memoryRecallNamespace ?? 'all')"
        @update:model-value="update('memoryRecallNamespace', $event)"
      >
        <el-option v-for="opt in namespaceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>

    <FieldRow label="用户来源" hint="记忆按 userId 隔离">
      <el-select
        :model-value="String(props.node.data?.memoryRecallUserIdSource ?? 'auto')"
        @update:model-value="update('memoryRecallUserIdSource', $event)"
      >
        <el-option v-for="opt in userIdSourceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>

    <FieldRow
      v-if="(props.node.data?.memoryRecallUserIdSource ?? 'auto') === 'custom'"
      label="固定用户 ID"
    >
      <el-input
        :model-value="String(props.node.data?.memoryRecallUserId ?? '')"
        placeholder="自定义用户 ID"
        @update:model-value="update('memoryRecallUserId', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
