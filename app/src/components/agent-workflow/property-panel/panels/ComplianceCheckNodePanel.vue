<script setup lang="ts">
/**
 * ComplianceCheckNodePanel - 合规检查节点属性面板
 *
 * 配置行业（medical/finance/education/general）+ 规则列表（多选输入）。
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

const industry = computed({
  get: () => props.node.data?.complianceIndustry ?? 'general',
  set: (v) => update('complianceIndustry', v),
})

const rules = computed<string[]>(() => (props.node.data?.complianceRules as string[]) ?? [])

const INDUSTRY_OPTIONS = [
  { label: '医疗', value: 'medical', hint: '医疗器械/药品/诊疗合规' },
  { label: '金融', value: 'finance', hint: '银行/证券/保险合规' },
  { label: '教育', value: 'education', hint: '教育内容/隐私保护合规' },
  { label: '通用', value: 'general', hint: '通用内容合规检查' },
]

function addRule() {
  update('complianceRules', [...rules.value, ''])
}

function removeRule(idx: number) {
  update('complianceRules', rules.value.filter((_, i) => i !== idx))
}

function updateRule(idx: number, value: string) {
  const list = [...rules.value]
  list[idx] = value
  update('complianceRules', list)
}
</script>

<template>
  <SectionToggle title="合规检查配置" :count="2">
    <FieldRow label="行业" hint="选择适用行业，决定规则基线">
      <el-select v-model="industry" style="width: 100%">
        <el-option
          v-for="opt in INDUSTRY_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </FieldRow>

    <FieldRow label="规则列表" hint="自定义合规检查规则，逐条输入">
      <div style="width: 100%">
        <div
          v-for="(rule, idx) in rules"
          :key="idx"
          style="display: flex; gap: 8px; margin-bottom: 8px;"
        >
          <el-input
            :model-value="rule"
            placeholder="输入合规规则描述"
            @update:model-value="(v: string) => updateRule(idx, v)"
          />
          <el-button link type="danger" size="small" @click="removeRule(idx)">
            删除
          </el-button>
        </div>
        <el-button link type="primary" size="small" @click="addRule">
          添加规则
        </el-button>
        <div
          v-if="rules.length === 0"
          style="font-size: 12px; color: var(--el-text-color-secondary); padding: 4px 0;"
        >
          点击「添加规则」配置合规检查规则
        </div>
      </div>
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
