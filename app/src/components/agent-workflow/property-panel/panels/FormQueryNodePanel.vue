<script setup lang="ts">
/**
 * FormQueryNodePanel - 表单查询节点属性面板
 *
 * 配置表单 ID + 过滤条件 + 数量限制。
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

const limit = computed({
  get: () => Number(props.node.data?.formQueryLimit ?? 10),
  set: (v) => update('formQueryLimit', v),
})
</script>

<template>
  <SectionToggle title="表单查询配置" :count="3">
    <FieldRow label="表单 ID" hint="要查询的表单 Schema 标识">
      <el-input
        :model-value="String(props.node.data?.formQuerySchemaId ?? '')"
        placeholder="输入表单 ID"
        @update:model-value="update('formQuerySchemaId', $event)"
      />
    </FieldRow>

    <FieldRow label="过滤条件" hint="JSON 格式查询条件，如 {&quot;status&quot;:&quot;approved&quot;}" textarea>
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.formQueryFilter ?? '')"
        placeholder='{"status": "approved"}'
        @update:model-value="update('formQueryFilter', $event)"
      />
    </FieldRow>

    <FieldRow label="数量限制" hint="最多返回的记录数">
      <el-slider
        v-model="limit"
        :min="1"
        :max="500"
        :step="10"
        show-input
      />
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
