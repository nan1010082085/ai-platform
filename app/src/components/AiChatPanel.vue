<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@schema-platform/platform-shared'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import TaskChainBar from './TaskChainBar.vue'
import AiRagSearch from './AiRagSearch.vue'
import AiMentionInput from './AiMentionInput.vue'
import SmartSuggestionCard from './SmartSuggestionCard.vue'
import DocumentPreviewDrawer from './document/DocumentPreviewDrawer.vue'
import ChatMessageList from './chat/ChatMessageList.vue'
import AgentWorkflowPicker from '@/components/AgentWorkflowPicker.vue'
import { useAiStore } from '@/stores/ai'
import { usePublishedAgentWorkflows } from '@/composables/usePublishedAgentWorkflows'
import { useShellEmbed } from '@/composables/useShellEmbed'
import { useSmartSuggestions } from '@/composables/useSmartSuggestions'
import { useChatAttachments } from '@/composables/useChatAttachments'
import { DOCUMENT_UPLOAD_ACCEPT, DOCUMENT_FORMAT_LABEL } from '@schema-platform/platform-shared/ai'
import {
  AI_CHAT_PANEL_DEFAULTS,
  type AiChatPanelProps,
  type AiChatPanelEmits,
} from './chat/chatPanelTypes'
import type { AgentType, MentionReference } from '@/types'

export type { AiChatPanelProps }

const props = withDefaults(defineProps<AiChatPanelProps>(), AI_CHAT_PANEL_DEFAULTS)
const emit = defineEmits<AiChatPanelEmits>()

const { t } = useI18n()
const selectedAgent = ref<AgentType>(props.agent)
const mentionInputRef = ref<InstanceType<typeof AiMentionInput>>()
const ragVisible = ref(false)
const workflowPickerVisible = ref(false)
const store = useAiStore()
const router = useRouter()
const { shouldHideSubAppMenu } = useShellEmbed()
const { loadPublishedWorkflows, getWorkflowName } = usePublishedAgentWorkflows()

const {
  suggestions: allSuggestions,
  acceptedIds: suggestionAcceptedIds,
  dismissedIds: suggestionDismissedIds,
  acceptSuggestion,
  dismissSuggestion,
} = useSmartSuggestions({
  messages: computed(() => props.messages),
  currentSchema: computed(() => store.currentSchema),
  currentFlow: computed(() => store.currentFlow),
})
const visibleSuggestions = computed(() =>
  allSuggestions.value.filter((s) => !suggestionAcceptedIds.value.has(s.id) && !suggestionDismissedIds.value.has(s.id)),
)
function handleSuggestionAccept(id: string): void {
  acceptSuggestion(id)
  emit('suggestion-accept', id)
}
function handleSuggestionDismiss(id: string): void {
  dismissSuggestion(id)
  emit('suggestion-dismiss', id)
}

const selectedWorkflowId = computed({
  get: () => store.chatSettings.agentWorkflowId,
  set: (value: string | null) => store.updateAgentWorkflowId(value),
})

const selectedWorkflowName = computed(() => getWorkflowName(selectedWorkflowId.value))

function openWorkflowList() {
  workflowPickerVisible.value = false
  void router.push({ name: 'agent-workflows' })
}

onMounted(() => {
  loadPublishedWorkflows().catch(() => {})
})

watch(workflowPickerVisible, (visible) => {
  if (visible) {
    loadPublishedWorkflows(true).catch(() => {})
  }
})

const currentStreamStatus = computed(() => props.streamStatus ?? 'idle')

const selectedAgentLabel = computed(() => {
  if (selectedWorkflowId.value) {
    return selectedWorkflowName.value ?? t('chat.selectedWorkflow')
  }
  return props.agentOptions.find((opt) => opt.value === selectedAgent.value)?.label ?? 'AI'
})

const inputPlaceholder = computed(() =>
  props.requirementInputPlaceholder
  || (props.messages.length === 0 ? t('chat.placeholderEmpty') : t('chat.placeholderContinue')),
)

watch(() => props.agent, (agent) => {
  selectedAgent.value = agent
})

const {
  fileInputRef,
  fileUploading,
  pendingAttachments,
  previewDrawerVisible,
  previewDocumentId,
  triggerFileUpload,
  handleFileChange,
  removeAttachment,
  openAttachmentPreview,
  openMessageDocumentPreview,
  takeDoneAttachments,
} = useChatAttachments(() => mentionInputRef.value?.focus())

function handleMentionSend(text: string, mentions?: MentionReference[]): void {
  if ((!text && pendingAttachments.value.length === 0) || props.disabled) return
  const attachmentMeta = takeDoneAttachments()
  emit('send', text, selectedAgent.value, mentions, attachmentMeta.length > 0 ? attachmentMeta : undefined)
}

function handleStarterSend(text: string, agent: AgentType): void {
  emit('send', text, agent)
}

function handleSelectStarterAgent(agent: AgentType): void {
  selectedAgent.value = agent
}
</script>

<template>
  <div :class="$style.chat">
    <div :class="$style.header">
      <div :class="$style.headerLeft">
        <span :class="$style.title">{{ title }}</span>
        <span :class="[$style.roleBadge, selectedWorkflowId ? $style.workflow : $style[selectedAgent]]">
          {{ selectedAgentLabel }}
        </span>
        <span
          v-if="currentStreamStatus === 'connecting'"
          :class="[$style.connStatus, $style.connConnecting]"
        >
          <span :class="$style.connDot" />
          {{ t('chat.connecting') }}
        </span>
        <span
          v-else-if="currentStreamStatus === 'reconnecting'"
          :class="[$style.connStatus, $style.connReconnecting]"
        >
          <span :class="$style.connDot" />
          {{ t('chat.reconnecting', { current: retryCount, max: maxRetries }) }}
        </span>
        <span
          v-else-if="currentStreamStatus === 'disconnected'"
          :class="[$style.connStatus, $style.connDisconnected]"
        >
          <span :class="$style.connDot" />
          {{ t('chat.disconnected') }}
        </span>
      </div>
      <div :class="$style.headerActions">
        <el-popover
          v-model:visible="workflowPickerVisible"
          placement="bottom-end"
          :width="280"
          trigger="click"
          :show-arrow="false"
          :offset="4"
        >
          <template #reference>
            <el-tooltip :content="t('chat.agentWorkflow')" placement="bottom" :show-after="300">
              <button
                type="button"
                :class="[$style.actionBtn, { [$style.actionBtnActive]: !!selectedWorkflowId }]"
              >
                <AppIcon name="set-up" :size="14" />
              </button>
            </el-tooltip>
          </template>
          <AgentWorkflowPicker
            v-model="selectedWorkflowId"
            :show-label="false"
            @update:model-value="workflowPickerVisible = false"
          />
          <div :class="$style.workflowPickerFooter">
            <button type="button" :class="$style.workflowPickerLink" @click="openWorkflowList">
              <AppIcon name="connection" :size="12" />
              {{ shouldHideSubAppMenu ? t('chat.openWorkflows') : t('chat.manageWorkflows') }}
            </button>
          </div>
        </el-popover>
        <el-tooltip :content="t('chat.chatSettings')" placement="bottom" :show-after="300">
          <button :class="$style.actionBtn" @click="emit('open-settings')">
            <AppIcon name="setting" :size="14" />
          </button>
        </el-tooltip>
        <el-tooltip :content="t('chat.clearChat')" placement="bottom" :show-after="300">
          <button :class="$style.actionBtn" @click="emit('clear-messages')">
            <AppIcon name="delete" :size="14" />
          </button>
        </el-tooltip>
      </div>
    </div>

    <TaskChainBar
      v-if="taskChain && taskChain.length > 1"
      :steps="taskChain"
      :current-index="taskChainIndex ?? 0"
    />

    <ChatMessageList
      :messages="messages"
      :agent="agent"
      :loading="loading"
      :starter-prompts="starterPrompts"
      @send="handleStarterSend"
      @select-starter-agent="handleSelectStarterAgent"
      @preview-document="openMessageDocumentPreview"
      @card-primary-action="(mi, ci) => emit('card-primary-action', mi, ci)"
      @card-secondary-action="(mi, ci) => emit('card-secondary-action', mi, ci)"
      @open-json-drawer="emit('open-json-drawer')"
      @retry-tool="(mi, tci) => emit('retry-tool', mi, tci)"
      @copy-message="(mi) => emit('copy-message', mi)"
      @regenerate-message="(mi) => emit('regenerate-message', mi)"
      @message-feedback="(mi, type) => emit('message-feedback', mi, type)"
      @requirement-confirm="(answers) => emit('requirement-confirm', answers)"
      @requirement-answer="(qid, val) => emit('requirement-answer', qid, val)"
      @requirement-skip="emit('requirement-skip')"
    />

    <div v-if="visibleSuggestions.length > 0 && !loading" :class="$style.suggestionsArea">
      <div :class="$style.suggestionsHeader">
        <AppIcon name="magic-stick" :size="14" :class="$style.suggestionsIcon" />
        <span :class="$style.suggestionsTitle">{{ t('chat.suggestions') }}</span>
      </div>
      <div :class="$style.suggestionsList">
        <SmartSuggestionCard
          v-for="suggestion in visibleSuggestions"
          :key="suggestion.id"
          :suggestion="suggestion"
          :accepted="suggestionAcceptedIds.has(suggestion.id)"
          :dismissed="suggestionDismissedIds.has(suggestion.id)"
          @accept="handleSuggestionAccept"
          @dismiss="handleSuggestionDismiss"
        />
      </div>
    </div>

    <div v-if="currentStreamStatus === 'disconnected'" :class="$style.retryBanner">
      <span :class="$style.retryBannerText">{{ t('chat.retryBanner') }}</span>
      <el-button :class="$style.retryBannerBtn" @click="emit('retry')">
        <AppIcon name="refresh-right" :size="12" />
        {{ t('common.retry') }}
      </el-button>
    </div>

    <div :class="$style.inputArea">
      <AiRagSearch
        v-if="ragVisible"
        :search-results="ragSearchResults"
        :selected-context="ragContext"
        :loading="ragSearching"
        @search="(q) => emit('rag-search', q)"
        @select="(item) => emit('rag-select', item)"
        @remove="(id) => emit('rag-remove', id)"
        @close="ragVisible = false"
      />
      <div :class="[$style.inputBox, { [$style.inputDisabled]: disabled }]">
        <div v-if="pendingAttachments.length > 0" :class="$style.attachmentList">
          <DocumentPreviewPanel
            v-for="(att, idx) in pendingAttachments"
            :key="idx"
            :attachment="att"
            @preview="openAttachmentPreview(att)"
            @remove="removeAttachment(idx)"
          />
        </div>

        <AiMentionInput
          ref="mentionInputRef"
          :disabled="disabled"
          :loading="loading"
          :placeholder="inputPlaceholder"
          @send="handleMentionSend"
        />
        <div :class="$style.inputFooter">
          <div :class="$style.inputHint">
            <template v-if="loading">
              <span :class="$style.runningIndicator">
                <span :class="$style.runningDot"></span>
                <span :class="$style.runningDot"></span>
                <span :class="$style.runningDot"></span>
                {{ t('chat.running') }}
              </span>
            </template>
            <template v-else>
              <kbd>Enter</kbd>&nbsp;{{ t('chat.sendHint') }}&nbsp;&middot;&nbsp;<kbd>Shift+Enter</kbd>&nbsp;{{ t('chat.newlineHint') }}
            </template>
          </div>
          <div :class="$style.inputActions">
            <span
              v-if="ragContext.length > 0"
              :class="$style.ragIndicator"
              :title="t('chat.ragCited', { count: ragContext.length })"
            >
              <AppIcon name="collection" :size="14" />
              <span :class="$style.ragCount">{{ ragContext.length }}</span>
            </span>
            <el-tooltip :content="t('chat.ragTooltip')" placement="top" :show-after="300">
              <button
                type="button"
                :class="[$style.ragBtn, { [$style.ragBtnActive]: ragVisible }]"
                :disabled="disabled || loading"
                @click="ragVisible = !ragVisible"
              >
                <AppIcon name="box" :size="14" />
              </button>
            </el-tooltip>
            <input
              ref="fileInputRef"
              type="file"
              multiple
              :accept="DOCUMENT_UPLOAD_ACCEPT"
              :class="$style.hiddenInput"
              @change="handleFileChange"
            />
            <el-tooltip :content="t('chat.uploadTooltip', { formats: DOCUMENT_FORMAT_LABEL })" placement="top" :show-after="300">
              <button
                type="button"
                :class="$style.fileBtn"
                :disabled="disabled || loading || fileUploading > 0"
                @click="triggerFileUpload"
              >
                <AppIcon name="link" :size="14" />
              </button>
            </el-tooltip>
            <el-select
              v-if="!selectedWorkflowId"
              v-model="selectedAgent"
              :class="$style.agentSelect"
              :disabled="disabled || loading"
              size="small"
            >
              <el-option
                v-for="opt in agentOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-tooltip v-if="loading" :content="t('chat.stopGenerate')" placement="top" :show-after="300">
              <button type="button" :class="$style.stopBtn" @click="emit('stop')">
                <AppIcon name="video-pause" :size="14" />
              </button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <DocumentPreviewDrawer
      v-model:visible="previewDrawerVisible"
      :document-id="previewDocumentId"
    />
  </div>
</template>

<style module src="./AiChatPanel.module.scss" />
