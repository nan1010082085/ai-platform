<script setup lang="ts">
import type { ModelOption } from '@/composables/useModelOptions'
import { getModelProviderMeta } from '@/constants/modelProviderMeta'
import styles from './ModelOptionSelect.module.scss'

withDefaults(defineProps<{
  modelValue: string
  options: readonly ModelOption[]
  loading?: boolean
  showDefaultOption?: boolean
  defaultLabel?: string
  placeholder?: string
  size?: 'small' | 'default' | 'large'
}>(), {
  loading: false,
  showDefaultOption: false,
  defaultLabel: '默认模型',
  placeholder: '选择模型',
  size: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <el-select
    :model-value="modelValue"
    :loading="loading"
    :placeholder="placeholder"
    :size="size"
    filterable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-if="showDefaultOption"
      :label="defaultLabel"
      value="default"
    />
    <el-option
      v-for="option in options"
      :key="option.configId"
      :label="option.label"
      :value="option.value"
    >
      <div :class="styles.optionRow">
        <span :class="styles.optionName">{{ option.shortLabel }}</span>
        <span :class="styles.optionTags">
          <el-tag
            :type="getModelProviderMeta(option.provider).tagType || undefined"
            size="small"
            effect="plain"
          >
            {{ getModelProviderMeta(option.provider).label }}
          </el-tag>
          <el-tag v-if="option.isDefault" type="success" size="small" effect="plain">
            默认
          </el-tag>
          <el-tag v-if="option.source === 'env'" type="info" size="small" effect="plain">
            环境变量
          </el-tag>
        </span>
      </div>
    </el-option>
  </el-select>
</template>
