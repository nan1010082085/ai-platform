<script setup lang="ts">
/**
 * VariableSetNodePanel - 变量赋值节点属性面板
 *
 * 设置或更新工作流变量，支持 set/append/increment 模式。
 * 变量存在 nodeOutputs.__variables 中，后续节点可通过 $node.__variables.xxx 访问。
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
  <SectionToggle title="变量赋值" default-open>
    <FieldRow label="变量名" hint="变量存在 __variables 命名空间中">
      <el-input
        :model-value="String(props.node.data?.variableName ?? '')"
        size="small"
        placeholder="myVar"
        @update:model-value="update('variableName', $event)"
      />
    </FieldRow>

    <FieldRow label="变量值" hint="支持 {{$input.xxx}} / {{$node.xxx}} 变量引用">
      <el-input
        :model-value="String(props.node.data?.variableValue ?? '')"
        size="small"
        placeholder="{{$input.message}}"
        @update:model-value="update('variableValue', $event)"
      />
    </FieldRow>

    <FieldRow label="赋值模式" hint="set=覆盖、append=数组追加、increment=数值累加">
      <el-select
        :model-value="String(props.node.data?.variableMode ?? 'set')"
        size="small"
        @update:model-value="update('variableMode', $event)"
      >
        <el-option label="覆盖 (set)" value="set" />
        <el-option label="追加 (append)" value="append" />
        <el-option label="累加 (increment)" value="increment" />
      </el-select>
    </FieldRow>
  </SectionToggle>
</template>

<style module src="./shared.module.scss" />
