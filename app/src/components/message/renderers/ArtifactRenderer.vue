<script setup lang="ts">
/**
 * ArtifactRenderer - 可交互工件渲染器
 *
 * 将 LLM 输出的 ```artifact:code/json/html``` 块渲染为可编辑工件：
 * - code/json：可编辑 textarea + 复制 + 回传
 * - html：可编辑 + iframe 实时预览 + 回传
 *
 * 「回传给 Agent」把编辑后的内容作为下一条消息发送，形成修改-优化闭环。
 */
import { ref, computed } from 'vue'
import { message as elMessage } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { StepData } from '@/types'
import styles from './ArtifactRenderer.module.scss'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'artifact-sendback': [content: string, language: string]
}>()

const artifactType = computed(() => props.step.artifactType ?? 'code')
const language = computed(() => props.step.artifactLanguage ?? artifactType.value)
const editable = ref(props.step.content ?? '')
const mode = ref<'edit' | 'preview'>('edit')

const isHtml = computed(() => artifactType.value === 'html')
const isJson = computed(() => artifactType.value === 'json')

const htmlPreview = computed(() => {
  if (!isHtml.value) return ''
  return editable.value
})

const jsonValid = computed(() => {
  if (!isJson.value) return null
  try { JSON.parse(editable.value); return true } catch { return false }
})

function copy() {
  navigator.clipboard.writeText(editable.value)
  elMessage.success('已复制')
}

function formatJson() {
  if (!isJson.value) return
  try {
    editable.value = JSON.stringify(JSON.parse(editable.value), null, 2)
  } catch {
    elMessage.warning('JSON 格式有误，无法格式化')
  }
}

function sendBack() {
  if (!editable.value.trim()) {
    elMessage.warning('内容为空')
    return
  }
  emit('artifact-sendback', editable.value, language.value)
}
</script>

<template>
  <div :class="styles.artifact">
    <div :class="styles.head">
      <div :class="styles.headLeft">
        <AppIcon name="copy-document" :size="14" :class="styles.icon" />
        <span :class="styles.title">工件</span>
        <el-tag size="small" :type="isHtml ? 'warning' : isJson ? 'success' : 'info'">
          {{ artifactType }}
        </el-tag>
        <el-tag v-if="isJson && jsonValid === false" size="small" type="danger">JSON 无效</el-tag>
      </div>
      <div :class="styles.headRight">
        <button
          v-if="isHtml"
          type="button"
          :class="[styles.modeBtn, mode === 'edit' && styles.modeBtnActive]"
          @click="mode = 'edit'"
        >编辑</button>
        <button
          v-if="isHtml"
          type="button"
          :class="[styles.modeBtn, mode === 'preview' && styles.modeBtnActive]"
          @click="mode = 'preview'"
        >预览</button>
        <button v-if="isJson" type="button" :class="styles.toolBtn" @click="formatJson">格式化</button>
        <button type="button" :class="styles.toolBtn" @click="copy">
          <AppIcon name="document-copy" :size="12" /> 复制
        </button>
      </div>
    </div>

    <div :class="styles.body">
      <textarea
        v-if="mode === 'edit'"
        v-model="editable"
        :class="styles.editor"
        :placeholder="`可编辑 ${artifactType} 内容`"
        spellcheck="false"
      />
      <iframe
        v-else
        :class="styles.preview"
        :srcdoc="htmlPreview"
        sandbox="allow-scripts"
        title="artifact preview"
      />
    </div>

    <div :class="styles.footer">
      <span :class="styles.hint">编辑后可回传给 Agent 继续优化</span>
      <el-button type="primary" size="small" @click="sendBack">
        <AppIcon name="magic-stick" :size="12" /> 回传给 Agent
      </el-button>
    </div>
  </div>
</template>
