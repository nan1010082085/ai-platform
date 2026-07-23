<script setup lang="ts">
/**
 * CodeExecuteNodePanel - 代码执行节点属性面板
 *
 * 在沙箱中执行 JavaScript 代码，支持 $input 和 $node 变量。
 */
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(field: string, value: unknown) {
  emit('update:node', { ...props.node, data: { ...props.node.data, [field]: value } })
}
</script>

<template>
  <SectionToggle title="代码执行" default-open>
    <FieldRow label="语言" hint="目前支持 JavaScript">
      <el-select
        :model-value="String(props.node.data?.codeLanguage ?? 'javascript')"
        size="small"
        @update:model-value="update('codeLanguage', $event)"
      >
        <el-option label="JavaScript" value="javascript" />
      </el-select>
    </FieldRow>

    <FieldRow label="代码" hint="可用变量：$input（工作流输入）、$node（上游节点输出）。返回值作为节点输出。">
      <el-input
        :model-value="String(props.node.data?.codeScript ?? '')"
        type="textarea"
        :rows="8"
        placeholder="// 返回值作为节点输出&#10;return { result: $input.message }"
        @update:model-value="update('codeScript', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>

<style module src="./shared.module.scss" />
