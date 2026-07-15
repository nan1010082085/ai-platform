<template>
  <div :class="$style.summary">
    <div :class="[$style.hero, healthTone]">
      <div :class="$style.score">
        <span :class="$style.scoreValue">{{ healthScore }}</span>
        <span :class="$style.scoreLabel">健康分</span>
      </div>
      <div :class="$style.heroBody">
        <div :class="$style.heroTitle">运行态势</div>
        <p :class="$style.heroDesc">{{ healthText }}</p>
        <div :class="$style.heroMeta">
          <span>峰值 {{ formatDuration(summary?.maxDuration ?? 0) }}</span>
          <span>慢调用 {{ summary?.slowCalls ?? 0 }}</span>
          <span>Token {{ formatTokens(summary?.totalTokens ?? 0) }}</span>
        </div>
      </div>
    </div>

    <div v-for="card in cards" :key="card.key" :class="$style.card">
      <div :class="$style.cardHead">
        <span :class="$style.cardIcon" :style="{ color: card.color }">
          <AppIcon :name="card.icon" :size="16" />
        </span>
        <span :class="$style.label">{{ card.label }}</span>
      </div>
      <div :class="[$style.value, card.tone]">{{ card.value }}</div>
      <div :class="$style.sub">{{ card.sub }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { MonitorSummary } from '@/types'

const props = defineProps<{
  summary: MonitorSummary | null
  alertCount?: number
}>()

const healthScore = computed(() => {
  const s = props.summary
  if (!s) return 0
  let score = 100
  score -= Math.max(0, 95 - s.successRate) * 1.5
  score -= Math.min(30, (s.avgDuration / 1000) * 6)
  score -= Math.min(20, s.slowCalls * 2)
  score -= Math.min(15, (props.alertCount ?? 0) * 3)
  return Math.max(0, Math.round(score))
})

const healthTone = computed(() => {
  if (healthScore.value >= 85) return 'toneGood'
  if (healthScore.value >= 65) return 'toneWarn'
  return 'toneBad'
})

const healthText = computed(() => {
  if (!props.summary) return '等待监控数据…'
  if (healthScore.value >= 85) return '调用整体稳定，成功率与时延处于健康区间。'
  if ((props.summary.successRate ?? 0) < 95) return '成功率偏低，请优先排查失败告警与模型依赖。'
  if ((props.summary.avgDuration ?? 0) > 3000) return '平均耗时偏高，建议关注慢调用与工具链瓶颈。'
  return '存在可优化空间，结合告警与 Agent 分布继续诊断。'
})

const cards = computed(() => {
  const s = props.summary
  return [
    {
      key: 'calls',
      label: '总调用',
      icon: 'data-line' as const,
      color: '#3b82f6',
      value: formatNumber(s?.totalCalls ?? 0),
      sub: '选定时间窗内',
      tone: '',
    },
    {
      key: 'success',
      label: '成功率',
      icon: 'circle-check' as const,
      color: '#10b981',
      value: formatPercent(s?.successRate ?? 0),
      sub: '失败需关注告警',
      tone: (s?.successRate ?? 0) >= 95 ? 'text-success' : (s?.successRate ?? 0) >= 90 ? 'text-warning' : 'text-danger',
    },
    {
      key: 'latency',
      label: '平均耗时',
      icon: 'timer' as const,
      color: '#f59e0b',
      value: formatDuration(s?.avgDuration ?? 0),
      sub: `峰值 ${formatDuration(s?.maxDuration ?? 0)}`,
      tone: (s?.avgDuration ?? 0) <= 1000 ? 'text-success' : (s?.avgDuration ?? 0) <= 3000 ? 'text-warning' : 'text-danger',
    },
    {
      key: 'tokens',
      label: 'Token',
      icon: 'cpu' as const,
      color: '#8b5cf6',
      value: formatTokens(s?.totalTokens ?? 0),
      sub: `慢调用 ${s?.slowCalls ?? 0}`,
      tone: '',
    },
  ]
})

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}
</script>

<style module>
.summary {
  display: grid;
  grid-template-columns: 1.5fr repeat(4, 1fr);
  gap: 14px;
}

.hero {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  background:
    linear-gradient(140deg, color-mix(in srgb, var(--ring-color, var(--el-color-primary)) 10%, transparent), transparent 55%),
    var(--el-bg-color);
}

.toneGood { --ring-color: var(--el-color-success); }
.toneWarn { --ring-color: var(--el-color-warning); }
.toneBad { --ring-color: var(--el-color-danger); }

.score {
  width: 78px;
  height: 78px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--ring-color) 14%, transparent);
  color: var(--ring-color);
  flex-shrink: 0;
}

.scoreValue {
  font-size: 24px;
  font-weight: 750;
  line-height: 1;
}

.scoreLabel {
  font-size: 11px;
  opacity: 0.85;
}

.heroBody { min-width: 0; }
.heroTitle {
  font-size: 14px;
  font-weight: 650;
  color: var(--el-text-color-primary);
}
.heroDesc {
  margin: 6px 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
.heroMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 11px;
  color: var(--el-text-color-regular);
}

.card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cardHead {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cardIcon { display: inline-flex; }

.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.1;
}

.sub {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1200px) {
  .summary { grid-template-columns: 1fr 1fr; }
  .hero { grid-column: 1 / -1; }
}

@media (max-width: 640px) {
  .summary { grid-template-columns: 1fr; }
}

:global(.text-success) { color: var(--el-color-success); }
:global(.text-warning) { color: var(--el-color-warning); }
:global(.text-danger) { color: var(--el-color-danger); }
</style>
