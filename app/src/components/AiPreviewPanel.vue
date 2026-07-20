<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'
import type { Widget, FlowGraph, FlowNodeData } from '@/types'
import { useFlowPreview } from '@/composables/useFlowPreview'
import { usePreviewInteraction } from '@/composables/usePreviewInteraction'
import AiFieldEditor from './AiFieldEditor.vue'
import FormWidgetPreview from './preview/FormWidgetPreview.vue'
import FlowPreviewSection from './preview/FlowPreviewSection.vue'
import {
  DEFAULT_BUILD_STEPS,
  STEP_ICONS,
  STEP_LABELS,
  filterFormWidgets,
  createPreviewFieldHandlers,
  type SchemaBuildStep,
} from './preview/previewPanelHelpers'

export interface PreviewSchemaData {
  title: string
  fields: SchemaField[]
}

export interface PreviewFlowData {
  title: string
  nodes: FlowNode[]
  graph?: FlowGraph
  nodeForms?: Array<{ title: string; fields: SchemaField[] }>
}

export type PreviewTab = 'schema' | 'json' | 'flow'
export type { SchemaBuildStep }

export interface AiPreviewPanelProps {
  tabs: PreviewTab[]
  schemaData?: PreviewSchemaData
  flowData?: PreviewFlowData
  schemaWidgets?: Widget[]
  jsonString?: string
  primaryAction?: string
  secondaryAction?: string
  currentBuildStep?: SchemaBuildStep | null
  buildSteps?: SchemaBuildStep[]
  highlightedFieldIds?: string[]
  showCompareButton?: boolean
}

const props = withDefaults(defineProps<AiPreviewPanelProps>(), {
  tabs: () => ['schema', 'json'],
  primaryAction: '确认发布',
  secondaryAction: '在编辑器中打开',
  highlightedFieldIds: () => [],
  showCompareButton: false,
})

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
  'node-click': [nodeId: string, nodeData: Record<string, unknown>]
  'field-click': [fieldId: string, fieldData: Record<string, unknown>]
  'field-edit': [fieldId: string, data: Record<string, unknown>]
  'field-update': [fieldId: string, changes: Record<string, unknown>]
  'apply-to-editor': [widgetIds?: string[]]
  'compare': []
}>()

const activeTab = ref<PreviewTab>(props.tabs[0])
const tabLabels: Record<PreviewTab, string> = { schema: 'Schema', json: 'JSON', flow: 'Flow' }
const interaction = usePreviewInteraction()

watch(
  () => props.highlightedFieldIds,
  (ids) => interaction.setHighlightedFields(ids),
  { immediate: true },
)

const formWidgets = computed(() => filterFormWidgets(props.schemaWidgets))

const {
  handleFieldClick,
  handleFieldEdit,
  handleFieldSave,
  handleStartInlineEdit,
  handleInlineEditChange,
  handleCommitInlineEdit,
  handleCancelInlineEdit,
  handleApplyToEditor,
  handleToggleSelection,
  handleSelectAll: selectAllWidgets,
} = createPreviewFieldHandlers(interaction, emit)

function handleSelectAll() {
  selectAllWidgets(formWidgets.value)
}

const activeBuildSteps = computed(() => props.buildSteps ?? DEFAULT_BUILD_STEPS)
const stepLabels = STEP_LABELS
const stepIcons = STEP_ICONS
const currentStepIndex = computed(() => {
  if (!props.currentBuildStep) return -1
  return activeBuildSteps.value.indexOf(props.currentBuildStep)
})

const flowGraphRef = computed(() => props.flowData?.graph)
const { nodes, edges, nodeCount, edgeCount } = useFlowPreview(flowGraphRef)
const { onNodeClick, fitView } = useVueFlow({ id: 'ai-flow-preview' })

onNodeClick(({ node }) => {
  interaction.selectNode(node.id, node.data as FlowNodeData)
  emit('node-click', node.id, node.data as Record<string, unknown>)
})

watch(
  () => props.flowData?.graph,
  async (graph) => {
    if (graph && activeTab.value === 'flow') {
      await nextTick()
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    }
  },
  { deep: true },
)

watch(activeTab, async (tab) => {
  if (tab === 'flow' && props.flowData?.graph) {
    await nextTick()
    setTimeout(() => fitView({ padding: 0.2 }), 100)
  }
  interaction.clearFieldSelection()
  interaction.clearNodeSelection()
})

function handleFitView() {
  fitView({ padding: 0.2 })
}

function handleNodeEdit() {
  if (interaction.selectedNodeDetail.value) {
    interaction.openNodeEdit(
      interaction.selectedNodeDetail.value.id,
      interaction.selectedNodeDetail.value.data,
    )
  }
}

function getNodeTypeLabel(bpmnType: string): string {
  const labels: Record<string, string> = {
    startEvent: '开始事件',
    endEvent: '结束事件',
    userTask: '用户任务',
    serviceTask: '服务任务',
    scriptTask: '脚本任务',
    sendTask: '发送任务',
    receiveTask: '接收任务',
    exclusiveGateway: '排他网关',
    parallelGateway: '并行网关',
    inclusiveGateway: '包含网关',
  }
  return labels[bpmnType] ?? bpmnType
}

function getNodeStatusColor(nodeId: string): string | undefined {
  const status = interaction.getNodeStatus(nodeId)
  return status ? interaction.getNodeStatusColor(status) : undefined
}
</script>

<template>
  <div :class="$style.preview">
    <div :class="$style.header">
      <span :class="$style.title">预览</span>
      <div :class="$style.tabs">
        <span
          v-for="tab in tabs"
          :key="tab"
          :class="[$style.tab, { [$style.tabActive]: activeTab === tab }]"
          @click="activeTab = tab"
        >
          {{ tabLabels[tab] }}
        </span>
      </div>
      <div :class="$style.headerActions">
        <el-button
          v-if="showCompareButton"
          :class="$style.headerBtn"
          title="对比模式"
          link
          @click="emit('compare')"
        >
          &#x2194;
        </el-button>
      </div>
    </div>

    <div v-if="currentBuildStep" :class="$style.buildSteps">
      <div
        v-for="(step, idx) in activeBuildSteps"
        :key="step"
        :class="[
          $style.buildStep,
          {
            [$style.buildStepDone]: idx < currentStepIndex,
            [$style.buildStepActive]: idx === currentStepIndex,
            [$style.buildStepPending]: idx > currentStepIndex,
          },
        ]"
      >
        <span :class="$style.buildStepIcon" v-html="stepIcons[step]" />
        <span :class="$style.buildStepLabel">{{ stepLabels[step] }}</span>
      </div>
    </div>

    <div :class="$style.body">
      <div v-if="activeTab === 'schema' && !schemaData" :class="$style.empty">
        <div :class="$style.emptyIcon">&#x1F441;</div>
        <div :class="$style.emptyText">生成内容将在此预览</div>
      </div>
      <div v-if="activeTab === 'flow' && !flowData" :class="$style.empty">
        <div :class="$style.emptyIcon">&#x1F441;</div>
        <div :class="$style.emptyText">生成内容将在此预览</div>
      </div>

      <template v-if="activeTab === 'schema' && schemaData">
        <div :class="$style.previewCard">
          <div :class="$style.previewCardHead">
            <span :class="$style.previewCardTitle">{{ schemaData.title }}</span>
            <div :class="$style.previewCardActions">
              <span :class="$style.badge">{{ schemaData.fields.length }} fields</span>
              <el-button
                v-if="formWidgets.length > 0"
                :class="$style.selectAllBtn"
                link
                size="small"
                @click="handleSelectAll"
              >
                全选
              </el-button>
            </div>
          </div>
          <div :class="$style.formPreview">
            <FormWidgetPreview
              :widgets="formWidgets"
              :selected-ids="interaction.selectedWidgetIds.value"
              :highlighted-ids="highlightedFieldIds"
              :inline-edit-widget-id="interaction.inlineEditWidgetId.value"
              :inline-edit-data="interaction.inlineEditData.value"
              @field-click="handleFieldClick"
              @toggle-selection="handleToggleSelection"
              @start-inline-edit="handleStartInlineEdit"
              @commit-inline-edit="handleCommitInlineEdit"
              @cancel-inline-edit="handleCancelInlineEdit"
              @inline-edit-change="handleInlineEditChange"
              @field-edit="handleFieldEdit"
            />
          </div>
        </div>
      </template>

      <template v-if="activeTab === 'flow' && flowData">
        <FlowPreviewSection
          :nodes="nodes"
          :edges="edges"
          :node-count="nodeCount"
          :edge-count="edgeCount"
          :flow-title="flowData.title"
          :flow-nodes="flowData.nodes"
          :node-forms="flowData.nodeForms"
          :has-graph="Boolean(flowData.graph)"
          :selected-node="interaction.selectedNodeDetail.value"
          :get-node-status-color="getNodeStatusColor"
          :get-node-type-label="getNodeTypeLabel"
          @fit-view="handleFitView"
          @node-edit="handleNodeEdit"
          @clear-node="interaction.clearNodeSelection()"
        />
      </template>

      <template v-if="activeTab === 'json'">
        <pre v-if="jsonString" :class="$style.jsonBlock">{{ jsonString }}</pre>
        <div v-else :class="$style.empty">
          <div :class="$style.emptyIcon">&#x1F441;</div>
          <div :class="$style.emptyText">生成内容将在此预览</div>
        </div>
      </template>
    </div>

    <div v-if="interaction.isFieldDetailVisible.value && interaction.selectedFieldDetail.value && activeTab === 'schema'" :class="$style.fieldDetail">
      <div :class="$style.fieldDetailHeader">
        <span :class="$style.fieldDetailTitle">组件详情</span>
        <el-button :class="$style.fieldDetailClose" link @click="interaction.closeFieldDetail()">&times;</el-button>
      </div>
      <div :class="$style.fieldDetailBody">
        <div :class="$style.fieldDetailRow">
          <span :class="$style.fieldDetailLabel">类型</span>
          <span :class="$style.fieldDetailValue">{{ interaction.selectedFieldDetail.value.type }}</span>
        </div>
        <div :class="$style.fieldDetailRow">
          <span :class="$style.fieldDetailLabel">标签</span>
          <span :class="$style.fieldDetailValue">{{ interaction.selectedFieldDetail.value.label ?? '-' }}</span>
        </div>
        <div :class="$style.fieldDetailRow">
          <span :class="$style.fieldDetailLabel">字段名</span>
          <span :class="$style.fieldDetailValue">{{ interaction.selectedFieldDetail.value.field ?? '-' }}</span>
        </div>
        <div :class="$style.fieldDetailRow">
          <span :class="$style.fieldDetailLabel">ID</span>
          <span :class="$style.fieldDetailValue">{{ interaction.selectedFieldDetail.value.id }}</span>
        </div>
        <div v-if="interaction.selectedFieldDetail.value.props" :class="$style.fieldDetailRow">
          <span :class="$style.fieldDetailLabel">属性</span>
          <pre :class="$style.fieldDetailJson">{{ JSON.stringify(interaction.selectedFieldDetail.value.props, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <div
      v-if="(activeTab === 'schema' && schemaData) || (activeTab === 'flow' && flowData)"
      :class="$style.actions"
    >
      <el-button :class="$style.btnPrimary" type="primary" @click="emit('primary-action')">{{ primaryAction }}</el-button>
      <el-button :class="$style.btnApply" @click="handleApplyToEditor">
        {{ interaction.hasSelection.value ? `应用选中 (${interaction.selectedCount.value})` : '应用到编辑器' }}
      </el-button>
      <el-button :class="$style.btnGhost" @click="emit('secondary-action')">{{ secondaryAction }}</el-button>
    </div>

    <AiFieldEditor
      :visible="interaction.isEditDialogVisible.value"
      :context="interaction.editContext.value"
      @update:visible="interaction.closeEditDialog()"
      @save="handleFieldSave"
      @cancel="interaction.closeEditDialog()"
    />
  </div>
</template>

<style module src="./AiPreviewPanel.module.scss" />
