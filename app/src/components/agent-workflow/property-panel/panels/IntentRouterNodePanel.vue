<script setup lang="ts">
/**
 * IntentRouterNodePanel — 意图路由节点属性面板
 *
 * 配置路由模式、多意图链、回退专家。
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

const routingMode = computed({
  get: () => props.node.data?.routingMode ?? 'auto',
  set: (v) => update('routingMode', v),
})

const enableMultiIntentChain = computed({
  get: () => props.node.data?.enableMultiIntentChain ?? false,
  set: (v) => update('enableMultiIntentChain', v),
})
</script>

<template>
  <SectionToggle title="意图路由配置" :count="3">
    <FieldRow label="路由模式" hint="auto 自动识别意图并路由，explicit 手动指定">
      <el-radio-group v-model="routingMode">
        <el-radio value="auto">自动</el-radio>
        <el-radio value="explicit">显式</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="多意图链" hint="开启后单条消息中多个意图会依次执行">
      <el-switch v-model="enableMultiIntentChain" />
    </FieldRow>

    <FieldRow label="回退专家 ID" hint="意图无法匹配时的兜底专家">
      <el-input
        :model-value="String(props.node.data?.fallbackExpertId ?? '')"
        placeholder="留空则无回退"
        @update:model-value="update('fallbackExpertId', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
