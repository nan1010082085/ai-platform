<script setup lang="ts">
/**
 * AgentHandoffRenderer - 智能体控制转移渲染器
 *
 * 展示智能体间的控制转移：源 agent → 目标 agent，转移原因。
 */
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { StepData } from '@/types'

const props = defineProps<{
  step: StepData
}>()

const handoffData = computed(() => {
  const data = props.step.handoffData
  if (!data) return null
  return {
    sourceAgent: data.sourceAgent ?? '未知',
    targetAgent: data.targetAgent ?? '未知',
    reason: data.reason ?? '',
    timestamp: data.timestamp,
  }
})

const sourceIcon = computed(() => {
  const agent = handoffData.value?.sourceAgent
  if (agent?.includes('editor')) return 'edit'
  if (agent?.includes('flow')) return 'connection'
  if (agent?.includes('page')) return 'document'
  return 'user'
})

const targetIcon = computed(() => {
  const agent = handoffData.value?.targetAgent
  if (agent?.includes('editor')) return 'edit'
  if (agent?.includes('flow')) return 'connection'
  if (agent?.includes('page')) return 'document'
  return 'user'
})
</script>

<template>
  <div v-if="handoffData" :class="$style.card">
    <div :class="$style.header">
      <AppIcon name="switch" :size="14" :class="$style.headerIcon" />
      <span :class="$style.title">智能体切换</span>
    </div>
    <div :class="$style.body">
      <div :class="$style.agentRow">
        <div :class="$style.agent">
          <div :class="$style.agentIcon">
            <AppIcon :name="sourceIcon" :size="14" />
          </div>
          <div :class="$style.agentInfo">
            <span :class="$style.agentLabel">来源</span>
            <span :class="$style.agentName">{{ handoffData.sourceAgent }}</span>
          </div>
        </div>
        <div :class="$style.arrow">
          <AppIcon name="arrow-right" :size="16" />
        </div>
        <div :class="$style.agent">
          <div :class="[$style.agentIcon, $style.agentIconTarget]">
            <AppIcon :name="targetIcon" :size="14" />
          </div>
          <div :class="$style.agentInfo">
            <span :class="$style.agentLabel">目标</span>
            <span :class="$style.agentName">{{ handoffData.targetAgent }}</span>
          </div>
        </div>
      </div>
      <div v-if="handoffData.reason" :class="$style.reason">
        <span :class="$style.reasonLabel}>原因：</span>
        <span :class="$style.reasonText}>{{ handoffData.reason }}</span>
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
  color: var(--el-color-primary, #409eff);
}

.title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.body {
  padding: 12px;
}

.agentRow {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-blank, #fff);
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.agentIcon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
}

.agentIconTarget {
  background: var(--el-color-success-light-9, #f0f9eb);
  color: var(--el-color-success, #67c23a);
}

.agentInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agentLabel {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.agentName {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.arrow {
  flex-shrink: 0;
  color: var(--el-text-color-secondary, #909399);
}

.reason {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light, #f5f7fa);
  font-size: 12px;
}

.reasonLabel {
  color: var(--el-text-color-secondary, #909399);
}

.reasonText {
  color: var(--el-text-color-primary, #303133);
}
</style>
