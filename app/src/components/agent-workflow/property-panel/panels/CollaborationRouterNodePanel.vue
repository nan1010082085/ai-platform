<script setup lang="ts">
/**
 * CollaborationRouterNodePanel — 协作路由节点属性面板
 *
 * 配置协作工具检测、最大协作轮次。
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

const detectCollaborationTool = computed({
  get: () => props.node.data?.detectCollaborationTool ?? true,
  set: (v) => update('detectCollaborationTool', v),
})
</script>

<template>
  <SectionToggle title="协作路由配置" :count="2">
    <FieldRow label="检测协作工具" hint="开启后自动检测可用的协作工具并路由">
      <el-switch v-model="detectCollaborationTool" />
    </FieldRow>

    <FieldRow label="最大协作轮次" hint="协作交互的最大轮数上限，防止无限循环">
      <el-input-number
        :model-value="Number(props.node.data?.maxCollaborationRounds ?? 3)"
        :min="1"
        :max="20"
        :step="1"
        @update:model-value="update('maxCollaborationRounds', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
