<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { ElMessage } from 'element-plus'
import { useWorkflowInvokeInfo } from '@/composables/useWorkflowInvokeInfo'

const props = defineProps<{
  workflowId: string
  workflowSlug?: string | null
}>()

const { loading, invokeInfo, error, buildInvokeUrl, loadInvokeInfo, rotateKey } =
  useWorkflowInvokeInfo()

const copiedField = ref<string | null>(null)
const rotateKeyVisible = ref(false)
const rotatedFullKey = ref<string | null>(null)

const invokeUrl = computed(() => buildInvokeUrl(invokeInfo.value?.invokePath ?? null))

watch(
  () => props.workflowId,
  (id) => {
    if (id) loadInvokeInfo(id)
  },
  { immediate: true },
)

async function copyText(text: string, field: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    ElMessage.success('已复制')
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null
    }, 2000)
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

async function handleRotateKey(): Promise<void> {
  const fullKey = await rotateKey(props.workflowId)
  if (fullKey) {
    rotatedFullKey.value = fullKey
    rotateKeyVisible.value = true
  }
}

function closeRotateDialog(): void {
  rotateKeyVisible.value = false
  rotatedFullKey.value = null
}
</script>

<template>
  <div class="workflow-invoke-info">
    <div v-if="loading" class="invoke-loading">
      <span class="invoke-loading-text">加载中...</span>
    </div>

    <div v-else-if="error" class="invoke-error">
      <span>{{ error }}</span>
    </div>

    <div v-else-if="invokeInfo" class="invoke-content">
      <!-- Invoke URL -->
      <div class="invoke-row">
        <span class="invoke-label">
          <AppIcon name="link" :size="12" />
          调用地址
        </span>
        <div class="invoke-value-group">
          <code class="invoke-value" :title="invokeUrl ?? ''">{{ invokeUrl ?? '未设置 slug' }}</code>
          <button
            v-if="invokeUrl"
            class="invoke-copy-btn"
            :class="{ copied: copiedField === 'url' }"
            title="复制调用地址"
            @click="copyText(invokeUrl!, 'url')"
          >
            <AppIcon :name="copiedField === 'url' ? 'check' : 'copy-document'" :size="13" />
          </button>
        </div>
      </div>

      <!-- Invoke Key (masked) -->
      <div class="invoke-row">
        <span class="invoke-label">
          <AppIcon name="key" :size="12" />
          调用密钥
        </span>
        <div class="invoke-value-group">
          <code class="invoke-value">{{ invokeInfo.invokeKeyMasked ?? '未生成' }}</code>
          <button
            class="invoke-copy-btn"
            title="轮换密钥"
            @click="handleRotateKey"
          >
            <AppIcon name="refresh-right" :size="13" />
          </button>
        </div>
      </div>

      <!-- Invoke path hint -->
      <div class="invoke-hint">
        请求头 <code>X-Workflow-Key</code> 传入完整密钥，POST 到调用地址即可触发。
      </div>
    </div>

    <!-- Rotate key result dialog -->
    <Teleport to="body">
      <div v-if="rotateKeyVisible" class="rotate-overlay" @click.self="closeRotateDialog">
        <div class="rotate-dialog">
          <h3 class="rotate-title">密钥已轮换</h3>
          <p class="rotate-desc">新密钥仅显示一次，请立即复制保存。</p>
          <div class="rotate-key-row">
            <code class="rotate-key-value">{{ rotatedFullKey }}</code>
            <button
              class="invoke-copy-btn"
              :class="{ copied: copiedField === 'rotate' }"
              @click="copyText(rotatedFullKey!, 'rotate')"
            >
              <AppIcon :name="copiedField === 'rotate' ? 'check' : 'copy-document'" :size="13" />
            </button>
          </div>
          <div class="rotate-actions">
            <button class="rotate-close-btn" @click="closeRotateDialog">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.workflow-invoke-info {
  margin-top: 8px;
  padding: 10px 12px;
  background: var(--bg-color-page, #f5f7fa);
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 6px;
  font-size: 12px;
}

.invoke-loading,
.invoke-error {
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
}

.invoke-error {
  color: var(--color-danger, #f56c6c);
}

.invoke-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.invoke-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoke-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-color-secondary, #909399);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 64px;
}

.invoke-value-group {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.invoke-value {
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  color: var(--text-color-primary, #303133);
  background: var(--bg-color, #fff);
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 4px;
  padding: 2px 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.invoke-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 4px;
  background: var(--bg-color, #fff);
  color: var(--text-color-secondary, #909399);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
}

.invoke-copy-btn:hover {
  color: var(--color-primary, #409eff);
  border-color: var(--color-primary-light-7, #c6e2ff);
}

.invoke-copy-btn.copied {
  color: var(--color-success, #67c23a);
  border-color: var(--color-success-light-7, #c2e7b0);
}

.invoke-hint {
  font-size: 11px;
  color: var(--text-color-placeholder, #c0c4cc);
  line-height: 1.4;
  margin-top: 2px;
}

.invoke-hint code {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 10px;
  background: var(--bg-color, #fff);
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 3px;
  padding: 0 3px;
}

/* ---- Rotate dialog overlay ---- */
.rotate-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.rotate-dialog {
  background: var(--bg-color, #fff);
  border-radius: 10px;
  padding: 24px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.rotate-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
}

.rotate-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--text-color-secondary, #909399);
}

.rotate-key-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.rotate-key-value {
  flex: 1;
  font-size: 13px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  background: var(--bg-color-page, #f5f7fa);
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 6px;
  padding: 8px 10px;
  word-break: break-all;
  color: var(--color-warning, #e6a23c);
}

.rotate-actions {
  display: flex;
  justify-content: flex-end;
}

.rotate-close-btn {
  padding: 6px 16px;
  font-size: 13px;
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: 6px;
  background: var(--bg-color, #fff);
  color: var(--text-color-primary, #303133);
  cursor: pointer;
  transition: border-color 0.15s;
}

.rotate-close-btn:hover {
  border-color: var(--color-primary, #409eff);
  color: var(--color-primary, #409eff);
}
</style>
