<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import type { AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const store = useAgentWorkflowDesignerStore()
</script>

<template>
  <SectionToggle title="触发配置" :count="1">
    <FieldRow label="入口节点" hint="工作流从此节点开始执行">
      <el-switch
        :model-value="store.entryNodeId === props.node.id"
        @update:model-value="(v: boolean) => { if (v) { store.entryNodeId = props.node.id; store.dirty = true } }"
      />
    </FieldRow>
    <div :class="styles.hint">
      手动触发是画布<strong>入口节点</strong>，不表示「只能人手点一次」；设计器测试、开放 API、AI 对话等通道均可从此入口执行。
    </div>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
