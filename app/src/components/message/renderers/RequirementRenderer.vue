<script setup lang="ts">
/**
 * RequirementRenderer — requirement_confirm 步骤渲染器
 *
 * 封装 RequirementConfirmCard，提供与其它 renderer 一致的 step 驱动接口。
 * 支持需求分析展示、渐进式确认、选项选择、跳过等交互。
 */

import type { StepData } from '@/types'
import RequirementConfirmCard from '@/components/RequirementConfirmCard.vue'

const props = defineProps<{
  /** requirement_confirm 类型的步骤数据 */
  step: StepData
}>()

const emit = defineEmits<{
  /** 单条答案（选项或输入框提交） */
  'requirement-answer': [questionId: string, value: string]
  /** 所有必填项完成后的确认 */
  'requirement-confirm': [answers: Record<string, string>]
  /** 跳过确认，直接执行 */
  'requirement-skip': []
}>()

function handleAnswer(questionId: string, value: string): void {
  emit('requirement-answer', questionId, value)
}

function handleSkip(): void {
  emit('requirement-skip')
}
</script>

<template>
  <div :class="$style.root">
    <RequirementConfirmCard
      v-if="step.requirementAnalysis"
      :analysis="step.requirementAnalysis"
      :partial-answers="step.requirementPartialAnswers ?? {}"
      :next-question-id="step.requirementNextQuestionId"
      :waiting-confirmation="step.waitingConfirmation ?? true"
      @answer="handleAnswer"
      @skip="handleSkip"
    />
  </div>
</template>

<style module>
.root {
  width: 100%;
}
</style>
