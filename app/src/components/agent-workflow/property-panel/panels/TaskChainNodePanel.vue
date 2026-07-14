<script setup lang="ts">
/**
 * TaskChainNodePanel — 任务链节点属性面板
 *
 * 配置链来源、静态链 JSON、步骤输出处理。
 */

import { computed, ref } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import HintText from '../HintText.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import type { AgentNodePanelProps, AgentNodePanelEmits } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const chainSource = computed({
  get: () => props.node.data?.chainSource ?? 'upstream',
  set: (v) => update('chainSource', v),
})

const staticChainJson = computed(() => {
  const chain = props.node.data?.staticChain
  if (!chain || !Array.isArray(chain)) return '[]'
  try {
    return JSON.stringify(chain, null, 2)
  } catch {
    return '[]'
  }
})

const jsonError = ref('')

function onStaticChainInput(text: string) {
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) {
      jsonError.value = '必须是 JSON 数组'
      return
    }
    jsonError.value = ''
    update('staticChain', parsed)
  } catch {
    jsonError.value = 'JSON 格式错误'
  }
}
</script>

<template>
  <SectionToggle title="任务链配置" :count="3">
    <FieldRow label="链来源" hint="upstream 使用上游任务规划输出，static 使用手动定义的静态链">
      <el-radio-group v-model="chainSource">
        <el-radio value="upstream">上游输入</el-radio>
        <el-radio value="static">静态定义</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow v-if="chainSource === 'static'" label="静态任务链" textarea hint="JSON 数组，每项含 id / agent / description / inputs / dependencies">
      <el-input
        type="textarea"
        :rows="8"
        :model-value="staticChainJson"
        placeholder='[{"id":"step1","agent":"editor","description":"...","inputs":{},"dependencies":[]}]'
        @update:model-value="onStaticChainInput"
      />
      <div v-if="jsonError" style="color: var(--el-color-danger); font-size: 12px; margin-top: 4px">
        {{ jsonError }}
      </div>
    </FieldRow>

    <FieldRow label="步骤输出处理" hint="单步完成后的输出变量名（用于下游引用）">
      <el-input
        :model-value="String(props.node.data?.onStepOutput ?? '')"
        placeholder="如 stepResult"
        @update:model-value="update('onStepOutput', $event)"
      />
      <HintText>每个步骤执行后，输出会以该变量名写入上下文</HintText>
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
