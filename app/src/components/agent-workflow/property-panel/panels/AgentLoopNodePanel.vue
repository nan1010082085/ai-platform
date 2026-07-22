<script setup lang="ts">
/**
 * AgentLoopNodePanel - 智能体循环节点属性面板
 *
 * LLM 自主循环调工具：配置模型、可用工具（平台工具 + 子 workflow）、最大迭代、系统提示、输入来源。
 */
import { ref, computed, onMounted } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import { listWorkflows } from '@/api/agentWorkflowApi'
import type { AgentWorkflowSummary } from '@/types/agentWorkflow'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()
const { modelOptions, defaultModel, loading: modelsLoading } = useModelOptions()
const { load: loadRegistry, getToolsForPanel } = usePluginRegistry()

const publishedWorkflows = ref<AgentWorkflowSummary[]>([])

onMounted(async () => {
  loadRegistry().catch(() => {})
  try {
    const all = await listWorkflows()
    publishedWorkflows.value = all.filter((w) => w.status === 'published')
  } catch { /* ignore */ }
})

const allTools = computed(() => getToolsForPanel())

const selectedTools = computed<string[]>(() => {
  const raw = props.node.data?.agentLoopTools
  return Array.isArray(raw) ? raw.map(String) : []
})

const selectedPlatformTools = computed(() =>
  selectedTools.value.filter((n) => !n.startsWith('workflow:')),
)

const selectedWorkflowRefs = computed(() =>
  selectedTools.value.filter((n) => n.startsWith('workflow:')),
)

function toggleTool(name: string, checked: boolean) {
  const next = checked
    ? Array.from(new Set([...selectedTools.value, name]))
    : selectedTools.value.filter((n) => n !== name)
  update('agentLoopTools', next)
}

function update(field: string, value: unknown) {
  emit('update:node', { ...props.node, data: { ...props.node.data, [field]: value } })
}
</script>

<template>
  <SectionToggle title="智能体循环" default-open>
    <FieldRow label="模型" hint="自主推理用 LLM">
      <ModelOptionSelect
        :model-value="String(props.node.data?.model ?? 'default')"
        :options="modelOptions"
        :default-model="defaultModel"
        :loading="modelsLoading"
        capability="chat"
        @update:model-value="update('model', $event)"
      />
    </FieldRow>

    <FieldRow label="最大迭代" hint="自主循环上限（1-20），默认 8">
      <el-input-number
        :model-value="Number(props.node.data?.agentLoopMaxIterations ?? 8)"
        :min="1"
        :max="20"
        size="small"
        controls-position="right"
        @update:model-value="update('agentLoopMaxIterations', $event)"
      />
    </FieldRow>

    <FieldRow label="工具调用上限" hint="工具调用总次数硬上限（防 token 失控），默认 50">
      <el-input-number
        :model-value="Number(props.node.data?.agentLoopMaxToolInvocations ?? 50)"
        :min="1"
        :max="200"
        :step="10"
        size="small"
        controls-position="right"
        @update:model-value="update('agentLoopMaxToolInvocations', $event)"
      />
    </FieldRow>

    <FieldRow label="输入来源" hint="智能体的初始任务输入">
      <el-select
        :model-value="String(props.node.data?.agentLoopInputSource ?? 'message')"
        size="small"
        @update:model-value="update('agentLoopInputSource', $event)"
      >
        <el-option label="工作流输入 message" value="message" />
        <el-option label="上游节点输出" value="lastOutput" />
        <el-option label="自定义模板" value="custom" />
      </el-select>
    </FieldRow>

    <FieldRow
      v-if="props.node.data?.agentLoopInputSource === 'custom'"
      label="输入模板"
      hint="支持 {{$input.xxx}} / {{$node.xxx}} 变量"
    >
      <el-input
        :model-value="String(props.node.data?.agentLoopInputTemplate ?? '')"
        type="textarea"
        :rows="2"
        placeholder="输入智能体的任务描述模板"
        @update:model-value="update('agentLoopInputTemplate', $event)"
      />
    </FieldRow>

    <FieldRow label="系统提示" hint="智能体角色与约束">
      <el-input
        :model-value="String(props.node.data?.agentLoopSystemPrompt ?? '')"
        type="textarea"
        :rows="4"
        @update:model-value="update('agentLoopSystemPrompt', $event)"
      />
    </FieldRow>

    <FieldRow label="可用工具" :hint="`${selectedPlatformTools.length + selectedWorkflowRefs.length} 个已选`">
      <div :class="$style.toolList">
        <div v-if="allTools.length" :class="$style.toolGroup">
          <span :class="$style.toolGroupLabel">平台工具</span>
          <el-checkbox
            v-for="tool in allTools"
            :key="tool.name"
            :model-value="selectedTools.includes(tool.name)"
            @update:model-value="toggleTool(tool.name, $event)"
          >
            {{ tool.label || tool.name }}
          </el-checkbox>
        </div>
        <div v-if="publishedWorkflows.length" :class="$style.toolGroup">
          <span :class="$style.toolGroupLabel">子工作流</span>
          <el-checkbox
            v-for="wf in publishedWorkflows"
            :key="wf.id"
            :model-value="selectedTools.includes('workflow:' + wf.id)"
            @update:model-value="toggleTool('workflow:' + wf.id, $event)"
          >
            {{ wf.name }}
          </el-checkbox>
        </div>
        <span v-if="!allTools.length && !publishedWorkflows.length" :class="$style.empty">暂无可用工具或子工作流</span>
      </div>
    </FieldRow>
  </SectionToggle>
</template>

<style module src="./shared.module.scss" />
