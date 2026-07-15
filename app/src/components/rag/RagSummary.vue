<template>
  <div :class="$style.summary">
    <div :class="[$style.hero, healthTone]">
      <div :class="$style.ring" :style="{ '--pct': `${healthPercent}%` }">
        <span :class="$style.ringValue">{{ healthPercent }}%</span>
        <span :class="$style.ringLabel">覆盖率</span>
      </div>
      <div :class="$style.heroBody">
        <div :class="$style.heroTitle">知识库健康度</div>
        <p :class="$style.heroDesc">{{ healthDesc }}</p>
        <div :class="$style.heroMeta">
          <span>向量 {{ status?.totalEmbeddings ?? 0 }} 条</span>
          <span>Schema {{ status?.indexed ?? 0 }}/{{ status?.totalSchemas ?? 0 }}</span>
          <span>流程 {{ status?.indexedFlows ?? 0 }}/{{ status?.totalFlows ?? 0 }}</span>
        </div>
      </div>
    </div>

    <div
      v-for="card in cards"
      :key="card.key"
      :class="$style.card"
    >
      <div :class="$style.cardHead">
        <span :class="$style.cardIcon" :style="{ color: card.color }">
          <AppIcon :name="card.icon" :size="16" />
        </span>
        <span :class="$style.label">{{ card.label }}</span>
      </div>
      <div :class="[$style.value, card.tone]">{{ card.value }}</div>
      <div :class="$style.sub">{{ card.sub }}</div>
      <div v-if="card.progress != null" :class="$style.progressTrack">
        <div
          :class="$style.progressFill"
          :style="{ width: `${card.progress}%`, background: card.color }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { RagStatusData } from '@/api/aiApi'

const props = defineProps<{
  status: RagStatusData | null
  healthPercent: number
}>()

const healthTone = computed(() => {
  if (props.healthPercent >= 90) return 'toneGood'
  if (props.healthPercent >= 50) return 'toneWarn'
  return 'toneBad'
})

const healthDesc = computed(() => {
  if (!props.status) return '正在读取索引状态…'
  if (!props.status.embeddingConfigured) {
    return '未配置嵌入模型，当前会退回关键词匹配，建议先完成嵌入配置。'
  }
  if (props.healthPercent >= 90) {
    return '索引覆盖良好，语义检索可直接用于对话与工作流召回。'
  }
  if ((props.status.unindexed ?? 0) + (props.status.unindexedFlows ?? 0) > 0) {
    return '仍有资源未建索引，补建后可提升召回准确率。'
  }
  if ((props.status.stale ?? 0) > 0) {
    return '存在过期索引，建议重建以保持与最新 Schema/流程一致。'
  }
  return '索引状态正常，可持续观测嵌入质量与覆盖变化。'
})

const cards = computed(() => {
  const s = props.status
  const schemaTotal = s?.totalSchemas ?? 0
  const schemaIndexed = s?.indexed ?? 0
  const flowTotal = s?.totalFlows ?? 0
  const flowIndexed = s?.indexedFlows ?? 0
  return [
    {
      key: 'schema',
      label: 'Schema',
      icon: 'document' as const,
      color: '#3b82f6',
      value: schemaTotal,
      sub: `已索引 ${schemaIndexed}`,
      progress: schemaTotal ? Math.round((schemaIndexed / schemaTotal) * 100) : 0,
      tone: '',
    },
    {
      key: 'flow',
      label: '流程',
      icon: 'connection' as const,
      color: '#10b981',
      value: flowTotal,
      sub: `已索引 ${flowIndexed}`,
      progress: flowTotal ? Math.round((flowIndexed / flowTotal) * 100) : 0,
      tone: '',
    },
    {
      key: 'pending',
      label: '待索引',
      icon: 'timer' as const,
      color: '#f59e0b',
      value: s?.unindexed ?? 0,
      sub: `流程待索引 ${s?.unindexedFlows ?? 0}`,
      progress: null as number | null,
      tone: (s?.unindexed ?? 0) > 0 ? 'valueWarning' : 'valueSuccess',
    },
    {
      key: 'stale',
      label: '过期',
      icon: 'warning' as const,
      color: '#ef4444',
      value: s?.stale ?? 0,
      sub: '更新后未重同步',
      progress: null as number | null,
      tone: (s?.stale ?? 0) > 0 ? 'valueWarning' : 'valueSuccess',
    },
  ]
})
</script>

<style module>
.summary {
  display: grid;
  grid-template-columns: 1.6fr repeat(4, 1fr);
  gap: 14px;
}

.hero {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--el-color-primary) 8%, transparent), transparent 60%),
    var(--el-bg-color);
}

.toneGood {
  --ring-color: var(--el-color-success);
}

.toneWarn {
  --ring-color: var(--el-color-warning);
}

.toneBad {
  --ring-color: var(--el-color-danger);
}

.ring {
  --pct: 0%;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background:
    radial-gradient(closest-side, var(--el-bg-color) 68%, transparent 69% 100%),
    conic-gradient(var(--ring-color, var(--el-color-primary)) var(--pct), var(--el-fill-color-light) 0);
}

.ringValue {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1;
}

.ringLabel {
  font-size: 11px;
  line-height: 1;
  color: var(--el-text-color-secondary);
}

.heroBody {
  min-width: 0;
}

.heroTitle {
  font-size: 14px;
  font-weight: 650;
  color: var(--el-text-color-primary);
}

.heroDesc {
  margin: 6px 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.heroMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 11px;
  color: var(--el-text-color-regular);
}

.card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cardHead {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cardIcon {
  display: inline-flex;
}

.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.value {
  font-size: 26px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.1;
}

.sub {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.progressTrack {
  margin-top: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: inherit;
}

.valueSuccess {
  color: var(--el-color-success);
}

.valueWarning {
  color: var(--el-color-warning);
}

@media (max-width: 1200px) {
  .summary {
    grid-template-columns: 1fr 1fr;
  }

  .hero {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .summary {
    grid-template-columns: 1fr;
  }
}
</style>
