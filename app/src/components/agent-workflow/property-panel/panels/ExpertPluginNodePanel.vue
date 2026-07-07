<script setup lang="ts">
import { computed, onMounted } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const { experts, loading, error, load } = usePluginRegistry()

onMounted(() => {
  void load()
})

const workflowExperts = computed(() =>
  experts.value.filter((e) => !e.runtime?.length || e.runtime.includes('workflow')),
)

const selectedExpert = computed(() =>
  workflowExperts.value.find((e) => e.id === props.node.data?.expertId),
)

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

function onExpertChange(expertId: string) {
  const expert = workflowExperts.value.find((e) => e.id === expertId)
  update('expertId', expertId)
  if (expert?.label) {
    update('label', expert.label)
  }
}
</script>

<template>
  <SectionToggle title="插件专家" :count="2">
    <div v-if="loading" :class="styles.hint">加载插件中心…</div>
    <div v-else-if="error" :class="styles.hint">{{ error }}</div>
    <FieldRow v-else label="专家" hint="来自插件中心 Registry，配置扩展后自动出现">
      <el-select
        :model-value="String(props.node.data?.expertId ?? '')"
        placeholder="选择注册专家"
        filterable
        style="width: 100%"
        @update:model-value="onExpertChange"
      >
        <el-option
          v-for="expert in workflowExperts"
          :key="expert.id"
          :label="expert.label"
          :value="expert.id"
        >
          <span>{{ expert.label }}</span>
          <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px">
            {{ expert.id }}
          </span>
        </el-option>
      </el-select>
    </FieldRow>
    <div v-if="selectedExpert?.description" :class="styles.hint">
      {{ selectedExpert.description }}
    </div>
    <FieldRow label="任务指令" textarea hint="可选，覆盖上游输出作为 Agent 输入">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.prompt ?? '')"
        placeholder="留空则使用上游节点输出"
        @update:model-value="update('prompt', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
