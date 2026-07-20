<script setup lang="ts">
import { computed } from 'vue'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import { useI18n } from '@schema-platform/platform-shared'
import '@schema-platform/platform-shared/styles/css-variables.scss'

const { locale } = useI18n()
const epLocale = computed(() => (locale.value === 'en-US' ? en : zhCn))
</script>

<template>
  <ElConfigProvider
    :locale="epLocale"
    :size="'default'"
    :z-index="2000"
  >
    <router-view />
  </ElConfigProvider>
</template>

<style>
#ai-app,
#ai-app > div {
  width: 100%;
  height: 100%;
}
</style>
