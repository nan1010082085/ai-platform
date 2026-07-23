<script setup lang="ts">
/**
 * SwitchNodePanel - 多路分支节点属性面板
 *
 * 根据多个条件表达式路由到不同分支，类似 switch-case。
 * 每个分支有标签和表达式，按顺序求值，第一个匹配的分支生效。
 */
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const branches = computed(() => (props.node.data?.switchBranches ?? []) as Array<{ label: string; expression: string }>)

function update(field: string, value: unknown) {
  emit('update:node', { ...props.node, data: { ...props.node.data, [field]: value } })
}

function updateBranch(index: number, field: 'label' | 'expression', value: string) {
  const next = [...branches.value]
  next[index] = { ...next[index], [field]: value }
  update('switchBranches', next)
}

function addBranch() {
  const next = [...branches.value, { label: `分支${branches.value.length + 1}`, expression: 'true' }]
  update('switchBranches', next)
}

function removeBranch(index: number) {
  const next = branches.value.filter((_, i) => i !== index)
  update('switchBranches', next)
}
</script>

<template>
  <SectionToggle title="多路分支" default-open>
    <FieldRow label="分支列表" hint="按顺序求值，第一个匹配的分支生效；都不匹配时走 default">
      <div :class="$style.branches">
        <div v-for="(branch, idx) in branches" :key="idx" :class="$style.branch">
          <el-input
            :model-value="branch.label"
            size="small"
            placeholder="分支标签"
            @update:model-value="updateBranch(idx, 'label', $event)"
          />
          <el-input
            :model-value="branch.expression"
            size="small"
            placeholder="条件表达式"
            @update:model-value="updateBranch(idx, 'expression', $event)"
          />
          <button type="button" :class="$style.removeBtn" @click="removeBranch(idx)">
            <AppIcon name="close" :size="14" />
          </button>
        </div>
        <el-button size="small" link type="primary" @click="addBranch">
          <AppIcon name="plus" :size="14" style="margin-right: 4px" />
          添加分支
        </el-button>
      </div>
    </FieldRow>
  </SectionToggle>
</template>

<style module>
.branches {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.branch {
  display: flex;
  align-items: center;
  gap: 6px;
}

.removeBtn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-placeholder, #c0c4cc);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.removeBtn:hover {
  color: var(--el-color-danger, #f56c6c);
}
</style>
