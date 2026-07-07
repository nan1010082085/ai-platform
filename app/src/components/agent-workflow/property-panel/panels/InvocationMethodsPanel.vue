<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import styles from './shared.module.scss'
import { INVOCATION_METHODS } from '@/constants/workflowInvocation'
</script>

<template>
  <SectionToggle title="调用通道" :default-open="false">
    <p :class="styles.hint">
      画布上的「手动触发 / Webhook 触发」是<strong>入口节点</strong>；下方是工作流可被调用的<strong>通道</strong>，与入口节点相互独立。
    </p>
    <ul :class="styles.invocationList">
      <li v-for="item in INVOCATION_METHODS" :key="item.id">
        <span :class="styles.invocationLabel">{{ item.label }}</span>
        <span :class="styles.invocationDesc">{{ item.description }}</span>
      </li>
    </ul>
  </SectionToggle>
</template>
