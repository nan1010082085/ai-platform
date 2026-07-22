<script setup lang="ts">
/**
 * WorkflowTemplateCard - 工作流模板卡片
 *
 * 从 AgentWorkflowListView 抽出，单个模板的展示卡片。
 */
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { AgentWorkflowTemplateMeta, AgentWorkflowTemplateId } from '@/types/agentWorkflow'

const props = defineProps<{
  template: AgentWorkflowTemplateMeta
  icon: string
  categoryLabel: string
  trying?: boolean
}>()

const emit = defineEmits<{
  preview: []
  use: []
  try: []
}>()
</script>

<template>
  <div data-testid="workflow-template-card" :class="$style.card">
    <div :class="$style.preview">
      <AppIcon :name="props.icon" :size="36" />
    </div>
    <div :class="$style.body">
      <div :class="$style.head">
        <h3 :class="$style.name">{{ props.template.name }}</h3>
        <el-tag size="small" type="info">{{ props.categoryLabel }}</el-tag>
      </div>
      <p :class="$style.desc">{{ props.template.description }}</p>
    </div>
    <div :class="$style.actions">
      <el-tooltip content="预览" placement="top" :show-after="300">
        <el-button size="small" link @click="emit('preview')">
          <AppIcon name="view" :size="14" />
        </el-button>
      </el-tooltip>
      <el-tooltip content="使用此模板" placement="top" :show-after="300">
        <el-button size="small" link type="primary" @click="emit('use')">
          <AppIcon name="plus" :size="14" />
        </el-button>
      </el-tooltip>
      <el-tooltip
        v-if="props.template.category === 'assistant' || props.template.category === 'document'"
        :content="props.template.category === 'assistant' ? '试用' : '在对话中体验'"
        placement="top"
        :show-after="300"
      >
        <el-button
          size="small"
          link
          type="success"
          :loading="props.trying"
          @click="emit('try')"
        >
          <AppIcon name="chat-dot-round" :size="14" />
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<style module>
.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.card:hover {
  border-color: var(--el-color-primary, #0060a2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.preview {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter, #f5f7fa);
  color: var(--el-color-primary, #0060a2);
}

.body {
  flex: 1;
  min-width: 0;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
