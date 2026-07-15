<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">Agent 分布</h3>
      <span :class="$style.meta">按调用量</span>
    </div>

    <div v-if="distribution.length === 0" :class="$style.empty">
      暂无调用数据
    </div>

    <div v-else :class="$style.bars">
      <div
        v-for="item in sorted"
        :key="item.agent"
        :class="$style.bar"
      >
        <div :class="$style.barHeader">
          <span :class="$style.agentName">
            <i :class="$style.dot" :style="{ background: agentColors[item.agent] ?? '#6b7280' }" />
            {{ agentLabels[item.agent] ?? item.agent }}
          </span>
          <span :class="$style.agentStats">
            {{ item.percentage }}% · {{ item.count }}
          </span>
        </div>
        <div :class="$style.barTrack">
          <div
            :class="$style.barFill"
            :style="{ width: `${item.percentage}%`, backgroundColor: agentColors[item.agent] ?? '#6b7280' }"
          />
        </div>
        <div :class="$style.barFooter">
          <span :class="item.successRate >= 95 ? $style.good : $style.warn">
            成功率 {{ item.successRate.toFixed(1) }}%
          </span>
          <span>平均 {{ formatDuration(item.avgDuration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface DistributionItem {
  agent: string
  count: number
  percentage: number
  successRate: number
  avgDuration: number
}

const props = defineProps<{
  distribution: DistributionItem[]
}>()

const sorted = computed(() =>
  [...props.distribution].sort((a, b) => b.count - a.count),
)

const agentLabels: Record<string, string> = {
  router: 'Router 路由',
  thinker: 'Thinker 思考',
  editor: 'Editor 表单',
  flow: 'Flow 流程',
  page: 'Page 页面',
  general: 'General 通用',
  summarizer: 'Summarizer 总结',
}

const agentColors: Record<string, string> = {
  router: '#8b5cf6',
  thinker: '#6366f1',
  editor: '#3b82f6',
  flow: '#10b981',
  page: '#f59e0b',
  general: '#6b7280',
  summarizer: '#14b8a6',
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}
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
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.barHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agentName {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.agentStats {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.barTrack {
  height: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.barFooter {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.good { color: var(--el-color-success); }
.warn { color: var(--el-color-warning); }
</style>
