<script setup lang="ts">
import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import type { AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<{
  'updateNodeData': [key: string, value: unknown]
}>()
const store = useAgentWorkflowDesignerStore()

const webhookUrl = computed(() => {
  const path = String(props.node.data?.webhookPath ?? '/hook').trim()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/api/ai/webhooks${normalized}`
})

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="Webhook 配置" :count="3">
    <FieldRow label="入口节点" hint="工作流从此节点开始执行">
      <el-switch
        :model-value="store.entryNodeId === props.node.id"
        @update:model-value="(v: boolean) => { if (v) { store.entryNodeId = props.node.id; store.dirty = true } }"
      />
    </FieldRow>
    <FieldRow label="路径" hint="Webhook 路径，自动加 /api/ai/webhooks 前缀">
      <el-input
        :model-value="String(props.node.data?.webhookPath ?? '/hook')"
        placeholder="/hook"
        @update:model-value="update('webhookPath', $event)"
      />
    </FieldRow>
    <FieldRow label="方法" hint="HTTP 方法">
      <el-select
        :model-value="String(props.node.data?.webhookMethod ?? 'POST')"
        @update:model-value="update('webhookMethod', $event)"
      >
        <el-option label="POST" value="POST" />
        <el-option label="GET" value="GET" />
      </el-select>
    </FieldRow>
    <div :class="styles.hint">
      Webhook 地址：<code>{{ webhookUrl }}</code>
    </div>
    <div :class="styles.hint">触发时 HTTP body / query 将作为 <code>$input</code></div>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
