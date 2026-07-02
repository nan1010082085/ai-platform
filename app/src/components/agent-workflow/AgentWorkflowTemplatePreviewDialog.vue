<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import AgentWorkflowCanvas from '@/components/agent-workflow/AgentWorkflowCanvas.vue'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import { getPaletteItem } from '@/constants/agentNodes'
import type {
  AgentNodeType,
  AgentWorkflowGraph,
  AgentWorkflowTemplateMeta,
} from '@/types/agentWorkflow'
import { createAgentWorkflowGraphByTemplate } from '@/types/agentWorkflow'
import styles from './AgentWorkflowTemplatePreviewDialog.module.scss'

const props = defineProps<{
  modelValue: boolean
  template: AgentWorkflowTemplateMeta | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  use: [templateId: AgentWorkflowTemplateMeta['id']]
}>()

const store = useAgentWorkflowDesignerStore()
const { nodes } = storeToRefs(store)
const savedGraph = ref<AgentWorkflowGraph | null>(null)

const nodeSummaries = computed(() =>
  nodes.value.map((node) => {
    const data = (node.data ?? {}) as { label?: string }
    const palette = getPaletteItem(node.type as AgentNodeType)
    return {
      id: node.id,
      label: data.label ?? node.id,
      typeLabel: palette?.label ?? String(node.type),
    }
  }),
)

function restoreStoreGraph() {
  if (savedGraph.value) {
    store.loadGraph(savedGraph.value)
  } else {
    store.reset()
  }
  store.selectNode(null)
  savedGraph.value = null
}

function loadPreviewGraph() {
  if (!props.template) return
  if (store.nodes.length > 0) {
    savedGraph.value = store.getGraph()
  }
  store.loadGraph(createAgentWorkflowGraphByTemplate(props.template.id))
  store.selectNode(null)
}

watch(
  () => props.modelValue,
  (visible, prevVisible) => {
    if (visible && props.template) {
      loadPreviewGraph()
    } else if (prevVisible && !visible) {
      restoreStoreGraph()
    }
  },
)

function onClose() {
  emit('update:modelValue', false)
}

function onUse() {
  if (!props.template) return
  emit('use', props.template.id)
  onClose()
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    :title="template ? `预览：${template.name}` : '预览模板'"
    width="920px"
    :show-fullscreen-btn="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="template" :class="styles.dialogBody">
      <p :class="styles.intro">{{ template.description }}</p>
      <div :class="styles.layout">
        <div :class="styles.canvasWrap">
          <AgentWorkflowCanvas
            read-only
            canvas-id="agent-workflow-template-preview"
          />
        </div>
        <aside :class="styles.nodeList">
          <h4 :class="styles.nodeListTitle">节点清单（{{ nodeSummaries.length }}）</h4>
          <div v-for="node in nodeSummaries" :key="node.id" :class="styles.nodeItem">
            <span :class="styles.nodeLabel">{{ node.label }}</span>
            <span :class="styles.nodeType">{{ node.typeLabel }}</span>
          </div>
        </aside>
      </div>
    </div>
    <template #footer>
      <el-button @click="onClose">关闭</el-button>
      <el-button type="primary" :disabled="!template" @click="onUse">
        使用
      </el-button>
    </template>
  </AppDialog>
</template>
