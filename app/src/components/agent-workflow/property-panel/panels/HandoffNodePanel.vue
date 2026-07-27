<script setup lang="ts">
/**
 * HandoffNodePanel - 会话交接节点配置面板
 *
 * 将会话控制权转移给目标已发布 workflow（传递对话历史，目标 workflow 用自身 persona 接管）。
 * 与 agent-loop 的 workflow: 工具调用区别：工具调用是"拿结果回主循环"，handoff 是"目标接管"。
 */
import { ref, computed, onMounted } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import { listWorkflows } from '@/api/agentWorkflowApi'
import type { AgentWorkflowSummary } from '@/types/agentWorkflow'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const publishedWorkflows = ref<AgentWorkflowSummary[]>([])

onMounted(async () => {
  try {
    const all = await listWorkflows()
    publishedWorkflows.value = all.filter((w) => w.status === 'published')
  } catch { /* ignore */ }
})

const selectedId = computed(() => String(props.node.data?.handoffTargetWorkflowId ?? ''))

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="会话交接" :count="3">
    <FieldRow label="目标工作流" hint="会话控制权转移到的已发布 workflow">
      <el-select
        :model-value="selectedId"
        filterable
        placeholder="选择已发布 workflow"
        style="width: 100%"
        @update:model-value="update('handoffTargetWorkflowId', $event)"
      >
        <el-option v-for="wf in publishedWorkflows" :key="wf.id" :label="wf.name" :value="wf.id" />
      </el-select>
    </FieldRow>

    <FieldRow label="传递对话历史" hint="把当前对话历史传给目标 workflow">
      <el-switch
        :model-value="Boolean(props.node.data?.handoffPassHistory ?? true)"
        @update:model-value="update('handoffPassHistory', $event)"
      />
    </FieldRow>

    <FieldRow label="输入模板" hint="传给目标 workflow 的 message，支持 {{$input.xxx}} / {{$node.xxx}}">
      <el-input
        :model-value="String(props.node.data?.handoffInputTemplate ?? '{{$input.message}}')"
        placeholder="{{$input.message}}"
        @update:model-value="update('handoffInputTemplate', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
