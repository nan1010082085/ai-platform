<script setup lang="ts">
/**
 * FlowInteractNodePanel - 流程交互节点属性面板
 *
 * 配置流程定义 ID + 交互动作（start/query/approve/reject）。
 */

import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import type { AgentNodePanelProps, AgentNodePanelEmits } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const action = computed({
  get: () => props.node.data?.flowInteractAction ?? 'query',
  set: (v) => update('flowInteractAction', v),
})

const ACTION_OPTIONS = [
  { label: '发起流程', value: 'start', hint: '按流程定义 ID 发起新流程实例' },
  { label: '查询状态', value: 'query', hint: '查询流程实例当前状态与节点' },
  { label: '审批通过', value: 'approve', hint: '对待审批节点执行通过操作' },
  { label: '驳回', value: 'reject', hint: '对待审批节点执行驳回操作' },
]
</script>

<template>
  <SectionToggle title="流程交互配置" :count="2">
    <FieldRow label="流程定义 ID" hint="目标流程的定义标识">
      <el-input
        :model-value="String(props.node.data?.flowInteractDefinitionId ?? '')"
        placeholder="输入流程定义 ID"
        @update:model-value="update('flowInteractDefinitionId', $event)"
      />
    </FieldRow>

    <FieldRow label="交互动作" hint="选择要执行的流程操作">
      <el-select v-model="action" style="width: 100%">
        <el-option
          v-for="opt in ACTION_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
