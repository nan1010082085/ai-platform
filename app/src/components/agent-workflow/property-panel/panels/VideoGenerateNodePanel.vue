<script setup lang="ts">
/**
 * VideoGenerateNodePanel - 视频生成节点属性面板
 *
 * 配置视频生成的 prompt、模型、时长、分辨率。
 * 节点执行时内置异步轮询直到视频生成完成。
 */

import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import type { AgentNodePanelProps, AgentNodePanelEmits } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()
const { modelOptions, providerGroups, loading: modelsLoading } = useModelOptions()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const videoPrompt = computed({
  get: () => props.node.data.videoPrompt ?? '',
  set: (v) => update('videoPrompt', v),
})

const videoModel = computed({
  get: () => props.node.data.videoModel ?? '',
  set: (v) => update('videoModel', v),
})

const duration = computed({
  get: () => props.node.data.duration ?? 8,
  set: (v) => update('duration', v),
})

const resolution = computed({
  get: () => props.node.data.resolution ?? '720p',
  set: (v) => update('resolution', v),
})

const pollIntervalMs = computed({
  get: () => props.node.data.pollIntervalMs ?? 5000,
  set: (v) => update('pollIntervalMs', v),
})

const pollTimeoutMs = computed({
  get: () => props.node.data.pollTimeoutMs ?? 300000,
  set: (v) => update('pollTimeoutMs', v),
})

/* ------ 预览状态（来自 workflow 执行结果） ------ */
const previewVideoUrl = computed(() => props.node.data._previewVideoUrl as string | undefined)
const previewLoading = computed(() => props.node.data._previewLoading === true)
const previewError = computed(() => props.node.data._previewError as string | undefined)
</script>

<template>
  <SectionToggle title="视频生成配置" :count="4">
    <FieldRow label="生成 Prompt" textarea hint="描述要生成的视频内容，支持 {{$input.xxx}} 等变量模板">
      <el-input
        v-model="videoPrompt"
        type="textarea"
        :rows="3"
        placeholder="例如：一只小猫在阳光下追逐蝴蝶，温馨治愈的田园风光"
      />
    </FieldRow>

    <FieldRow label="视频模型" hint="来自模型中心；仅显示具备视频生成能力的模型">
      <ModelOptionSelect
        v-model="videoModel"
        :options="modelOptions"
        :groups="providerGroups"
        :loading="modelsLoading"
        capability="video"
        placeholder="选择或输入视频模型"
      />
    </FieldRow>

    <FieldRow label="时长（秒）" hint="典型 6-15 秒">
      <el-input-number
        v-model="duration"
        :min="3"
        :max="30"
        :step="1"
        style="width: 100%"
      />
    </FieldRow>

    <FieldRow label="分辨率">
      <el-select v-model="resolution" style="width: 100%">
        <el-option label="480p" value="480p" />
        <el-option label="720p" value="720p" />
        <el-option label="1080p" value="1080p" />
      </el-select>
    </FieldRow>
  </SectionToggle>

  <SectionToggle title="轮询设置" :default-open="false">
    <FieldRow label="轮询间隔（毫秒）" hint="提交生成任务后，多久检查一次状态">
      <el-input-number
        v-model="pollIntervalMs"
        :min="2000"
        :max="60000"
        :step="1000"
        style="width: 100%"
      />
    </FieldRow>
    <FieldRow label="最大等待时长（毫秒）" hint="超时则节点失败">
      <el-input-number
        v-model="pollTimeoutMs"
        :min="60000"
        :max="900000"
        :step="60000"
        style="width: 100%"
      />
    </FieldRow>
  </SectionToggle>

  <!-- 生成预览 -->
  <SectionToggle title="生成预览" :default-open="false">
    <div v-if="previewLoading" style="padding: 16px; text-align: center; color: var(--text-color-secondary)">
      视频生成中，请稍候…
    </div>
    <div v-else-if="previewError" style="padding: 16px; color: var(--el-color-danger)">
      {{ previewError }}
    </div>
    <video
      v-else-if="previewVideoUrl"
      :src="previewVideoUrl"
      controls
      style="width: 100%; border-radius: 8px"
    />
    <div v-else style="padding: 16px; text-align: center; color: var(--text-color-placeholder)">
      执行该节点后将展示生成结果
    </div>
  </SectionToggle>

  <VariableReferencePanel :node="node" @update-node-data="(key: string, value: unknown) => emit('updateNodeData', key, value)" />
</template>
