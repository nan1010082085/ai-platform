<script setup lang="ts">
/**
 * PptGenerateNodePanel — PPT 生成节点属性面板
 *
 * 配置 PPT 生成的模板、页数、风格、是否含图。
 */

import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import type { AgentNodePanelProps, AgentNodePanelEmits } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const pptTemplate = computed({
  get: () => props.node.data.pptTemplate ?? 'business',
  set: (v) => update('pptTemplate', v),
})

const pptMaxSlides = computed({
  get: () => props.node.data.pptMaxSlides ?? 10,
  set: (v) => update('pptMaxSlides', v),
})

const pptStyle = computed({
  get: () => props.node.data.pptStyle ?? 'professional',
  set: (v) => update('pptStyle', v),
})

const pptIncludeImages = computed({
  get: () => props.node.data.pptIncludeImages ?? false,
  set: (v) => update('pptIncludeImages', v),
})
</script>

<template>
  <SectionToggle title="PPT 生成配置" :count="4">
    <FieldRow label="演示文稿模板">
      <el-select v-model="pptTemplate" style="width: 100%">
        <el-option label="商务" value="business" />
        <el-option label="科技" value="tech" />
        <el-option label="教育" value="education" />
        <el-option label="创意" value="creative" />
      </el-select>
    </FieldRow>

    <FieldRow label="最大页数" hint="生成的 PPT 最多包含的页数">
      <el-input-number
        v-model="pptMaxSlides"
        :min="5"
        :max="30"
        :step="1"
        style="width: 100%"
      />
    </FieldRow>

    <FieldRow label="风格">
      <el-select v-model="pptStyle" style="width: 100%">
        <el-option label="专业" value="professional" />
        <el-option label="休闲" value="casual" />
        <el-option label="学术" value="academic" />
      </el-select>
    </FieldRow>

    <FieldRow label="生成配图" hint="是否为每页生成 AI 配图（耗时较长）">
      <el-switch v-model="pptIncludeImages" />
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="node" @update-node-data="(key: string, value: unknown) => emit('updateNodeData', key, value)" />
</template>
