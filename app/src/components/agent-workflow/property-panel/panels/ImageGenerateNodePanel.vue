<script setup lang="ts">
/**
 * ImageGenerateNodePanel — 图片生成节点属性面板
 *
 * 配置图片生成的 prompt、模型、尺寸、风格、质量。
 * 支持 prompt 模板变量引用（{{$input.xxx}} / {{$node.xxx}}）。
 * 附带图片预览卡片，展示生成结果。
 */

import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import ImagePreviewCard from '@/components/ImagePreviewCard.vue'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import type { AgentNodePanelProps, AgentNodePanelEmits } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()
const { modelOptions, providerGroups, loading: modelsLoading } = useModelOptions()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const imagePrompt = computed({
  get: () => props.node.data.imagePrompt ?? '',
  set: (v) => update('imagePrompt', v),
})

const imageModel = computed({
  get: () => props.node.data.imageModel ?? 'dall-e-3',
  set: (v) => update('imageModel', v),
})

const imageSize = computed({
  get: () => props.node.data.imageSize ?? '1024x1024',
  set: (v) => update('imageSize', v),
})

const imageStyle = computed({
  get: () => props.node.data.imageStyle ?? 'vivid',
  set: (v) => update('imageStyle', v),
})

const imageQuality = computed({
  get: () => props.node.data.imageQuality ?? 'standard',
  set: (v) => update('imageQuality', v),
})

/* ------ 预览状态（来自 workflow 执行结果） ------ */
const previewImage = computed(() => props.node.data._previewImageUrl as string | undefined)
const previewLoading = computed(() => props.node.data._previewLoading === true)
const previewError = computed(() => props.node.data._previewError as string | undefined)

function handleDownload() {
  if (!previewImage.value) return
  const a = document.createElement('a')
  a.href = previewImage.value
  a.download = `ai-image-${Date.now()}.png`
  a.click()
}

function handleRegenerate() {
  emit('updateNodeData', '_previewLoading', true)
  emit('updateNodeData', '_previewImageUrl', undefined)
  emit('updateNodeData', '_previewError', undefined)
}
</script>

<template>
  <SectionToggle title="图片生成配置" :count="5">
    <FieldRow label="生成 Prompt" textarea hint="描述要生成的图片内容，支持 {{$input.xxx}} 等变量模板">
      <el-input
        v-model="imagePrompt"
        type="textarea"
        :rows="3"
        placeholder="例如：一只可爱的卡通猫咪在花园里玩耍"
      />
    </FieldRow>

    <FieldRow label="图片模型" hint="来自模型中心；可筛选或直接输入 model id">
      <ModelOptionSelect
        v-model="imageModel"
        :options="modelOptions"
        :groups="providerGroups"
        :loading="modelsLoading"
        placeholder="选择或输入图片模型"
      />
    </FieldRow>

    <FieldRow label="图片尺寸">
      <el-select v-model="imageSize" style="width: 100%">
        <el-option label="1024x1024 (正方形)" value="1024x1024" />
        <el-option label="1024x1792 (竖版)" value="1024x1792" />
        <el-option label="1792x1024 (横版)" value="1792x1024" />
      </el-select>
    </FieldRow>

    <FieldRow label="风格">
      <el-select v-model="imageStyle" style="width: 100%">
        <el-option label="自然" value="natural" />
        <el-option label="鲜艳" value="vivid" />
      </el-select>
    </FieldRow>

    <FieldRow label="质量">
      <el-select v-model="imageQuality" style="width: 100%">
        <el-option label="标准" value="standard" />
        <el-option label="高清" value="hd" />
      </el-select>
    </FieldRow>
  </SectionToggle>

  <!-- 生成预览（当工作流执行过该节点且有结果时展示） -->
  <SectionToggle title="生成预览" :default-open="false">
    <ImagePreviewCard
      :image-url="previewImage"
      :prompt="imagePrompt"
      :model="imageModel"
      :size="imageSize"
      :style="imageStyle"
      :quality="imageQuality"
      :loading="previewLoading"
      :error="previewError"
      @download="handleDownload"
      @regenerate="handleRegenerate"
    />
  </SectionToggle>

  <VariableReferencePanel :node="node" @update-node-data="(key: string, value: unknown) => emit('updateNodeData', key, value)" />
</template>
