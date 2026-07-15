<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">索引动态</h3>
      <el-tag
        size="small"
        :type="status?.embeddingConfigured ? 'success' : 'danger'"
        effect="plain"
      >
        {{ status?.embeddingConfigured ? '嵌入已配置' : '嵌入未配置' }}
      </el-tag>
    </div>

    <div v-if="lastReindexResult" :class="$style.reindexResult">
      <AppIcon name="data-analysis" :size="16" />
      <div :class="$style.reindexText">
        <div :class="$style.reindexTitle">上次批量索引结果</div>
        <div :class="$style.chips">
          <span>总计 {{ lastReindexResult.total }}</span>
          <span>新建 {{ lastReindexResult.created }}</span>
          <span>更新 {{ lastReindexResult.updated }}</span>
          <span>跳过 {{ lastReindexResult.skipped }}</span>
          <span :class="lastReindexResult.errors ? $style.chipDanger : undefined">
            失败 {{ lastReindexResult.errors }}
          </span>
        </div>
        <div :class="$style.chips">
          <span>流程 {{ lastReindexResult.flowsTotal }}</span>
          <span>新建 {{ lastReindexResult.flowsCreated }}</span>
          <span>更新 {{ lastReindexResult.flowsUpdated }}</span>
        </div>
      </div>
    </div>

    <div :class="$style.body">
      <div v-if="!status" :class="$style.hint">加载中...</div>

      <template v-else>
        <div :class="$style.coverageBlock">
          <div :class="$style.coverageRow">
            <div :class="$style.coverageLabel">
              <span>Schema 索引</span>
              <strong>{{ schemaPct }}%</strong>
            </div>
            <div :class="$style.barTrack">
              <div :class="$style.barFill" :style="{ width: `${schemaPct}%`, background: '#3b82f6' }" />
            </div>
            <div :class="$style.coverageMeta">
              {{ status.indexed }}/{{ status.totalSchemas }} · 待索 {{ status.unindexed }}
            </div>
          </div>
          <div :class="$style.coverageRow">
            <div :class="$style.coverageLabel">
              <span>流程索引</span>
              <strong>{{ flowPct }}%</strong>
            </div>
            <div :class="$style.barTrack">
              <div :class="$style.barFill" :style="{ width: `${flowPct}%`, background: '#10b981' }" />
            </div>
            <div :class="$style.coverageMeta">
              {{ status.indexedFlows }}/{{ status.totalFlows }} · 待索 {{ status.unindexedFlows }}
            </div>
          </div>
        </div>

        <div v-if="status.unindexed === 0 && status.unindexedFlows === 0 && status.stale === 0" :class="$style.okState">
          <AppIcon name="circle-check" :size="28" />
          <div :class="$style.okTitle">索引状态良好</div>
          <p :class="$style.okDesc">
            Editor {{ status.totalSchemas }} 个 Schema、Flow {{ status.totalFlows }} 个流程均已建立向量索引，共 {{ status.totalEmbeddings }} 条向量条目。
          </p>
        </div>

        <div v-else :class="$style.tips">
          <div v-if="!status.embeddingConfigured" :class="[$style.tipItem, $style.tipDanger]">
            <AppIcon name="warning" :size="16" />
            <span>
              未配置嵌入模型，向量索引无法自动生成；检索将使用关键词模糊匹配。请前往
              <router-link to="/settings/embedding">嵌入模型</router-link>
              完成配置。
            </span>
          </div>
          <div v-else-if="status.autoIndexEnabled" :class="$style.tipItem">
            <AppIcon name="info-filled" :size="16" />
            <span>Editor / Flow 数据在保存与服务启动时会自动建索引，通常无需逐条手动操作。</span>
          </div>
          <div v-if="status.unindexed > 0" :class="$style.tipItem">
            <AppIcon name="warning" :size="16" />
            <span>有 <strong>{{ status.unindexed }}</strong> 个 Schema 尚未建索引，可在下方列表补建或执行「重建索引」。</span>
          </div>
          <div v-if="status.unindexedFlows > 0" :class="$style.tipItem">
            <AppIcon name="warning" :size="16" />
            <span>有 <strong>{{ status.unindexedFlows }}</strong> 个流程尚未建索引，保存流程图或服务重启后将自动补建。</span>
          </div>
          <div v-if="status.stale > 0" :class="$style.tipItem">
            <AppIcon name="refresh" :size="16" />
            <span>有 <strong>{{ status.stale }}</strong> 个索引已过期（Schema 更新后未同步），建议重建索引。</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { RagReindexResult, RagStatusData } from '@/api/aiApi'

const props = defineProps<{
  status: RagStatusData | null
  lastReindexResult: RagReindexResult | null
}>()

const schemaPct = computed(() => {
  const total = props.status?.totalSchemas ?? 0
  if (!total) return 0
  return Math.round(((props.status?.indexed ?? 0) / total) * 100)
})

const flowPct = computed(() => {
  const total = props.status?.totalFlows ?? 0
  if (!total) return 0
  return Math.round(((props.status?.indexedFlows ?? 0) / total) * 100)
})
</script>

<style module>
.container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.reindexResult {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  border-radius: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.reindexTitle {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}

.reindexText {
  flex: 1;
  min-width: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.chips span {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  font-size: 11px;
}

.chipDanger {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9) !important;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 24px 0;
}

.coverageBlock {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coverageRow {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coverageLabel {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.barTrack {
  height: 8px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.35s ease;
}

.coverageMeta {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.okState {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--el-color-success);
  padding: 16px;
}

.okTitle {
  font-size: 15px;
  font-weight: 600;
}

.okDesc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tipItem {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.tipDanger {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}
</style>
