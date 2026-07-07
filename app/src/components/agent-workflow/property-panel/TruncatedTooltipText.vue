<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  maxWidth?: number
}>(), {
  placement: 'top',
  maxWidth: 360,
})

const attrs = useAttrs()
</script>

<template>
  <el-tooltip
    :content="content"
    :placement="placement"
    :show-after="200"
    :popper-style="{ maxWidth: `${maxWidth}px`, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }"
  >
    <span :class="[$style.text, attrs.class]" :style="attrs.style as Record<string, string> | undefined">
      <slot>{{ content }}</slot>
    </span>
  </el-tooltip>
</template>

<style module>
.text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
</style>
