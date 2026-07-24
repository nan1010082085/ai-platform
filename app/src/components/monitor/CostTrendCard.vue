<script setup lang="ts">
/**
 * CostTrendCard - 成本趋势卡片
 *
 * 展示每日 token 消耗趋势（CSS 柱状图）+ 按 agent 分布 + 预算状态。
 * 嵌入 AiMonitorView 或独立使用。
 */
import { ref, onMounted, computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { getCostTrend, getBudgetStatus, type CostTrendData, type BudgetStatus } from '@/api/aiApi/monitor'
import styles from './CostTrendCard.module.scss'

const trend = ref<CostTrendData | null>(null)
const budget = ref<BudgetStatus | null>(null)
const loading = ref(false)
const days = ref(30)

const maxTokens = computed(() => {
  if (!trend.value?.trend.length) return 1
  return Math.max(...trend.value.trend.map((d) => d.totalTokens), 1)
})

const topAgents = computed(() => (trend.value?.byAgent ?? []).slice(0, 5))

const budgetColor = computed(() => {
  if (!budget.value?.configured) return ''
  if (budget.value.status === 'exceeded') return 'exception'
  if (budget.value.status === 'warning') return 'warning'
  return 'success'
})

async function loadData() {
  loading.value = true
  try {
    const [t, b] = await Promise.all([
      getCostTrend(days.value),
      getBudgetStatus(),
    ])
    trend.value = t
    budget.value = b
  } catch {
    // 静默
  } finally {
    loading.value = false
  }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

onMounted(loadData)
</script>

<template>
  <div :class="styles.card" v-loading="loading">
    <div :class="styles.header">
      <h3 :class="styles.title">
        <AppIcon name="data-line" :size="16" /> 成本趋势
      </h3>
      <div :class="styles.controls">
        <el-select v-model="days" size="small" style="width: 100px" @change="loadData">
          <el-option :value="7" label="近 7 天" />
          <el-option :value="30" label="近 30 天" />
          <el-option :value="90" label="近 90 天" />
        </el-select>
      </div>
    </div>

    <!-- 预算状态 -->
    <div v-if="budget?.configured" :class="styles.budgetBar">
      <div :class="styles.budgetHeader">
        <span>本月预算</span>
        <span :class="styles.budgetUsage">{{ budget.usagePercent }}%</span>
      </div>
      <el-progress
        :percentage="Math.min(budget.usagePercent ?? 0, 100)"
        :status="budgetColor"
        :stroke-width="8"
      />
      <div :class="styles.budgetMeta">
        <span>已用 {{ formatTokens(budget.usedTokens ?? 0) }}</span>
        <span>剩余 {{ formatTokens(budget.remainingTokens ?? 0) }}</span>
        <span>上限 {{ formatTokens(budget.budget ?? 0) }}</span>
      </div>
    </div>

    <!-- 每日趋势柱状图 -->
    <div v-if="trend?.trend.length" :class="styles.chartSection">
      <div :class="styles.chartBars">
        <div
          v-for="day in trend.trend"
          :key="day.date"
          :class="styles.barCol"
          :title="`${day.date}: ${formatTokens(day.totalTokens)} tokens (${day.callCount} 次)`"
        >
          <div
            :class="styles.bar"
            :style="{ height: `${Math.max(4, (day.totalTokens / maxTokens) * 100)}%` }"
          />
          <span :class="styles.barLabel">{{ day.date.slice(5) }}</span>
        </div>
      </div>
      <div :class="styles.chartSummary">
        <span>总计 {{ formatTokens(trend.totalTokens) }} tokens</span>
        <span>{{ trend.totalCalls }} 次调用</span>
        <span>日均 {{ formatTokens(Math.round(trend.totalTokens / Math.max(trend.trend.length, 1))) }}</span>
      </div>
    </div>

    <!-- 按 Agent 分布 -->
    <div v-if="topAgents.length" :class="styles.agentSection">
      <h4 :class="styles.subTitle">按 Agent 分布</h4>
      <div :class="styles.agentList">
        <div v-for="agent in topAgents" :key="agent.agentName" :class="styles.agentRow">
          <span :class="styles.agentName">{{ agent.agentName || '未命名' }}</span>
          <div :class="styles.agentBar">
            <div
              :class="styles.agentBarFill"
              :style="{ width: `${(agent.totalTokens / (topAgents[0]?.totalTokens ?? 1)) * 100}%` }"
            />
          </div>
          <span :class="styles.agentTokens">{{ formatTokens(agent.totalTokens) }}</span>
        </div>
      </div>
    </div>

    <div v-if="!trend?.trend.length && !loading" :class="styles.empty}>
      <AppIcon name="data-line" :size="28" />
      <span>暂无 token 消耗数据</span>
    </div>
  </div>
</template>
