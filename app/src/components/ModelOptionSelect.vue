<script setup lang="ts">
import { computed } from 'vue'
import type { ModelOption, ProviderGroup } from '@/composables/useModelOptions'
import type { ModelCapability } from '@schema-platform/platform-shared/ai'
import { getModelProviderMeta } from '@/constants/modelProviderMeta'
import styles from './ModelOptionSelect.module.scss'

const props = withDefaults(defineProps<{
  modelValue: string
  options?: readonly ModelOption[]
  groups?: readonly ProviderGroup[]
  loading?: boolean
  showDefaultOption?: boolean
  defaultLabel?: string
  placeholder?: string
  size?: 'small' | 'default' | 'large'
  /** 允许输入模型中心未录入的自定义 model id */
  allowCreate?: boolean
  /** 按能力过滤模型（如 'image' 只列具备图像生成能力的模型）。不传则不过滤 */
  capability?: ModelCapability
}>(), {
  options: () => [],
  groups: () => [],
  loading: false,
  showDefaultOption: false,
  defaultLabel: '默认模型',
  placeholder: '选择或输入模型',
  size: 'default',
  allowCreate: true,
  capability: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 按能力过滤后的 options */
const filteredOptions = computed<readonly ModelOption[]>(() => {
  if (!props.capability) return props.options
  return props.options.filter((o) => o.capabilities.includes(props.capability!))
})

/** 优先用传入 groups；为空则按 options.provider 推导分组（均按 capability 过滤） */
const resolvedGroups = computed<ProviderGroup[]>(() => {
  if (props.groups.length > 0) {
    if (!props.capability) return [...props.groups]
    return props.groups
      .map((g) => ({
        ...g,
        models: g.models.filter((o) => o.capabilities.includes(props.capability!)),
      }))
      .filter((g) => g.models.length > 0)
  }
  if (filteredOptions.value.length === 0) return []

  const map = new Map<string, ProviderGroup>()
  for (const option of filteredOptions.value) {
    const key = option.provider || 'other'
    let group = map.get(key)
    if (!group) {
      group = {
        providerId: key,
        providerName: getModelProviderMeta(key).label,
        providerType: key,
        models: [],
      }
      map.set(key, group)
    }
    group.models.push(option)
  }
  return [...map.values()]
})

const useGroups = computed(() => resolvedGroups.value.length > 0)

function optionDisplayName(option: ModelOption): string {
  return option.shortLabel || option.model
}

function optionFilterLabel(option: ModelOption): string {
  if (option.shortLabel && option.shortLabel !== option.model) {
    return `${option.shortLabel} ${option.model}`
  }
  return option.label || option.model
}
</script>

<template>
  <el-select
    :model-value="modelValue"
    :loading="loading"
    :placeholder="placeholder"
    :size="size"
    filterable
    :allow-create="allowCreate"
    default-first-option
    clearable
    @update:model-value="emit('update:modelValue', $event ?? '')"
  >
    <el-option
      v-if="showDefaultOption"
      :label="defaultLabel"
      value="default"
    />

    <template v-if="useGroups">
      <el-option-group
        v-for="group in resolvedGroups"
        :key="group.providerId"
        :label="group.providerName"
      >
        <el-option
          v-for="option in group.models"
          :key="option.configId"
          :label="optionFilterLabel(option)"
          :value="option.value"
        >
          <div :class="styles.optionRow">
            <span :class="styles.optionName">
              {{ optionDisplayName(option) }}
              <span
                v-if="optionDisplayName(option) !== option.model"
                :class="styles.optionModelId"
              >
                {{ option.model }}
              </span>
            </span>
            <span :class="styles.optionTags">
              <el-tag v-if="option.isDefault" type="success" size="small" effect="plain">
                默认
              </el-tag>
            </span>
          </div>
        </el-option>
      </el-option-group>
    </template>

    <template v-else>
      <el-option
        v-for="option in filteredOptions"
        :key="option.configId"
        :label="option.label"
        :value="option.value"
      >
        <div :class="styles.optionRow">
          <span :class="styles.optionName">{{ optionDisplayName(option) }}</span>
          <span :class="styles.optionTags">
            <el-tag v-if="option.isDefault" type="success" size="small" effect="plain">
              默认
            </el-tag>
          </span>
        </div>
      </el-option>
    </template>
  </el-select>
</template>
