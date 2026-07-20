/**
 * Vitest setup — 全局注册 Element Plus 组件 + i18n
 *
 * 测试环境中 Element Plus 组件未自动注册，
 * 需要在此手动注册常用组件。
 */
import type { Directive } from 'vue'
import { config } from '@vue/test-utils'
import { createI18n } from '@schema-platform/platform-shared'
import {
  ElButton,
  ElInput,
  ElDialog,
  ElForm,
  ElFormItem,
  ElSelect,
  ElOption,
  ElSwitch,
  ElCheckbox,
  ElRadioGroup,
  ElRadioButton,
  ElTag,
  ElIcon,
  ElEmpty,
  ElTooltip,
  ElPopover,
  ElLoading,
  ElCheckboxGroup,
  ElDatePicker,
} from 'element-plus'
import zhCN from '@/locales/zh-CN'
import enUS from '@/locales/en-US'

const i18n = createI18n({
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
})

config.global.plugins = [...(config.global.plugins ?? []), i18n]

// 全局注册 Element Plus 组件
config.global.components = {
  ...config.global.components,
  ElButton,
  ElInput,
  ElDialog,
  ElForm,
  ElFormItem,
  ElSelect,
  ElOption,
  ElSwitch,
  ElCheckbox,
  ElCheckboxGroup,
  ElRadioGroup,
  ElRadioButton,
  ElTag,
  ElIcon,
  ElEmpty,
  ElTooltip,
  ElPopover,
  ElDatePicker,
}

// 全局注册 Element Plus 指令
config.global.directives = {
  ...config.global.directives,
  loading: ElLoading as unknown as Directive,
}
