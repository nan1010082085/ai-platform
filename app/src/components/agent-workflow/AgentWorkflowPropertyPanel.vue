<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import { useAgentNodePropertyPanel } from '@/composables/useAgentNodePropertyPanel'
import { getAgentNodePreviewSections } from '@/utils/agentNodePreview'
import type { AgentNodeRecord, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import * as api from '@/api/agentWorkflowApi'
import SectionToggle from './property-panel/SectionToggle.vue'
import FieldRow from './property-panel/FieldRow.vue'
import TruncatedTooltipText from './property-panel/TruncatedTooltipText.vue'
import InvocationMethodsPanel from './property-panel/panels/InvocationMethodsPanel.vue'
import styles from './AgentWorkflowPropertyPanel.module.scss'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
const store = useAgentWorkflowDesignerStore()
const rotatingKey = ref(false)
const { getPanelComponent, getNodeTypeLabel } = useAgentNodePropertyPanel()

const selectedNode = computed(() =>
  store.selectedNodeId ? store.nodes.find((n) => n.id === store.selectedNodeId) : null,
)

const selectedEdge = computed(() =>
  store.selectedEdgeId ? store.edges.find((e) => e.id === store.selectedEdgeId) : null,
)

const nodeTypeDisplayName = computed(() =>
  selectedNode.value?.type ? getNodeTypeLabel(selectedNode.value.type) : '',
)

const panelComponent = computed(() => {
  if (!selectedNode.value?.type) return null
  return getPanelComponent(selectedNode.value.type)
})

const outgoingEdges = computed(() => {
  if (!store.selectedNodeId) return []
  return store.edges.filter((e) => e.source === store.selectedNodeId)
})

const nodeData = computed(() => (selectedNode.value?.data ?? {}) as AgentWorkflowNodeData & {
  runtimeRecord?: AgentNodeRecord | null
})

const previewSections = computed(() => {
  if (!selectedNode.value?.type) return null
  return getAgentNodePreviewSections(
    selectedNode.value.type as Parameters<typeof getAgentNodePreviewSections>[0],
    nodeData.value,
    nodeData.value.runtimeRecord,
  )
})

function updateNodeData(key: string, value: unknown) {
  if (!store.selectedNodeId) return
  store.updateNodeData(store.selectedNodeId, { [key]: value })
}

function patchEdge(key: string, value: unknown) {
  if (!store.selectedEdgeId) return
  store.updateEdgeData(store.selectedEdgeId, { [key]: value })
}

function copyNodeId() {
  if (!selectedNode.value) return
  navigator.clipboard.writeText(selectedNode.value.id)
  ElMessage.success('已复制节点 ID')
}

function copyEdgeId() {
  if (!selectedEdge.value) return
  navigator.clipboard.writeText(selectedEdge.value.id)
  ElMessage.success('已复制连线 ID')
}

function selectEdge(edgeId: string) {
  store.selectEdge(edgeId)
}

function deleteSelectedEdge() {
  if (!store.selectedEdgeId) return
  store.removeEdge(store.selectedEdgeId)
}

const invokeUrl = computed(() => {
  if (!store.invokePath) return ''
  const base = API_BASE.replace(/\/+$/, '')
  return `${base}${store.invokePath}`
})

const displayInvokeKey = computed(() => store.invokeKeyPlain || store.invokeKeyMasked || '')

function copyText(text: string, label: string) {
  if (!text) return
  navigator.clipboard.writeText(text)
  ElMessage.success(`已复制${label}`)
}

async function rotateInvokeKey() {
  if (!store.workflowId) return
  try {
    await ElMessageBox.confirm('轮换后旧密钥立即失效，外部集成需同步更新。', '轮换调用密钥')
    rotatingKey.value = true
    const res = await api.rotateWorkflowInvokeKey(store.workflowId)
    store.invokeKeyPlain = res.invokeKey
    store.invokeKeyMasked = res.invokeKeyMasked
    if (res.invokePath) store.invokePath = res.invokePath
    ElMessage.success('已生成新调用密钥')
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e instanceof Error ? e.message : '轮换失败')
    }
  } finally {
    rotatingKey.value = false
  }
}
</script>

<template>
  <div :class="styles.panel">
    <div :class="styles.header">
      <AppIcon name="set-up" :size="14" />
      <span v-if="selectedNode">{{ nodeTypeDisplayName }} 配置</span>
      <span v-else-if="selectedEdge">连线配置</span>
      <span v-else>工作流设置</span>
    </div>

    <template v-if="selectedNode">
      <div :class="styles.widgetNameRow">
        <TruncatedTooltipText
          :content="String(nodeData.label || selectedNode.id)"
          :class="styles.widgetType"
        />
        <el-tooltip content="复制节点 ID" placement="top" :show-after="500">
          <AppIcon name="document-copy" :class="styles.copyIdIcon" @click="copyNodeId" />
        </el-tooltip>
      </div>

      <el-scrollbar :class="styles.scroll">
        <SectionToggle title="基础属性" :count="2">
          <FieldRow label="节点 ID">
            <el-input :model-value="selectedNode.id" disabled size="small" />
          </FieldRow>
          <FieldRow label="显示名称">
            <el-input
              :model-value="String(nodeData.label ?? '')"
              size="small"
              @update:model-value="updateNodeData('label', $event)"
            />
          </FieldRow>
          <FieldRow label="备注" textarea>
            <el-input
              type="textarea"
              :rows="2"
              :model-value="String(nodeData.notes ?? '')"
              placeholder="可选说明"
              @update:model-value="updateNodeData('notes', $event)"
            />
          </FieldRow>
        </SectionToggle>

        <component
          :is="panelComponent"
          :node="selectedNode"
          @update-node-data="updateNodeData"
        />

        <SectionToggle
          v-if="previewSections && (previewSections.config.length || previewSections.runtime.length)"
          title="节点预览"
          :default-open="!!previewSections.runtime.length"
        >
          <template v-if="previewSections.config.length">
            <div :class="styles.previewGroupTitle">配置摘要</div>
            <div
              v-for="row in previewSections.config"
              :key="row.key"
              :class="styles.previewRow"
            >
              <TruncatedTooltipText :content="row.label" :class="styles.previewLabel" />
              <el-tooltip
                :content="row.value"
                placement="top"
                :show-after="200"
                :popper-style="{ maxWidth: '360px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }"
              >
                <span :class="styles.previewValue">{{ row.value }}</span>
              </el-tooltip>
            </div>
          </template>
          <template v-if="previewSections.runtime.length">
            <div :class="styles.previewGroupTitle">执行结果</div>
            <div
              v-for="row in previewSections.runtime.filter((r) => !['status', 'duration'].includes(r.key))"
              :key="row.key"
              :class="styles.previewRow"
            >
              <TruncatedTooltipText :content="row.label" :class="styles.previewLabel" />
              <el-tooltip
                :content="row.value"
                placement="top"
                :show-after="200"
                :popper-style="{ maxWidth: '360px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }"
              >
                <span :class="styles.previewValue">{{ row.value }}</span>
              </el-tooltip>
            </div>
          </template>
        </SectionToggle>

        <SectionToggle v-if="outgoingEdges.length > 0" title="连线信息" :count="outgoingEdges.length">
          <div
            v-for="edge in outgoingEdges"
            :key="edge.id"
            :class="styles.edgeItem"
            @click="selectEdge(edge.id)"
          >
            <span :class="styles.edgeLabel">
              {{ (edge.data as Record<string, unknown>)?.label
                || (edge.data as Record<string, unknown>)?.branch
                || '默认' }}
            </span>
            <span :class="styles.edgeTarget">→ {{ edge.target }}</span>
          </div>
        </SectionToggle>
      </el-scrollbar>
    </template>

    <template v-else-if="selectedEdge">
      <div :class="styles.widgetNameRow">
        <span :class="styles.widgetType">连线</span>
        <el-tooltip content="复制连线 ID" placement="top" :show-after="500">
          <AppIcon name="document-copy" :class="styles.copyIdIcon" @click="copyEdgeId" />
        </el-tooltip>
      </div>

      <el-scrollbar :class="styles.scroll">
        <SectionToggle title="连线属性" :count="3">
          <FieldRow label="连线标签">
            <el-input
              :model-value="String((selectedEdge.data as Record<string, unknown>)?.label ?? selectedEdge.label ?? '')"
              size="small"
              placeholder="可选标签"
              @update:model-value="patchEdge('label', $event || undefined)"
            />
          </FieldRow>
          <FieldRow label="分支标记">
            <el-select
              :model-value="String((selectedEdge.data as Record<string, unknown>)?.branch ?? '')"
              size="small"
              clearable
              @update:model-value="patchEdge('branch', $event || undefined)"
            >
              <el-option label="默认" value="" />
              <el-option label="是 (true)" value="true" />
              <el-option label="否 (false)" value="false" />
            </el-select>
          </FieldRow>
          <FieldRow label="连线 ID">
            <el-input :model-value="selectedEdge.id" disabled size="small" />
          </FieldRow>
        </SectionToggle>
        <div :class="styles.deleteRow">
          <el-button type="danger" plain size="small" @click="deleteSelectedEdge">
            删除连线
          </el-button>
        </div>
      </el-scrollbar>
    </template>

    <div v-else :class="styles.empty">
      <el-scrollbar :class="styles.scroll">
        <SectionToggle title="工作流设置" :default-open="true">
          <FieldRow label="Slug">
            <el-input
              :model-value="store.workflowSlug"
              size="small"
              placeholder="open-api 调用标识，如 document-parse"
              @update:model-value="(v) => { store.workflowSlug = v; store.markDirty() }"
            />
          </FieldRow>
          <FieldRow label="描述" textarea>
            <el-input
              type="textarea"
              :rows="2"
              :model-value="store.workflowDescription"
              placeholder="工作流说明"
              @update:model-value="(v) => { store.workflowDescription = v; store.markDirty() }"
            />
          </FieldRow>
          <FieldRow label="完成回调 URL">
            <el-input
              :model-value="store.onCompleteWebhookUrl"
              size="small"
              placeholder="https://example.com/hooks/workflow-done"
              @update:model-value="(v) => { store.onCompleteWebhookUrl = v; store.markDirty() }"
            />
          </FieldRow>
          <FieldRow label="回调 Secret">
            <el-input
              :model-value="store.onCompleteWebhookSecret"
              size="small"
              type="password"
              show-password
              placeholder="HMAC 签名密钥（可选）"
              @update:model-value="(v) => { store.onCompleteWebhookSecret = v; store.markDirty() }"
            />
          </FieldRow>
        </SectionToggle>
        <SectionToggle v-if="store.invokePath" title="统一调用入口" :default-open="true">
          <p :class="styles.emptyHint">
            已发布工作流对外调用：<code>POST</code> 入口 URL + 请求头 <code>X-Workflow-Key</code>
          </p>
          <FieldRow label="调用 URL">
            <div :class="styles.copyRow">
              <el-input :model-value="invokeUrl" size="small" readonly />
              <AppIcon name="document-copy" :class="styles.copyIdIcon" @click="copyText(invokeUrl, '调用 URL')" />
            </div>
          </FieldRow>
          <FieldRow label="Workflow Key">
            <div :class="styles.copyRow">
              <el-input :model-value="displayInvokeKey" size="small" readonly type="password" show-password />
              <AppIcon
                v-if="displayInvokeKey"
                name="document-copy"
                :class="styles.copyIdIcon"
                @click="copyText(store.invokeKeyPlain || displayInvokeKey, 'Workflow Key')"
              />
            </div>
          </FieldRow>
          <div :class="styles.deleteRow">
            <el-button size="small" :loading="rotatingKey" @click="rotateInvokeKey">
              轮换密钥
            </el-button>
          </div>
        </SectionToggle>
        <InvocationMethodsPanel />
        <p :class="styles.emptyHint">选择节点或连线以编辑详细配置</p>
      </el-scrollbar>
    </div>
  </div>
</template>
