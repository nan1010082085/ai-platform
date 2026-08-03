<script setup lang="ts">
/**
 * CostUsageRenderer - Token 消耗/成本展示渲染器
 *
 * 展示 LLM 调用的 token 消耗和费用估算。
 */
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { StepData } from '@/types'

const props = defineProps<{
  step: StepData
}>()

const costData = computed(() => {
  const data = props.step.costData
  if (!data) return null
  return {
    inputTokens: data.inputTokens ?? 0,
    outputTokens: data.outputTokens ?? 0,
    totalTokens: data.totalTokens ?? (data.inputTokens ?? 0) + (data.outputTokens ?? 0),
    estimatedCost: data.estimatedCost,
    model: data.model ?? '',
    provider: data.provider ?? '',
  }
})

const totalTokensLabel = computed(() => {
  const tokens = costData.value?.totalTokens ?? 0
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return tokens.toString()
})

const costLabel = computed(() => {
  const cost = costData.value?.estimatedCost
  if (cost == null) return null
  if (cost < 0.01) return '<$0.01'
  return `$${cost.toFixed(4)}`
})
</script>

<template>
  <div v-if="costData" :class="$style.card">
    <div :class="$style.header">
      <AppIcon name="coin" :size="14" :class="$style.headerIcon" />
      <span :class="$style.title">Token 消耗</span>
    </div>
    <div :class="$style.body">
      <div :class="$style.stats">
        <div :class="$style.stat">
          <span :class="$style.statLabel">输入</span>
          <span :class="$style.statValue">{{ costData.inputTokens.toLocaleString() }}</span>
        </div>
        <div :class="$style.stat">
          <span :class="$style.statLabel">输出</span>
          <span :class="$style.statValue">{{ costData.outputTokens.toLocaleString() }}</span>
        </div>
        <div :class="[$style.stat, $style.statTotal]">
          <span :class="$style.statLabel">总计</span>
          <span :class="$style.statValue">{{ totalTokensLabel }}</span>
        </div>
      </div>
      <div v-if="costLabel || costData.model" :class="$style.footer">
        <span v-if="costData.model" :class="$style.model">{{ costData.model }}</span>
        <span v-if="costLabel" :class="$style.cost">{{ costLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style module>
.card {
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.headerIcon {
  color: var(--el-color-warning, #e6a23c);
}

.title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.body {
  padding: 12px;
}

.stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.statTotal {
  padding-left: 16px;
  border-left: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.statLabel {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.statValue {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  font-variant-numeric: tabular-nums;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.model {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.cost {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-color-warning, #e6a23c);
}
</style>
