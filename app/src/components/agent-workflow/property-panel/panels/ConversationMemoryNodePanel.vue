<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="对话记忆" :count="4">
    <FieldRow label="模式">
      <el-select
        :model-value="String(props.node.data?.memoryMode ?? 'read')"
        @update:model-value="update('memoryMode', $event)"
      >
        <el-option label="读取历史" value="read" />
        <el-option label="追加一条" value="append" />
        <el-option label="清空历史" value="reset" />
      </el-select>
    </FieldRow>
    <FieldRow
      v-if="(props.node.data?.memoryMode ?? 'read') === 'append'"
      label="角色"
    >
      <el-select
        :model-value="String(props.node.data?.memoryRole ?? 'user')"
        @update:model-value="update('memoryRole', $event)"
      >
        <el-option label="用户" value="user" />
        <el-option label="助手" value="assistant" />
      </el-select>
    </FieldRow>
    <FieldRow
      v-if="(props.node.data?.memoryMode ?? 'read') === 'append'"
      label="内容来源"
      hint="助手角色默认取上一节点输出"
    >
      <el-select
        :model-value="String(props.node.data?.contentSource ?? 'lastOutput')"
        @update:model-value="update('contentSource', $event)"
      >
        <el-option label="上一节点输出" value="lastOutput" />
        <el-option label="输入字段" value="input" />
      </el-select>
    </FieldRow>
    <FieldRow label="消息字段" hint="append 用户消息时使用，默认 message">
      <el-input
        :model-value="String(props.node.data?.messageField ?? 'message')"
        placeholder="message"
        @update:model-value="update('messageField', $event)"
      />
    </FieldRow>
    <FieldRow label="最大轮数">
      <el-input-number
        :model-value="Number(props.node.data?.maxHistoryTurns ?? 20)"
        :min="1"
        :max="100"
        @update:model-value="update('maxHistoryTurns', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
