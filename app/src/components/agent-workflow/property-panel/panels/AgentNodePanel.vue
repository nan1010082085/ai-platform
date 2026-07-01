<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="Agent 配置" :count="2">
    <FieldRow label="专家类型" hint="选择平台内置 Agent，或自动识别">
      <el-select
        :model-value="String(props.node.data?.agentType ?? 'general')"
        @update:model-value="update('agentType', $event)"
      >
        <el-option label="自动识别" value="auto" />
        <el-option label="General 通用" value="general" />
        <el-option label="Editor 表单专家" value="editor" />
        <el-option label="Flow 流程专家" value="flow" />
        <el-option label="Page 页面专家" value="page" />
      </el-select>
    </FieldRow>
    <FieldRow label="任务指令" textarea hint="可选，覆盖上游输出作为 Agent 输入">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.prompt ?? '')"
        placeholder="留空则使用上游节点输出"
        @update:model-value="update('prompt', $event)"
      />
    </FieldRow>
    <div :class="styles.hint">
      <template v-if="(props.node.data?.agentType ?? 'general') === 'auto'">
        自动识别：根据输入内容自动判断使用 Editor/Flow/Page 专家
      </template>
      <template v-else-if="(props.node.data?.agentType ?? 'general') === 'editor'">
        Editor 专家：生成/校验/更新 Schema 表单，可调用搜索、校验、组件库等工具
      </template>
      <template v-else-if="(props.node.data?.agentType ?? 'general') === 'flow'">
        Flow 专家：生成/校验/更新 BPMN 流程，可调用流程搜索、绑定 Schema 等工具
      </template>
      <template v-else-if="(props.node.data?.agentType ?? 'general') === 'page'">
        Page 专家：页面级生成，复用 Editor 工具集
      </template>
      <template v-else>
        General 通用：通用 LLM 推理，可调用 RAG 检索工具
      </template>
    </div>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
