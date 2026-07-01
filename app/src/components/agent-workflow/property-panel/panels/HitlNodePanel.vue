<script setup lang="ts">
import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import HintText from '../HintText.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'
import type { AgentHitlConfirmQuestion } from '@/types/agentWorkflow'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const questions = computed(() =>
  Array.isArray(props.node.data?.confirmQuestions)
    ? (props.node.data.confirmQuestions as AgentHitlConfirmQuestion[])
    : [],
)

const inheritUpstream = computed({
  get: () => props.node.data?.inheritUpstreamQuestions !== false,
  set: (v: boolean) => update('inheritUpstreamQuestions', v),
})

function setQuestions(next: AgentHitlConfirmQuestion[]) {
  update('confirmQuestions', next)
}

function addQuestion() {
  const id = `q${questions.value.length + 1}`
  setQuestions([
    ...questions.value,
    { id, question: '', options: [], required: true },
  ])
}

function removeQuestion(id: string) {
  setQuestions(questions.value.filter((q) => q.id !== id))
}

function patchQuestion(id: string, patch: Partial<AgentHitlConfirmQuestion>) {
  setQuestions(questions.value.map((q) => (q.id === id ? { ...q, ...patch } : q)))
}

function optionsText(q: AgentHitlConfirmQuestion): string {
  return (q.options ?? []).join('\n')
}

function setOptionsFromText(id: string, text: string) {
  const options = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  patchQuestion(id, { options: options.length > 0 ? options : undefined })
}
</script>

<template>
  <SectionToggle title="人工确认" :count="questions.length + 1">
    <FieldRow label="说明" textarea hint="暂停时展示的总体说明">
      <el-input
        type="textarea"
        :rows="2"
        :model-value="String(props.node.data?.confirmMessage ?? '')"
        placeholder="请确认是否继续"
        @update:model-value="update('confirmMessage', $event)"
      />
    </FieldRow>

    <FieldRow label="继承上游问题">
      <el-switch v-model="inheritUpstream" />
      <HintText>
        开启后，自动合并上游 Agent / LLM 输出 JSON 中的 confirmQuestions（与 Chat 需求分析格式一致）
      </HintText>
    </FieldRow>

    <FieldRow label="确认问题">
      <div :class="$style.questionList">
        <div v-for="(q, idx) in questions" :key="q.id" :class="$style.questionCard">
          <div :class="$style.questionHeader">
            <span :class="$style.questionIndex">问题 {{ idx + 1 }}</span>
            <el-button text type="danger" size="small" @click="removeQuestion(q.id)">
              删除
            </el-button>
          </div>
          <el-input
            :model-value="q.question"
            placeholder="问题描述，如：新增节点应添加在什么位置？"
            @update:model-value="patchQuestion(q.id, { question: $event })"
          />
          <el-input
            type="textarea"
            :rows="3"
            :model-value="optionsText(q)"
            placeholder="选项（每行一个，留空则为自由输入）&#10;审批节点前&#10;审批节点后"
            @update:model-value="setOptionsFromText(q.id, $event)"
          />
          <label :class="$style.requiredRow">
            <el-switch
              :model-value="q.required !== false"
              @update:model-value="patchQuestion(q.id, { required: $event })"
            />
            <span>必填</span>
          </label>
        </div>

        <el-button type="primary" plain size="small" @click="addQuestion">
          添加问题
        </el-button>
      </div>
    </FieldRow>
  </SectionToggle>
</template>

<style module>
.questionList {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.questionCard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-small);
  background: var(--bg-color-page);
}

.questionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.questionIndex {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.requiredRow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-color-regular);
}
</style>
