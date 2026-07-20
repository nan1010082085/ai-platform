<script setup lang="ts">
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import {
  PreviewStartEvent,
  PreviewEndEvent,
  PreviewTask,
  PreviewGateway,
} from '../flow-preview'
import type { FlowNode } from '../FlowCard.vue'
import type { SchemaField } from '../SchemaCard.vue'
import type { Node } from '@vue-flow/core'
import type { Edge } from '@vue-flow/core'

defineProps<{
  nodes: Node[]
  edges: Edge[]
  nodeCount: number
  edgeCount: number
  flowTitle: string
  flowNodes: FlowNode[]
  nodeForms?: Array<{ title: string; fields: SchemaField[] }>
  hasGraph: boolean
  selectedNode: { id: string; data: { label?: string; bpmnType?: string; description?: string } } | null
  getNodeStatusColor: (id: string) => string | undefined
  getNodeTypeLabel: (bpmnType?: string) => string
}>()

const emit = defineEmits<{
  'fit-view': []
  'node-edit': []
  'clear-node': []
}>()
</script>

<template>
  <div v-if="hasGraph" :class="$style.flowCanvasWrapper">
    <div :class="$style.flowToolbar">
      <span :class="$style.flowStats">{{ nodeCount }} 节点 / {{ edgeCount }} 连线</span>
      <el-button :class="$style.fitBtn" title="适配画布" link @click="emit('fit-view')">&#x26F6;</el-button>
    </div>
    <div :class="$style.flowCanvas">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :nodes-draggable="true"
        :nodes-connectable="false"
        :edges-updatable="false"
        :elements-selectable="true"
        :default-viewport="{ zoom: 0.8, x: 0, y: 0 }"
        :min-zoom="0.2"
        :max-zoom="2"
        fit-view-on-init
      >
        <template #node-start-event="nodeProps"><PreviewStartEvent v-bind="nodeProps" /></template>
        <template #node-end-event="nodeProps"><PreviewEndEvent v-bind="nodeProps" /></template>
        <template #node-task="nodeProps"><PreviewTask v-bind="nodeProps" /></template>
        <template #node-gateway="nodeProps"><PreviewGateway v-bind="nodeProps" /></template>
        <Background :gap="16" :size="0.6" color="#e0e5ec" />
        <Controls :show-interactive="false" />
      </VueFlow>
    </div>
    <div v-if="selectedNode" :class="$style.nodeDetail">
      <div :class="$style.nodeDetailHeader">
        <span :class="$style.nodeDetailTitle">{{ selectedNode.data.label }}</span>
        <div :class="$style.nodeDetailActions">
          <el-button :class="$style.nodeEditBtn" title="编辑节点" link @click="emit('node-edit')">&#x270E;</el-button>
          <el-button :class="$style.nodeDetailClose" link @click="emit('clear-node')">&times;</el-button>
        </div>
      </div>
      <div :class="$style.nodeDetailBody">
        <div :class="$style.nodeDetailRow">
          <span :class="$style.nodeDetailLabel">类型</span>
          <span :class="$style.nodeDetailValue">
            <span
              v-if="getNodeStatusColor(selectedNode.id)"
              :class="$style.statusDot"
              :style="{ background: getNodeStatusColor(selectedNode.id) }"
            />
            {{ getNodeTypeLabel(selectedNode.data.bpmnType) }}
          </span>
        </div>
        <div :class="$style.nodeDetailRow">
          <span :class="$style.nodeDetailLabel">ID</span>
          <span :class="$style.nodeDetailValue">{{ selectedNode.id }}</span>
        </div>
        <div v-if="selectedNode.data.description" :class="$style.nodeDetailRow">
          <span :class="$style.nodeDetailLabel">描述</span>
          <span :class="$style.nodeDetailValue">{{ selectedNode.data.description }}</span>
        </div>
      </div>
    </div>
  </div>
  <template v-else>
    <div :class="$style.previewCard">
      <div :class="$style.previewCardHead">
        <span :class="$style.previewCardTitle">{{ flowTitle }}</span>
        <span :class="$style.badge">{{ flowNodes.length }} nodes</span>
      </div>
      <div :class="$style.flowBody">
        <template v-for="(node, idx) in flowNodes" :key="idx">
          <span v-if="idx > 0" :class="$style.arrow">&rarr;</span>
          <span :class="[$style.node, $style[node.type]]">{{ node.label }}</span>
        </template>
      </div>
    </div>
    <div v-for="(form, fIdx) in nodeForms" :key="fIdx" :class="$style.previewCard">
      <div :class="$style.previewCardHead">
        <span :class="$style.previewCardTitle">{{ form.title }}</span>
        <span :class="$style.badge">{{ form.fields.length }} fields</span>
      </div>
      <div :class="$style.previewCardBody">
        <div v-for="(field, idx) in form.fields" :key="idx" :class="$style.previewField">
          <div :class="$style.previewFieldIcon">{{ field.icon }}</div>
          <div :class="$style.previewFieldInfo">
            <div :class="$style.previewFieldName">{{ field.name }}</div>
            <div :class="$style.previewFieldMeta">{{ field.type }}</div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style module src="../AiPreviewPanel.module.scss" />
