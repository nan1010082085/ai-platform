<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import '@schema-platform/platform-shared/styles/css-variables.scss'
</script>

<template>
  <ElConfigProvider
    :locale="zhCn"
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
