<script setup lang="ts">
/**
 * ExecutionHITLDialog - 工作流执行的人工确认（HITL）弹窗
 *
 * 从 AgentExecutionDetailView 抽出。接收等待中的节点记录与执行 ID，
 * 内部管理确认/拒绝交互，完成后 emit resolved 让父组件刷新。
 */
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import HitlConfirmQuestions from '@/components/agent-workflow/HitlConfirmQuestions.vue'
import { resumeExecution } from '@/api/agentWorkflowApi'
import type { AgentHitlConfirmQuestion, AgentNodeRecord } from '@/types/agentWorkflow'
import styles from './ExecutionHITLDialog.module.scss'

const props = defineProps<{
  visible: boolean
  waitingRecord: AgentNodeRecord | null
  executionId: string
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  resolved: []
}>()

const action = ref<'approve' | 'reject'>('approve')
const comment = ref('')
const submitting = ref(false)
const answers = ref<Record<string, string>>({})
const questionsRef = ref<InstanceType<typeof HitlConfirmQuestions> | null>(null)

const confirmMessage = computed(() => {
  const output = props.waitingRecord?.output as Record<string, unknown> | undefined
  return (output?.message as string) ?? '请确认是否继续执行'
})

const questions = computed((): AgentHitlConfirmQuestion[] => {
  const output = props.waitingRecord?.output as Record<string, unknown> | undefined
  const raw = output?.confirmQuestions
  if (!Array.isArray(raw)) return []
  return raw
    .filter((q): q is Record<string, unknown> => q != null && typeof q === 'object')
    .map((q, i) => ({
      id: String(q.id ?? `q${i + 1}`),
      question: String(q.question ?? ''),
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      required: q.required !== false,
    }))
})

const dialogWidth = computed(() => (questions.value.length > 0 ? '560px' : '460px'))

const canSubmit = computed(() => {
  if (action.value === 'reject') return true
  if (questions.value.length === 0) return true
  return questions.value
    .filter((q) => q.required !== false)
    .every((q) => answers.value[q.id]?.trim())
})

function initAnswers() {
  const next: Record<string, string> = {}
  for (const q of questions.value) {
    next[q.id] = answers.value[q.id] ?? ''
  }
  answers.value = next
}

watch(
  () => props.visible,
  (v) => {
    if (v) initAnswers()
  },
)

async function confirm() {
  if (action.value === 'approve' && questions.value.length > 0) {
    if (!(questionsRef.value?.canConfirm ?? false)) {
      ElMessage.warning('请先回答所有必填问题')
      return
    }
  }
  submitting.value = true
  try {
    const approved = action.value === 'approve'
    await resumeExecution(props.executionId, {
      approved,
      comment: comment.value,
      answers: answers.value,
    })
    ElMessage.success(approved ? '已确认继续' : '已拒绝')
    emit('update:visible', false)
    comment.value = ''
    answers.value = {}
    emit('resolved')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    submitting.value = false
  }
}

defineExpose({ setAction: (a: 'approve' | 'reject') => { action.value = a } })
</script>

<template>
  <AppDialog
    :model-value="visible"
    :title="action === 'approve' ? '人工确认 - 继续' : '人工确认 - 拒绝'"
    :width="dialogWidth"
    :show-fullscreen-btn="false"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="waitingRecord" :class="styles.nodeInfo">
      <AppIcon name="bell" :size="16" />
      <span>{{ waitingRecord.nodeName }}</span>
    </div>
    <div :class="styles.prompt">{{ confirmMessage }}</div>

    <HitlConfirmQuestions
      v-if="questions.length > 0 && action === 'approve'"
      ref="questionsRef"
      v-model:answers="answers"
      :questions="questions"
    />

    <el-input
      v-model="comment"
      type="textarea"
      :rows="3"
      :placeholder="action === 'approve' ? '审批备注（可选）' : '拒绝原因（可选）'"
    />
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button
        :type="action === 'approve' ? 'primary' : 'danger'"
        :loading="submitting"
        :disabled="action === 'approve' && !canSubmit"
        @click="confirm"
      >
        {{ action === 'approve' ? '确认继续' : '确认拒绝' }}
      </el-button>
    </template>
  </AppDialog>
</template>
