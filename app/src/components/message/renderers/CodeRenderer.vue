<script setup lang="ts">
/**
 * CodeRenderer — 代码/JSON 渲染组件
 *
 * 从 AiMessage.vue 提取的代码块渲染逻辑：
 * - 识别 JSON / Schema / Flow 子类型
 * - JSON 格式化显示
 * - 点击展开详情（调用 JsonDetailDialog）
 * - 复制代码按钮
 */

import { ref, computed } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import JsonCard from '@/components/JsonCard.vue'
import JsonDetailDialog from '@/components/JsonDetailDialog.vue'

export interface CodeRendererProps {
  /** 代码内容 */
  content: string
  /** 代码语言标识 */
  language?: string
}

const props = withDefaults(defineProps<CodeRendererProps>(), {
  language: undefined,
})

const emit = defineEmits<{
  'open-json-detail': []
}>()

// ---- JSON sub-type detection ----

function getJsonCardType(content: string): 'json' | 'schema' | 'flow' {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && parsed[0].type) {
        return 'schema'
      }
    }
    if (parsed.nodes && Array.isArray(parsed.nodes)) {
      return 'flow'
    }
  } catch {
    // not valid JSON
  }
  return 'json'
}

const jsonCardType = computed(() => getJsonCardType(props.content))

/** Whether content is valid JSON — controls card vs raw code display */
const isValidJson = computed(() => {
  try {
    JSON.parse(props.content)
    return true
  } catch {
    return false
  }
})

// ---- Formatted display for non-card mode ----

const formattedContent = computed(() => {
  if (!isValidJson.value) return props.content
  try {
    return JSON.stringify(JSON.parse(props.content), null, 2)
  } catch {
    return props.content
  }
})

// ---- Copy ----

function handleCopy(): void {
  if (props.content) {
    navigator.clipboard.writeText(props.content)
    message.success('已复制到剪贴板')
  }
}

// ---- JSON detail dialog state ----

const jsonDialogVisible = ref(false)
const jsonDialogTitle = ref('')
const jsonDialogContent = ref('')

function openJsonDialog(title: string, content: string): void {
  jsonDialogTitle.value = title
  jsonDialogContent.value = content
  jsonDialogVisible.value = true
  emit('open-json-detail')
}
</script>

<template>
  <div :class="$style.root">
    <!-- Valid JSON: render as JsonCard with click-to-detail -->
    <JsonCard
      v-if="isValidJson"
      title="JSON 数据"
      :content="content"
      :type="jsonCardType"
      @click="openJsonDialog('JSON 数据', content)"
    />

    <!-- Non-JSON code: render as raw code block with copy button -->
    <div v-else :class="$style.codeBlock">
      <div :class="$style.codeHeader">
        <span v-if="language" :class="$style.langLabel">{{ language }}</span>
        <button :class="$style.copyBtn" @click="handleCopy">
          <AppIcon name="copy-document" :size="12" />
          复制
        </button>
      </div>
      <pre :class="$style.codePre"><code>{{ formattedContent }}</code></pre>
    </div>
  </div>

  <!-- JSON detail dialog -->
  <JsonDetailDialog
    v-model:visible="jsonDialogVisible"
    :title="jsonDialogTitle"
    :content="jsonDialogContent"
  />
</template>

<style module src="./CodeRenderer.module.scss" />
