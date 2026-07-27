<script setup lang="ts">
/**
 * ModuleAssembleNodePanel - 模块组装节点属性面板
 *
 * 配置模块类型（oa/hr/finance/audit/custom）+ pattern。
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

const moduleType = computed({
  get: () => props.node.data?.moduleType ?? 'custom',
  set: (v) => update('moduleType', v),
})

const MODULE_OPTIONS = [
  { label: 'OA 办公', value: 'oa', hint: '公文/审批/公告等办公自动化模块' },
  { label: 'HR 人力', value: 'hr', hint: '招聘/考勤/绩效等人力资源管理模块' },
  { label: '财务', value: 'finance', hint: '报销/预算/核算等财务管理模块' },
  { label: '审计', value: 'audit', hint: '日志/追溯/合规审计模块' },
  { label: '自定义', value: 'custom', hint: '自定义模块类型，通过 pattern 指定' },
]
</script>

<template>
  <SectionToggle title="模块组装配置" :count="2">
    <FieldRow label="模块类型" hint="选择业务模块类型">
      <el-select v-model="moduleType" style="width: 100%">
        <el-option
          v-for="opt in MODULE_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </FieldRow>

    <FieldRow label="Pattern" hint="模块组装模式标识，自定义类型时必填">
      <el-input
        :model-value="String(props.node.data?.modulePattern ?? '')"
        placeholder="输入模块 pattern 标识"
        @update:model-value="update('modulePattern', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
