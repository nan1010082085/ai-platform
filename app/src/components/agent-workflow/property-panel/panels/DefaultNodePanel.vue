<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import styles from './shared.module.scss'
import type { AgentNodePanelProps } from '../types'

defineProps<AgentNodePanelProps>()
</script>

<template>
  <SectionToggle title="结束节点">
    <div :class="styles.hint">输出上游节点的最终结果，作为工作流返回值。</div>
  </SectionToggle>
</template>
