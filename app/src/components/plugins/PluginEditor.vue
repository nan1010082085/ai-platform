<script setup lang="ts">
/**
 * PluginEditor — 插件 JSON 在线编辑器
 *
 * 提供 JSON 语法高亮、格式校验、保存/取消操作。
 * 保存时调用 pluginApi.updatePluginLocalConfig 写入 plugins/local/ 并触发热重载。
 */

import { ref, computed, watch } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import { updatePluginLocalConfig, type PluginLocalLayer } from '@/api/pluginApi'

export interface PluginEditorProps {
  /** 是否显示 */
  visible: boolean
  /** 弹框标题 */
  title: string
  /** 插件层：experts / tools / mcp / skills */
  layer: PluginLocalLayer
  /** 文件名（不含 .json 后缀） */
  fileId: string
  /** 初始 JSON 数据 */
  data: unknown
}

const props = defineProps<PluginEditorProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const jsonText = ref('')
const parseError = ref<string | null>(null)
const saving = ref(false)

watch(
  () => props.visible,
  (open) => {
    if (open) {
      jsonText.value = JSON.stringify(props.data, null, 2)
      parseError.value = null
    }
  },
)

const parsedJson = computed(() => {
  if (!jsonText.value.trim()) {
    parseError.value = '内容不能为空'
    return null
  }
  try {
    const result = JSON.parse(jsonText.value)
    parseError.value = null
    return result
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'JSON 格式错误'
    return null
  }
})

const canSave = computed(() => parsedJson.value !== null && !saving.value)

function handleFormat(): void {
  if (parsedJson.value !== null) {
    jsonText.value = JSON.stringify(parsedJson.value, null, 2)
    message.success('已格式化')
  }
}

async function handleSave(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  try {
    await updatePluginLocalConfig(props.layer, `${props.fileId}.json`, parsedJson.value)
    message.success('保存成功，插件已热重载')
    emit('saved')
    handleClose()
  } catch (err) {
    message.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function handleClose(): void {
  emit('update:visible', false)
}
</script>

<template>
  <AppDialog
    :model-value="visible"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <div :class="$style.toolbar">
      <el-button text size="small" @click="handleFormat">
        <AppIcon name="magic-stick" :size="12" />
        格式化
      </el-button>
      <span v-if="parseError" :class="$style.errorHint">
        <AppIcon name="warning" :size="12" />
        {{ parseError }}
      </span>
      <span v-else :class="$style.validHint">
        <AppIcon name="select" :size="12" />
        JSON 格式正确
      </span>
    </div>
    <div :class="$style.editorWrap">
      <textarea
        v-model="jsonText"
        :class="$style.editor"
        spellcheck="false"
        placeholder="输入 JSON…"
      />
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!canSave" :loading="saving" @click="handleSave">
        保存
      </el-button>
    </template>
  </AppDialog>
</template>

<style module>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.errorHint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.validHint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-color-success);
}

.editorWrap {
  border: 1px solid var(--ai-border-light, #EBEDF3);
  border-radius: 8px;
  overflow: hidden;
}

.editor {
  display: block;
  width: 100%;
  min-height: 400px;
  padding: 16px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ai-text-primary, #333333);
  background: var(--ai-bg-gray, #F5F7FA);
  border: none;
  outline: none;
  resize: vertical;
  tab-size: 2;
}

.editor:focus {
  background: var(--ai-bg-white, #FFFFFF);
}
</style>
