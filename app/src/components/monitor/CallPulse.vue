<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">调用脉冲</h3>
      <span :class="$style.meta">最近 {{ samples.length }} 次</span>
    </div>

    <div v-if="samples.length === 0" :class="$style.empty">暂无近期调用</div>

    <template v-else>
      <div :class="$style.spark">
        <div
          v-for="(item, idx) in samples"
          :key="`${item.id}-${idx}`"
          :class="[$style.bar, item.success ? $style.ok : $style.fail]"
          :style="{ height: `${item.height}%` }"
          :title="`${item.agentName} · ${Math.round(item.duration)}ms`"
        />
      </div>

      <div :class="$style.statsRow">
        <div>
          <div :class="$style.statLabel">成功率</div>
          <div :class="$style.statValue">{{ successRate }}%</div>
        </div>
        <div>
          <div :class="$style.statLabel">平均耗时</div>
          <div :class="$style.statValue">{{ avgDuration }}</div>
        </div>
        <div>
          <div :class="$style.statLabel">失败</div>
          <div :class="[$style.statValue, failCount ? $style.danger : '']">{{ failCount }}</div>
        </div>
      </div>

      <div :class="$style.legend">
        <span><i :class="$style.dotOk" /> 成功</span>
        <span><i :class="$style.dotFail" /> 失败</span>
        <span>柱高 ≈ 相对耗时</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentMetric } from '@/types'
import { formatMonitorDuration } from '@/utils/monitorFormat'

const props = defineProps<{
  metrics: AgentMetric[]
}>()

const samples = computed(() => {
  const list = props.metrics.slice(0, 48).reverse()
  const max = Math.max(...list.map((m) => m.duration), 1)
  return list.map((m) => ({
    ...m,
    height: Math.max(12, Math.round((m.duration / max) * 100)),
  }))
})

const successRate = computed(() => {
  if (!samples.value.length) return 0
  const ok = samples.value.filter((m) => m.success).length
  return Math.round((ok / samples.value.length) * 100)
})

const avgDuration = computed(() => {
  if (!samples.value.length) return '0ms'
  const avg = samples.value.reduce((sum, m) => sum + m.duration, 0) / samples.value.length
  return formatMonitorDuration(avg)
})

const failCount = computed(() => samples.value.filter((m) => !m.success).length)
</script>

<style module>
.container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.empty {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.spark {
  flex: 1;
  min-height: 120px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  padding: 8px 2px 4px;
}

.bar {
  flex: 1;
  min-width: 4px;
  border-radius: 3px 3px 1px 1px;
  opacity: 0.9;
}

.ok { background: color-mix(in srgb, var(--el-color-success) 75%, #93c5fd); }
.fail { background: var(--el-color-danger); }

.statsRow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.statLabel {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.statValue {
  margin-top: 2px;
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.danger { color: var(--el-color-danger); }

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.dotOk,
.dotFail {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.dotOk { background: var(--el-color-success); }
.dotFail { background: var(--el-color-danger); }
</style>
