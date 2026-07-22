<script setup lang="ts">
/**
 * ThreePreviewCard — 3D 模型预览卡片。
 * 支持 GLTF/GLB/OBJ/STL/FBX 格式，使用 Google model-viewer Web Component。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  url: string
  filename?: string
  mimeType?: string
  poster?: string
}>()

const loaded = ref(false)
const error = ref<string | null>(null)

const format = computed(() => {
  const ext = props.filename?.split('.').pop()?.toLowerCase() || ''
  if (['gltf', 'glb'].includes(ext)) return 'glTF'
  if (ext === 'obj') return 'OBJ'
  if (ext === 'stl') return 'STL'
  if (ext === 'fbx') return 'FBX'
  return '3D'
})

onMounted(() => {
  // model-viewer loads lazily; listen for load/error
})
</script>

<template>
  <div class="three-preview-card">
    <div class="three-preview-header">
      <span class="format-badge">{{ format }}</span>
      <span class="filename">{{ filename || '3D 模型' }}</span>
    </div>
    <div class="three-preview-body">
      <model-viewer
        :src="url"
        :poster="poster"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        style="width: 100%; height: 300px; background: #f5f5f5; border-radius: 8px;"
        @load="loaded = true"
        @error="error = '加载失败'"
      >
        <div v-if="!loaded && !error" slot="poster" class="loading-hint">
          <AppIcon name="loading" :size="24" class="spin" />
          <span>加载 3D 模型中...</span>
        </div>
        <div v-if="error" class="error-hint">
          <AppIcon name="warning-filled" :size="24" />
          <span>{{ error }}</span>
        </div>
      </model-viewer>
    </div>
    <div v-if="!error" class="three-preview-actions">
      <el-button size="small" text :href="url" download>
        <AppIcon name="download" :size="14" />
        下载
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.three-preview-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
  max-width: 480px;
}
.three-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  font-size: 13px;
}
.format-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 11px;
  font-weight: 600;
}
.filename {
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.three-preview-body {
  position: relative;
}
.loading-hint, .error-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.error-hint {
  color: var(--el-color-danger);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.three-preview-actions {
  padding: 4px 12px 8px;
}
</style>
