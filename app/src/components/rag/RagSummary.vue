<template>
  <div :class="$style.summary">
    <div :class="$style.card">
      <div :class="$style.label">流程总数</div>
      <div :class="$style.value">{{ status?.totalFlows ?? 0 }}</div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">Schema 总数</div>
      <div :class="$style.value">{{ status?.totalSchemas ?? 0 }}</div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">已索引</div>
      <div :class="[$style.value, $style.valueSuccess]">{{ status?.indexed ?? 0 }}</div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">待索引</div>
      <div :class="[$style.value, unindexedClass]">{{ status?.unindexed ?? 0 }}</div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">过期索引</div>
      <div :class="[$style.value, staleClass]">{{ status?.stale ?? 0 }}</div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">覆盖率</div>
      <div :class="[$style.value, healthClass]">{{ healthPercent }}%</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RagStatusData } from '@/api/aiApi'

const props = defineProps<{
  status: RagStatusData | null
  healthPercent: number
}>()

const healthClass = computed(() => {
  if (props.healthPercent >= 90) return 'valueSuccess'
  if (props.healthPercent >= 50) return 'valueWarning'
  return 'valueDanger'
})

const unindexedClass = computed(() => {
  const count = props.status?.unindexed ?? 0
  if (count === 0) return 'valueSuccess'
  if (count <= 3) return 'valueWarning'
  return 'valueDanger'
})

const staleClass = computed(() => {
  const count = props.status?.stale ?? 0
  if (count === 0) return 'valueSuccess'
  return 'valueWarning'
})
</script>

<style module>
.summary {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.valueSuccess {
  color: var(--el-color-success);
}

.valueWarning {
  color: var(--el-color-warning);
}

.valueDanger {
  color: var(--el-color-danger);
}

@media (max-width: 1100px) {
  .summary {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 720px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
