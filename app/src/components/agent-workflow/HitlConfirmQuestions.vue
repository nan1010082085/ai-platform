<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { AgentHitlConfirmQuestion } from '@/types/agentWorkflow'

const props = defineProps<{
  questions: AgentHitlConfirmQuestion[]
}>()

const answers = defineModel<Record<string, string>>('answers', { required: true })

const canConfirm = computed(() =>
  props.questions
    .filter((q) => q.required !== false)
    .every((q) => answers.value[q.id]?.trim()),
)

defineExpose({ canConfirm })

function selectOption(questionId: string, option: string) {
  answers.value = { ...answers.value, [questionId]: option }
}
</script>

<template>
  <div v-if="questions.length > 0" :class="$style.section">
    <div :class="$style.title">
      <AppIcon name="question-filled" :size="14" />
      <span>请确认以下信息</span>
    </div>

    <div :class="$style.list">
      <div v-for="(q, idx) in questions" :key="q.id" :class="$style.item">
        <div :class="$style.questionText">
          <span :class="$style.index">{{ idx + 1 }}</span>
          <span>{{ q.question }}</span>
          <span v-if="q.required !== false" :class="$style.required">*</span>
        </div>

        <div v-if="q.options && q.options.length > 0" :class="$style.options">
          <button
            v-for="opt in q.options"
            :key="opt"
            type="button"
            :class="[$style.option, { [$style.optionSelected]: answers[q.id] === opt }]"
            @click="selectOption(q.id, opt)"
          >
            {{ opt }}
          </button>
        </div>

        <el-input
          v-else
          :model-value="answers[q.id] ?? ''"
          :placeholder="`请输入：${q.question}`"
          size="default"
          @update:model-value="answers = { ...answers, [q.id]: $event }"
        />
      </div>
    </div>
  </div>
</template>

<style module>
.section {
  margin-bottom: 16px;
}

.title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.item {
  padding: 12px;
  background: var(--bg-color-page);
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-small);
}

.questionText {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color-primary);
}

.index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
}

.required {
  color: var(--color-danger);
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  background: var(--bg-color-white);
  color: var(--text-color-regular);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.option:hover {
  border-color: var(--color-primary);
}

.optionSelected {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  color: var(--color-primary);
}
</style>
