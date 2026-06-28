<script setup lang="ts">
/**
 * AI 对话主页面
 *
 * 单栏布局：聊天区(100%)
 * 简洁设计，专注于对话体验。
 */

import { ref, onMounted, computed } from 'vue'
import { useAiStore } from '@/stores/ai'
import { bridge } from '@/utils/bridge'
import type { AgentType, ChatSettings, MentionReference, RagSearchResult } from '@/types'
import { storeToRefs } from 'pinia'
import { message } from '@schema-platform/platform-shared/utils/message'
import { HomeFilled } from '@element-plus/icons-vue'
import { getAppUrl } from '@schema-platform/platform-shared/qiankun/config'
import AiChatPanel from '@/components/AiChatPanel.vue'
import AiChatSettings from '@/components/AiChatSettings.vue'

const store = useAiStore()
const { messages, loading, currentSchema, currentFlow, activeAgent, conversations, currentConversationId, taskChain, taskChainIndex, streamStatus, retryCount, MAX_AUTO_RETRIES, chatSettings, ragSearchResults, ragSearching, ragContext } =
  storeToRefs(store)

// ---- 防止发布按钮重复调用 ----
const isPublishing = ref(false)

// ---- Settings dialog ----
const settingsVisible = ref(false)

function handleOpenSettings(): void {
  settingsVisible.value = true
}

function handleUpdateSettingsVisible(val: boolean): void {
  settingsVisible.value = val
}

function handleSaveSettings(settings: ChatSettings): void {
  store.updateChatSettings(settings)
}

// ---- JSON Drawer ----
const jsonDrawerVisible = ref(false)

function handleOpenJsonDrawer(): void {
  jsonDrawerVisible.value = true
}

const jsonDrawerContent = computed(() => {
  if (currentSchema.value) {
    return JSON.stringify(currentSchema.value, null, 2)
  }
  if (currentFlow.value) {
    return JSON.stringify(currentFlow.value, null, 2)
  }
  return '{}'
})

const jsonDrawerTitle = computed(() => {
  if (currentSchema.value) return 'Schema JSON 结构'
  if (currentFlow.value) return 'Flow JSON 结构'
  return 'JSON 结构'
})

// ---- Event handlers ----

async function handleSend(msg: string, agent: AgentType, mentions?: MentionReference[]): Promise<void> {
  if (agent !== activeAgent.value) {
    store.switchAgent(agent)
  }
  await store.sendMessage(msg, mentions)
}

function handleStop(): void {
  store.stopGeneration()
}

function handleRetry(): void {
  store.retryLastMessage()
}

function handleNewConversation(): void {
  store.clearConversation()
}

function handleClearMessages(): void {
  store.clearConversation()
}

function handlePrimaryAction(): void {
  handlePublish()
}

async function handleSecondaryAction(): Promise<void> {
  if (isPublishing.value) return
  isPublishing.value = true
  try {
    const result = await store.publishCurrent()
    if (!result) {
      message.warning('没有可发布的内容')
      return
    }

    // qiankun 嵌入模式：通过 bridge 通知宿主
    if (window.__POWERED_BY_QIANKUN__) {
      bridge.send('ai:open-in-editor', {
        schema: currentSchema.value,
        flow: currentFlow.value,
        id: result.id,
        type: result.type,
      })
      return
    }

    // standalone 模式：先发布再跳转到对应编辑器
    const url = result.type === 'flow'
      ? `/flow/?id=${result.id}`
      : `/editor/?id=${result.id}`
    window.open(url, '_blank')
  } catch {
    message.error('发布失败，请稍后重试')
  } finally {
    isPublishing.value = false
  }
}

async function handlePublish(): Promise<void> {
  if (isPublishing.value) return
  isPublishing.value = true
  try {
    const result = await store.publishCurrent()
    if (result) {
      message.success(result.type === 'schema' ? '表单发布成功' : '流程发布成功')
      bridge.send('ai:published', {
        id: result.id,
        publishId: result.publishId,
        type: result.type,
      })
    } else {
      message.warning('没有可发布的内容')
    }
  } catch {
    message.error('发布失败，请稍后重试')
  } finally {
    isPublishing.value = false
  }
}

// ---- RAG ----

function handleRagSearch(query: string): void {
  store.searchRagAction(query).catch(() => {
    message.error('RAG 搜索失败，请稍后重试')
  })
}

function handleRagSelect(item: RagSearchResult): void {
  store.addRagContext(item)
}

function handleRagRemove(id: string): void {
  store.removeRagContext(id)
}

function goToPortal(): void {
  window.location.href = getAppUrl('shell', import.meta.env.DEV)
}

// ---- Message actions ----

function handleCopyMessage(messageIndex: number): void {
  const msg = messages.value[messageIndex]
  if (msg?.content) {
    navigator.clipboard.writeText(msg.content)
    message.success('已复制到剪贴板')
  }
}

function handleRegenerateMessage(messageIndex: number): void {
  store.regenerateMessage(messageIndex)
}

function handleMessageFeedback(messageIndex: number, type: 'positive' | 'negative'): void {
  store.submitFeedback(messageIndex, type)
}

// ---- Bridge ----

onMounted(() => {
  store.loadConversations()

  bridge.on('ai:set-context', (payload) => {
    store.setContext(payload)
  })

  bridge.on('ai:current-schema', (payload) => {
    store.setCurrentSchema(payload)
  })
})
</script>

<template>
  <div :class="$style.page">
    <!-- 顶栏 -->
    <div :class="$style.topbar">
      <div :class="$style.topbarLeft">
        <el-tooltip content="返回主应用首页" placement="bottom">
          <button :class="$style.homeBtn" title="返回主应用" @click="goToPortal">
            <el-icon :size="14"><HomeFilled /></el-icon>
          </button>
        </el-tooltip>
        <div :class="$style.topbarDivider" />
        <div :class="$style.topbarLogo">
          <div :class="$style.topbarIcon">AI</div>
          <span :class="$style.topbarBrand">智能助手</span>
        </div>
      </div>
      <div :class="$style.topbarRight">
        <div :class="$style.modelBadge">
          <span :class="$style.modelDot"></span>
          <span :class="$style.modelName">DeepSeek</span>
        </div>
        <el-button type="primary" size="small" @click="handleNewConversation">
          + 新对话
        </el-button>
      </div>
    </div>

    <!-- 聊天区 -->
    <div :class="$style.chatContainer">
      <AiChatPanel
        :title="conversations.find((c) => c.id === currentConversationId)?.title ?? '新对话'"
        :agent="activeAgent"
        :messages="messages"
        :loading="loading"
        :task-chain="taskChain"
        :task-chain-index="taskChainIndex"
        :stream-status="streamStatus"
        :retry-count="retryCount"
        :max-retries="MAX_AUTO_RETRIES"
        :rag-search-results="ragSearchResults"
        :rag-searching="ragSearching"
        :rag-context="ragContext"
        @send="handleSend"
        @stop="handleStop"
        @retry="handleRetry"
        @clear-messages="handleClearMessages"
        @card-primary-action="handlePrimaryAction"
        @card-secondary-action="handleSecondaryAction"
        @open-settings="handleOpenSettings"
        @rag-search="handleRagSearch"
        @rag-select="handleRagSelect"
        @rag-remove="handleRagRemove"
        @open-json-drawer="handleOpenJsonDrawer"
        @retry-tool="(mi, tci) => store.retryToolCall(mi, tci)"
        @copy-message="handleCopyMessage"
        @regenerate-message="handleRegenerateMessage"
        @message-feedback="handleMessageFeedback"
      />
    </div>

    <!-- Settings Dialog -->
    <AiChatSettings
      :visible="settingsVisible"
      :settings="chatSettings"
      @update:visible="handleUpdateSettingsVisible"
      @update:settings="handleSaveSettings"
    />

    <!-- JSON 结构抽屉 -->
    <t-drawer
      v-model:visible="jsonDrawerVisible"
      :title="jsonDrawerTitle"
      placement="right"
      size="420px"
      :z-index="2000"
    >
      <div :class="$style.jsonDrawer">
        <pre :class="$style.jsonContent">{{ jsonDrawerContent }}</pre>
      </div>
    </t-drawer>
  </div>
</template>

<style module src="./AiChatView.module.css" />
