<script setup lang="ts">
/**
 * 用量与成本 — 设置级极简汇总
 *
 * 只保留跨专家成本趋势、预算、平台级异常；日常排障看执行详情运行时条。
 */
import { PageShell, PageHeader } from '@apform-ui/core'
import { RouterLink } from 'vue-router'
import { ref } from 'vue'
import CostTrendCard from '@/components/monitor/CostTrendCard.vue'
import AlertList from '@/components/monitor/AlertList.vue'
import { useAiMonitor } from '@/composables/useAiMonitor'

const costCardRef = ref<{ reload: () => Promise<void> } | null>(null)

const {
  loading,
  alerts,
  alertsTotal,
  alertsPage,
  alertsPageSize,
  handleRefresh: refreshAlerts,
  handleAlertPageChange,
  handleAlertPageSizeChange,
} = useAiMonitor()

/** 同时刷新成本趋势与平台异常 */
async function handleRefresh() {
  await Promise.all([
    refreshAlerts(),
    costCardRef.value?.reload(),
  ])
}
</script>

<template>
  <PageShell>
    <div :class="$style.page" v-loading="loading">
      <PageHeader
        title="用量与成本"
        subtitle="跨专家成本趋势与预算。日常排障请打开工作流执行详情中的本次耗时。"
      >
        <template #actions>
          <RouterLink :to="{ name: 'agent-executions' }" :class="$style.linkBtn">
            查看执行记录
          </RouterLink>
          <el-button type="primary" size="small" :loading="loading" @click="handleRefresh">
            刷新
          </el-button>
        </template>
      </PageHeader>

      <CostTrendCard ref="costCardRef" :class="$style.cost" />

      <section :class="$style.section">
        <div :class="$style.sectionHeader">
          <h3 :class="$style.sectionTitle">平台异常</h3>
          <span :class="$style.sectionHint">次级汇总 · 排障优先看执行详情</span>
        </div>
        <AlertList
          embedded
          :alerts="alerts"
          :total="alertsTotal"
          :current-page="alertsPage"
          :page-size="alertsPageSize"
          @page-change="handleAlertPageChange"
          @size-change="handleAlertPageSizeChange"
        />
      </section>
    </div>
  </PageShell>
</template>

<style module>
.page {
  min-height: 100%;
  max-width: 960px;
}

.linkBtn {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 11px;
  font-size: 12px;
  line-height: 1;
  color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: var(--el-border-radius-base, 4px);
  text-decoration: none;
  background: var(--el-bg-color);
}

.linkBtn:hover {
  background: var(--el-color-primary-light-9);
}

.cost {
  margin-bottom: var(--ai-card-gap, 12px);
}

.section {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.sectionTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  margin: 0;
}

.sectionHint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
