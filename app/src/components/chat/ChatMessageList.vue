<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@schema-platform/platform-shared'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import AiMessage from '../AiMessage.vue'
import type { MessageEmbeddedCard } from '../AiMessage.vue'
import { useChatScroll } from '@/composables/useChatScroll'
import type { StarterPrompt } from '@/stores/chatConfig'
import type { AIMessage, AgentType } from '@/types'

const props = withDefaults(defineProps<{
  messages: AIMessage[]
  agent: AgentType
  loading?: boolean
  starterPrompts?: StarterPrompt[]
}>(), {
  loading: false,
  starterPrompts: () => [],
})

const emit = defineEmits<{
  send: [message: string, agent: AgentType]
  'preview-document': [documentId: string]
  'card-primary-action': [messageIndex: number, cardIndex: number]
  'card-secondary-action': [messageIndex: number, cardIndex: number]
  'open-json-drawer': []
  'retry-tool': [messageIndex: number, toolCallIndex: number]
  'copy-message': [messageIndex: number]
  'regenerate-message': [messageIndex: number]
  'message-feedback': [messageIndex: number, type: 'positive' | 'negative']
  'requirement-confirm': [answers: Record<string, string>]
  'requirement-answer': [questionId: string, value: string]
  'requirement-skip': []
  'select-starter-agent': [agent: AgentType]
}>()

const { t } = useI18n()

const scrollerItems = computed(() =>
  props.messages.map((msg, index) => ({
    msg,
    key: msg.id ?? `msg-${index}`,
    index,
  })),
)

const { messagesRef, onMessagesScroll } = useChatScroll(() => props.messages)

function getDisplayCards(msg: AIMessage): MessageEmbeddedCard[] | undefined {
  if (msg.schema) {
    return [{
      type: 'schema',
      title: t('chat.schemaPreview'),
      fields: msg.schema.map((w) => ({
        icon: 'T',
        name: w.label ?? w.field ?? w.type,
        type: w.type,
        required: false,
      })),
      primaryAction: t('chat.confirmPublish'),
      secondaryAction: t('chat.openInEditor'),
    }]
  }
  if (msg.flow) {
    return [{
      type: 'flow' as const,
      title: t('chat.flowPreview'),
      nodes: msg.flow.nodes.map((n) => ({
        label: n.data.label ?? n.data.bpmnType ?? n.id,
        type: (n.data.bpmnType === 'startEvent' ? 'start' : n.data.bpmnType === 'endEvent' ? 'end' : 'task') as 'start' | 'task' | 'end',
      })),
      graph: msg.flow,
      primaryAction: t('chat.confirmPublish'),
      secondaryAction: t('chat.openInEditor'),
    }]
  }
  return undefined
}

function getLabel(msg: AIMessage): string {
  if (msg.role === 'user') return 'You'
  if (msg.agent) {
    const labels: Record<string, string> = {
      editor: 'Editor',
      flow: 'Flow',
      general: 'AI',
    }
    return labels[msg.agent] ?? 'AI'
  }
  if (props.agent === 'auto') return 'AI'
  return props.agent === 'editor' ? 'Editor' : 'Flow'
}

function handleCardAction(type: 'primary' | 'secondary', msgIdx: number, cardIdx: number) {
  if (type === 'primary') {
    emit('card-primary-action', msgIdx, cardIdx)
  } else {
    emit('card-secondary-action', msgIdx, cardIdx)
  }
}

function handleStarterClick(prompt: StarterPrompt) {
  emit('select-starter-agent', prompt.agent as AgentType)
  emit('send', prompt.text, prompt.agent as AgentType)
}
</script>

<template>
  <div :class="$style.messages">
    <div v-if="messages.length === 0 && !loading" :class="$style.emptyState">
      <div :class="$style.emptyIcon">&#x2726;</div>
      <div :class="$style.emptyTitle">{{ t('chat.emptyTitle') }}</div>
      <div :class="$style.emptySub">{{ t('chat.emptySub') }}</div>
      <div :class="$style.promptGrid">
        <el-button
          v-for="(prompt, idx) in starterPrompts"
          :key="idx"
          :class="$style.promptCard"
          @click="handleStarterClick(prompt)"
        >
          <AppIcon :name="prompt.icon" :size="16" :class="$style.promptIcon" />
          <span :class="$style.promptText">{{ prompt.text }}</span>
        </el-button>
      </div>
    </div>

    <DynamicScroller
      v-else
      ref="messagesRef"
      :items="scrollerItems"
      :min-item-size="72"
      key-field="key"
      :class="$style.messageScroller"
      @scroll="onMessagesScroll"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :data-index="index"
          :size-dependencies="[
            item.msg.content,
            item.msg.thinking,
            item.msg.tip,
            item.msg.toolCalls?.length,
            item.msg.workflowExecution?.nodeRecords?.length,
            item.msg.schema?.length,
            item.msg.flow?.nodes?.length,
            item.msg.documentSummaries?.length,
          ]"
        >
          <AiMessage
            :role="item.msg.role === 'system' ? 'assistant' : item.msg.role"
            :label="getLabel(item.msg)"
            :agent="agent"
            :content="item.msg.content"
            :thinking="item.msg.thinking"
            :tip="item.msg.tip"
            :tool-calls="item.msg.toolCalls"
            :loading="loading && item.msg.role === 'assistant' && !item.msg.content && !item.msg.workflowExecution?.nodeRecords?.length && index === messages.length - 1"
            :cards="getDisplayCards(item.msg)"
            :schema-widgets="item.msg.schema"
            :message-id="item.msg.id"
            :feedback="item.msg.feedback"
            :attachments="item.msg.attachments"
            :document-summaries="item.msg.documentSummaries"
            :workflow-execution="item.msg.workflowExecution"
            @preview-document="emit('preview-document', $event)"
            @card-primary-action="(ci) => handleCardAction('primary', item.index, ci)"
            @card-secondary-action="(ci) => handleCardAction('secondary', item.index, ci)"
            @open-json-drawer="emit('open-json-drawer')"
            @retry-tool="(tci) => emit('retry-tool', item.index, tci)"
            @copy="emit('copy-message', item.index)"
            @regenerate="emit('regenerate-message', item.index)"
            @feedback="(type) => emit('message-feedback', item.index, type)"
            @requirement-confirm="(answers) => emit('requirement-confirm', answers)"
            @requirement-answer="(qid, val) => emit('requirement-answer', qid, val)"
            @requirement-skip="emit('requirement-skip')"
          />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
  </div>
</template>

<style module>
.messages {
  flex: 1;
  overflow: hidden;
  padding: 0;
  background: var(--ai-bg-page, #F5F6FA);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

.messageScroller {
  flex: 1;
  height: 100%;
  padding: 20px 24px;
  overflow-y: auto !important;
}

.messages::-webkit-scrollbar {
  width: 5px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.2);
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 212, 255, 0.35);
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--ai-text-disabled, #C0C4CC);
  text-align: center;
  padding: 40px 20px;
}

.emptyIcon {
  font-size: 40px;
  margin-bottom: 10px;
  color: var(--ai-color-primary, #00d4ff);
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.4), 0 0 40px rgba(0, 212, 255, 0.2);
}

.emptyTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--ai-text-secondary, #666666);
}

.emptySub {
  font-size: 13px;
  margin-top: 4px;
  color: var(--ai-text-disabled, #C0C4CC);
}

.promptGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 20px;
  max-width: 400px;
  width: 100%;
}

.promptCard {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ai-border-light, #EBEDF3);
  background: var(--ai-bg-white, #FFFFFF);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--ai-text-primary, #333333);
  transition: all 0.2s;
}

.promptCard:hover {
  border-color: rgba(0, 212, 255, 0.3);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.12), 0 0 4px rgba(0, 212, 255, 0.15);
  background: var(--ai-bg-gray, #F5F7FA);
}

.promptIcon {
  font-size: 15px;
  flex-shrink: 0;
  opacity: 0.7;
}

.promptText {
  line-height: 1.4;
}
</style>
