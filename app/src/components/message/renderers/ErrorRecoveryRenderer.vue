<script setup lang="ts">
/**
 * ErrorRecoveryRenderer - 错误恢复/重试策略选择渲染器
 *
 * 用户可选重试/跳过/回滚。
 */
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { StepData } from '@/types'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'error-retry': [stepIndex: number]
  'error-skip': [stepIndex: number]
  'error-rollback': [stepIndex: number]
}>()

const errorData = computed(() => {
  const data = props.step.errorRecoveryData
  if (!data) return null
  return {
    error: data.error ?? '',
    nodeId: data.nodeId ?? '',
    nodeName: data.nodeName ?? '',
    nodeType: data.nodeType ?? '',
    strategies: data.strategies ?? ['retry', 'skip', 'rollback'],
    selectedStrategy: data.selectedStrategy ?? null,
    retryCount: data.retryCount ?? 0,
    maxRetries: data.maxRetries ?? 3,
  }
})

const canRetry = computed(() => {
  return (errorData.value?.retryCount ?? 0) < (errorData.value?.maxRetries ?? 3)
})

const strategyOptions = computed(() => {
  const strategies = errorData.value?.strategies ?? []
  return strategies.map(s => {
    switch (s) {
      case 'retry': return {
        value: 'retry',
        label: '重试',
        icon: 'refresh',
        description: `重新执行该节点（已重试 ${errorData.value?.retryCount ?? 0} 次）`,
        disabled: !canRetry.value,
      }
      case 'skip': return {
        value: 'skip',
        label: '跳过',
        icon: 'arrow-right',
        description: '跳过该节点，继续执行后续节点',
        disabled: false,
      }
      case 'rollback': return {
        value: 'rollback',
        label: '回滚',
        icon: 'refresh-left',
        description: '回滚到上一个检查点',
        disabled: false,
      }
      default: return {
        value: s,
        label: s,
        icon: 'question',
        description: '',
        disabled: false,
      }
    }
  })
})

function handleStrategy(strategy: string) {
  const stepIndex = props.step.index ?? 0
  switch (strategy) {
    case 'retry': emit('error-retry', stepIndex); break
    case 'skip': emit('error-skip', stepIndex); break
    case 'rollback': emit('error-rollback', stepIndex); break
  }
}
</script>

<template>
  <div v-if="errorData" :class="$style.card">
    <div :class="$style.header">
      <AppIcon name="warning-filled" :size="14" :class="$style.headerIcon" />
      <span :class="$style.title">执行错误</span>
    </div>

    <div :class="$style.body">
      <div :class="$style.errorInfo">
        <div :class="$style.nodeInfo">
          <span :class="$style.nodeLabel">节点：</span>
          <span :class="$style.nodeName">{{ errorData.nodeName }}</span>
          <el-tag size="small" type="info">{{ errorData.nodeType }}</el-tag>
        </div>
        <div :class="$style.errorMessage">
          <AppIcon name="circle-close" :size="14" />
          <span>{{ errorData.error }}</span>
        </div>
      </div>

      <div :class="$style.strategies">
        <div :class="$style.strategyLabel">选择恢复策略：</div>
        <div :class="$style.strategyList">
          <button
            v-for="option in strategyOptions"
            :key="option.value"
            :class="[$style.strategyBtn, option.disabled && $style.strategyDisabled]"
            :disabled="option.disabled"
            @click="handleStrategy(option.value)"
          >
            <AppIcon :name="option.icon" :size="16" />
            <div :class="$style.strategyInfo">
              <span :class="$style.strategyName">{{ option.label }}</span>
              <span :class="$style.strategyDesc">{{ option.description }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style module>
.card {
  border: 1px solid var(--el-color-danger-light-5, #fab6b6);
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--el-color-danger-light-9, #fef0f0);
  border-bottom: 1px solid var(--el-color-danger-light-5, #fab6b6);
}

.headerIcon {
  color: var(--el-color-danger, #f56c6c);
}

.title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-color-danger, #f56c6c);
}

.body {
  padding: 12px;
}

.errorInfo {
  margin-bottom: 12px;
}

.nodeInfo {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.nodeLabel {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.nodeName {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.errorMessage {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-color-danger, #f56c6c);
  font-size: 12px;
  line-height: 1.6;
}

.strategies {
  border-top: 1px solid var(--el-border-color-lighter, #e4e7ed);
  padding-top: 12px;
}

.strategyLabel {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 8px;
}

.strategyList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.strategyBtn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  border-radius: 6px;
  background: var(--el-fill-color-blank, #fff);
  cursor: pointer;
  transition: all 0.15s;
}

.strategyBtn:hover:not(:disabled) {
  border-color: var(--el-color-primary, #409eff);
  background: var(--el-color-primary-light-9, #ecf5ff);
}

.strategyBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.strategyDisabled {
  opacity: 0.5;
}

.strategyInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.strategyName {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.strategyDesc {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}
</style>
