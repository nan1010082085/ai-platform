<script setup lang="ts">
/**
 * AgentTeamNodePanel - Agent 团队节点配置面板
 *
 * 多 Agent 协作配置：成员列表（人设/模型/工具）+ 协作模式 + supervisor 设置。
 * 复用 AgentLoopNodePanel 的模型选择 + 工具多选范式。
 */
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import type { AgentNodePanelProps } from '../types'
import type { AgentWorkflowNodeData } from '@/types/agentWorkflow'
import styles from './shared.module.scss'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<{
  'updateNodeData': [key: string, value: unknown]
}>()

const { options: modelOptions } = useModelOptions()
const { tools } = usePluginRegistry()

const toolOptions = computed(() =>
  tools.value.map((t: { name: string; label?: string }) => ({
    label: t.label ?? t.name,
    value: t.name,
  })),
)

interface TeamMember {
  name: string
  persona: string
  model?: string
  tools?: string[]
}

const members = computed<TeamMember[]>(() => (props.node.data?.agentTeamMembers as TeamMember[]) ?? [])
const mode = computed(() => props.node.data?.agentTeamMode ?? 'sequential')
const maxRounds = computed(() => props.node.data?.agentTeamMaxRounds ?? 5)
const supervisorModel = computed(() => props.node.data?.agentTeamModel ?? 'default')
const supervisorPrompt = computed(() => props.node.data?.agentTeamSystemPrompt ?? '')

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

function updateMembers(newMembers: TeamMember[]) {
  update('agentTeamMembers', newMembers)
}

function addMember() {
  updateMembers([...members.value, { name: `成员${members.value.length + 1}`, persona: '', tools: [] }])
}

function removeMember(idx: number) {
  updateMembers(members.value.filter((_, i) => i !== idx))
}

function updateMember(idx: number, field: keyof TeamMember, value: unknown) {
  const list = [...members.value]
  list[idx] = { ...list[idx], [field]: value }
  updateMembers(list)
}

const modeOptions = [
  { label: '顺序执行', value: 'sequential', hint: '按顺序让每位成员完成各自部分，最后综合' },
  { label: '自由讨论', value: 'discussion', hint: '可多次调用同一成员，成员间基于前一位输出深化' },
]
</script>

<template>
  <SectionToggle title="团队配置" :count="6">
    <FieldRow label="协作模式" hint="决定 Supervisor 如何调度成员">
      <el-select :model-value="mode" style="width: 100%" @update:model-value="(v: string) => update('agentTeamMode', v)">
        <el-option v-for="opt in modeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
      <div :class="styles.hint">{{ modeOptions.find(o => o.value === mode)?.hint }}</div>
    </FieldRow>

    <FieldRow label="最大轮次" hint="Supervisor 最多调度几轮（防失控）">
      <el-slider
        :model-value="maxRounds"
        :min="1"
        :max="15"
        show-input
        @update:model-value="(v: number) => update('agentTeamMaxRounds', v)"
      />
    </FieldRow>

    <FieldRow label="Supervisor 模型" hint="调度决策使用的模型">
      <ModelOptionSelect
        :model-value="supervisorModel"
        :options="modelOptions"
        @update:model-value="(v: string) => update('agentTeamModel', v)"
      />
    </FieldRow>

    <FieldRow label="Supervisor 指令" hint="可选，留空用默认调度提示">
      <el-input
        :model-value="supervisorPrompt"
        type="textarea"
        :rows="3"
        placeholder="自定义 supervisor 系统提示（可选）"
        @update:model-value="(v: string) => update('agentTeamSystemPrompt', v)"
      />
    </FieldRow>

    <FieldRow label="工具调用上限" hint="团队成员工具调用总次数上限">
      <el-slider
        :model-value="props.node.data?.agentLoopMaxToolInvocations ?? 50"
        :min="5"
        :max="100"
        :step="5"
        show-input
        @update:model-value="(v: number) => update('agentLoopMaxToolInvocations', v)"
      />
    </FieldRow>

    <div :class="styles.sectionDivider" />

    <div :class="styles.subSectionHeader">
      <span>团队成员（{{ members.length }}）</span>
      <el-button link type="primary" size="small" @click="addMember">
        <AppIcon name="user" :size="12" /> 添加成员
      </el-button>
    </div>

    <div v-for="(member, idx) in members" :key="idx" :class="styles.memberCard">
      <div :class="styles.memberHead">
        <el-input
          :model-value="member.name"
          size="small"
          placeholder="成员名称"
          style="width: 120px"
          @update:model-value="(v: string) => updateMember(idx, 'name', v)"
        />
        <el-button link type="danger" size="small" @click="removeMember(idx)">删除</el-button>
      </div>
      <el-input
        :model-value="member.persona"
        type="textarea"
        :rows="2"
        placeholder="人设/角色描述"
        @update:model-value="(v: string) => updateMember(idx, 'persona', v)"
      />
      <div :class="styles.memberMeta">
        <FieldRow label="模型">
          <ModelOptionSelect
            :model-value="member.model ?? 'default'"
            :options="modelOptions"
            @update:model-value="(v: string) => updateMember(idx, 'model', v)"
          />
        </FieldRow>
        <FieldRow label="工具">
          <el-select
            :model-value="member.tools ?? []"
            multiple
            filterable
            placeholder="选择工具"
            style="width: 100%"
            @update:model-value="(v: string[]) => updateMember(idx, 'tools', v)"
          >
            <el-option v-for="opt in toolOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </FieldRow>
      </div>
    </div>

    <div v-if="members.length === 0" :class="styles.hint" style="padding: 12px 0;">
      点击「添加成员」配置团队成员
    </div>
  </SectionToggle>
</template>
