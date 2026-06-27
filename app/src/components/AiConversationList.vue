<script setup lang="ts">
import { message } from '@schema-form/platform-shared/utils/message'
import { downloadConversation } from '@/api/aiApi'
import AiConversationSearch from './AiConversationSearch.vue'
import type { Conversation } from '@/types'
import type { ExportFormat } from '@/api/aiApi'
import { Plus, Download, Delete } from '@element-plus/icons-vue'

export interface AiConversationListProps {
  conversations: Conversation[]
  activeId?: string
}

defineProps<AiConversationListProps>()

const emit = defineEmits<{
  select: [id: string]
  'new-conversation': []
  delete: [id: string]
}>()

function formatTime(date: Date | string): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

async function handleExport(command: string, id: string): Promise<void> {
  try {
    await downloadConversation(id, command as ExportFormat)
    message.success('导出成功')
  } catch {
    message.error('导出失败')
  }
}
</script>

<template>
  <div :class="$style.sidebar">
    <!-- Header -->
    <div :class="$style.header">
      <span :class="$style.title">对话列表</span>
      <el-tooltip content="新建对话" placement="top">
        <el-button size="small" :icon="Plus" @click="emit('new-conversation')" />
      </el-tooltip>
    </div>

    <!-- Search -->
    <AiConversationSearch @select="(id) => emit('select', id)" />

    <!-- List -->
    <el-scrollbar :class="$style.list">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        :class="[$style.item, { [$style.active]: conv.id === activeId }]"
        @click="emit('select', conv.id)"
      >
        <div :class="$style.itemTitle">{{ conv.title }}</div>
        <div :class="$style.itemMeta">
          <el-tag size="small" :type="conv.activeAgent === 'editor' ? 'success' : 'primary'">
            {{ conv.activeAgent === 'editor' ? 'Editor' : 'Flow' }}
          </el-tag>
          <span :class="$style.itemTime">{{ formatTime(conv.updatedAt) }}</span>
          <el-dropdown trigger="click" @command="(cmd) => handleExport(cmd, conv.id)" @click.stop>
            <el-tooltip content="导出对话" placement="top">
              <el-button :icon="Download" size="small" link @click.stop />
            </el-tooltip>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item value="json">导出 JSON</el-dropdown-item>
                <el-dropdown-item value="markdown">导出 Markdown</el-dropdown-item>
                <el-dropdown-item value="html">导出 HTML</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-tooltip content="删除对话" placement="top">
            <el-button :icon="Delete" size="small" link type="danger" @click.stop="emit('delete', conv.id)" />
          </el-tooltip>
        </div>
      </div>
      <el-empty v-if="conversations.length === 0" description="暂无对话" :image-size="48" />
    </el-scrollbar>
  </div>
</template>

<style module>
.sidebar {
  width: 260px;
  background: var(--ai-bg-white, #FFFFFF);
  border-right: 1px solid var(--ai-border-light, #EBEDF3);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.header {
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid var(--ai-border-light, #EBEDF3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ai-text-primary, #333333);
}

.list {
  flex: 1;
  min-height: 0;
}

.list :deep(.el-scrollbar__view) {
  padding: 6px;
}

.item {
  padding: 10px 10px;
  border-radius: var(--ai-radius-md, 4px);
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.15s;
}

.item:hover {
  background: var(--ai-bg-hover, #F5F7FA);
}

.item.active {
  background: var(--ai-color-primary-bg, #EEF5FF);
}

.itemTitle {
  font-size: 13px;
  font-weight: 500;
  color: var(--ai-text-primary, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  margin-bottom: 4px;
}

.item.active .itemTitle {
  color: var(--ai-color-primary, #0060A2);
}

.itemMeta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.itemTime {
  font-size: 10px;
  color: var(--ai-text-disabled, #C0C4CC);
  margin-left: auto;
}
</style>
