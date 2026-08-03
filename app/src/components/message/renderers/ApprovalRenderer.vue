<script setup lang="ts">
/**
 * ApprovalRenderer - 人工审批节点渲染器
 *
 * HITL 在 message 中的交互形态：显示审批请求、选项、用户操作。
 */
import { ref, computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { StepData } from '@/types'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'approval-approve': [stepIndex: number]
  'approval-reject': [stepIndex: number]
  'approval-answer': [stepIndex: number, questionId: string, value: string]
}>()

const approvalData = computed(() => {
  const data = props.step.approvalData
  if (!data) return null
  return {
    title: data.title ?? '审批请求',
    description: data.description ?? '',
    questions: data.questions ?? [],
    status: data.status ?? 'waiting',
    selectedAnswers: data.selectedAnswers ?? {},
  }
})

const answeredCount = computed(() => {
  return Object.keys(approvalData.value?.selectedAnswers ?? {}).length
})

const totalQuestions = computed(() => {
  return approvalData.value?.questions.length ?? 0
})

const isComplete = computed(() => {
  return answeredCount.value >= totalQuestions.value
})

function handleAnswer(questionId: string, value: string) {
  emit('approval-answer', props.step.index ?? 0, questionId, value)
}

function handleApprove() {
  emit('approval-approve', props.step.index ?? 0)
}

function handleReject() {
  emit('approval-reject', props.step.index ?? 0)
}
</script>

<template>
  <div v-if="approvalData" :class="$style.card">
    <div :class="$style.header">
      <div :class="$style.headerLeft">
        <AppIcon name="user" :size="14" :class="$style.headerIcon" />
        <span :class="$style.title">{{ approvalData.title }}</span>
      </div>
      <el-tag
        :type="approvalData.status === 'approved' ? 'success' : approvalData.status === 'rejected' ? 'danger' : 'warning'"
        size="small"
      >
        {{ approvalData.status === 'approved' ? '已批准' : approvalData.status === 'rejected' ? '已拒绝' : '待审批' }}
      </el-tag>
    </div>

    <div v-if="approvalData.description" :class="$style.description">
      {{ approvalData.description }}
    </div>

    <div v-if="approvalData.questions.length" :class="$style.questions">
      <div
        v-for="question in approvalData.questions"
        :key="question.id"
        :class="$style.question"
      >
        <div :class="$style.questionText">
          <span v-if="question.required" :class="$style.required">*</span>
          {{ question.question }}
        </div>
        <div v-if="question.options?.length" :class="$style.options">
          <el-radio-group
            :model-value="approvalData.selectedAnswers[question.id]"
            @update:model-value="handleAnswer(question.id, $event)"
          >
            <el-radio
              v-for="option in question.options"
              :key="option"
              :value="option"
              :disabled="approvalData.status !== 'waiting'"
            >
              {{ option }}
            </el-radio>
          </el-radio-group>
        </div>
        <el-input
          v-else
          :model-value="approvalData.selectedAnswers[question.id]"
          placeholder="请输入..."
          size="small"
          :disabled="approvalData.status !== 'waiting'"
          @update:model-value="handleAnswer(question.id, $event)"
        />
      </div>
    </div>

    <div v-if="approvalData.status === 'waiting'" :class="$style.actions">
      <el-button type="danger" plain size="small" @click="handleReject">
        <AppIcon name="close" :size="14" style="margin-right: 4px" />
        拒绝
      </el-button>
      <el-button type="primary" size="small" :disabled="!isComplete" @click="handleApprove">
        <AppIcon name="check" :size="14" style="margin-right: 4px" />
        批准
      </el-button>
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
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 6px;
}

.headerIcon {
  color: var(--el-color-primary, #409eff);
}

.title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.description {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.6;
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.questions {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.questionText {
  font-size: 13px;
  color: var(--el-text-color-primary, #303133);
}

.required {
  color: var(--el-color-danger, #f56c6c);
  margin-right: 4px;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--el-border-color-lighter, #e4e7ed);
}
</style>
