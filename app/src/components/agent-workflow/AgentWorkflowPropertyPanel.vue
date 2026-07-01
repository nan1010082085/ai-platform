<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import { useAgentNodePropertyPanel } from '@/composables/useAgentNodePropertyPanel'
import { getAgentNodePreviewSections } from '@/utils/agentNodePreview'
import type { AgentNodeRecord, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import SectionToggle from './property-panel/SectionToggle.vue'
import FieldRow from './property-panel/FieldRow.vue'
import styles from './AgentWorkflowPropertyPanel.module.scss'

const store = useAgentWorkflowDesignerStore()
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
</script>

<template>
  <div :class="styles.panel">
    <div :class="styles.header">
      <AppIcon name="set-up" :size="14" />
      <span v-if="selectedNode">{{ nodeTypeDisplayName }} 配置</span>
      <span v-else-if="selectedEdge">连线配置</span>
      <span v-else>属性配置</span>
    </div>

    <template v-if="selectedNode">
      <div :class="styles.widgetNameRow">
        <span :class="styles.widgetType">{{ nodeData.label || selectedNode.id }}</span>
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
              <span :class="styles.previewLabel">{{ row.label }}</span>
              <span :class="styles.previewValue">{{ row.value }}</span>
            </div>
          </template>
          <template v-if="previewSections.runtime.length">
            <div :class="styles.previewGroupTitle">执行结果</div>
            <div
              v-for="row in previewSections.runtime.filter((r) => !['status', 'duration'].includes(r.key))"
              :key="row.key"
              :class="styles.previewRow"
            >
              <span :class="styles.previewLabel">{{ row.label }}</span>
              <span :class="styles.previewValue">{{ row.value }}</span>
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
      <span :class="styles.emptyText">请选择节点或连线</span>
    </div>
  </div>
</template>
