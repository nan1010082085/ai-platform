<template>
  <div :class="$style.container">
    <h3 :class="$style.title">索引动态</h3>

    <div v-if="lastReindexResult" :class="$style.reindexResult">
      <AppIcon name="info-filled" :size="14" />
      <div :class="$style.reindexText">
        <div :class="$style.reindexTitle">上次批量索引</div>
        总计 {{ lastReindexResult.total }}，
        新建 {{ lastReindexResult.created }}，
        更新 {{ lastReindexResult.updated }}，
        跳过 {{ lastReindexResult.skipped }}，
        失败 {{ lastReindexResult.errors }}
      </div>
    </div>

    <div :class="$style.body">
      <div v-if="!status" :class="$style.hint">加载中...</div>

      <div v-else-if="status.unindexed === 0 && status.unindexedFlows === 0 && status.stale === 0" :class="$style.okState">
        <AppIcon name="check" :size="28" />
        <div :class="$style.okTitle">索引状态良好</div>
        <p :class="$style.okDesc">
          Editor {{ status.totalSchemas }} 个 Schema、Flow {{ status.totalFlows }} 个流程均已建立向量索引，共 {{ status.totalEmbeddings }} 条向量条目。
        </p>
      </div>

      <div v-else :class="$style.tips">
        <div v-if="!status.embeddingConfigured" :class="$style.tipItem">
          <AppIcon name="warning" :size="16" />
          <span>
            未配置 Embedding API（需 <code>OPENAI_API_KEY</code> 或 <code>EMBEDDING_API_KEY</code>），向量索引无法自动生成；检索将使用关键词模糊匹配。
          </span>
        </div>
        <div v-else-if="status.autoIndexEnabled" :class="$style.tipItem">
          <AppIcon name="info-filled" :size="16" />
          <span>
            Editor / Flow 数据在保存与服务启动时会自动建立索引，通常无需逐条手动操作。
          </span>
        </div>
        <div v-if="status.unindexed > 0" :class="$style.tipItem">
          <AppIcon name="warning" :size="16" />
          <span>
            有 <strong>{{ status.unindexed }}</strong> 个 Schema 尚未建立索引，可点击下方列表补建，或执行「重建索引」。
          </span>
        </div>
        <div v-if="status.unindexedFlows > 0" :class="$style.tipItem">
          <AppIcon name="warning" :size="16" />
          <span>
            有 <strong>{{ status.unindexedFlows }}</strong> 个流程尚未建立索引，保存流程图或服务重启后将自动补建。
          </span>
        </div>
        <div v-if="status.stale > 0" :class="$style.tipItem">
          <AppIcon name="refresh" :size="16" />
          <span>
            有 <strong>{{ status.stale }}</strong> 个索引已过期（Schema 更新后未同步），建议执行「重建索引」。
          </span>
        </div>
        <div :class="$style.tipMeta">
          当前向量条目：{{ status.totalEmbeddings }}
        </div>
      </div>

      <div v-if="!lastReindexResult" :class="$style.guide">
        点击顶栏「重建索引」可全量同步 Editor Schema 与 Flow 流程的向量嵌入。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { RagReindexResult, RagStatusData } from '@/api/aiApi'

defineProps<{
  status: RagStatusData | null
  lastReindexResult: RagReindexResult | null
}>()
</script>

<style module>
.container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px;
  flex-shrink: 0;
}

.reindexResult {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  margin-bottom: 12px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.reindexTitle {
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--el-text-color-primary);
}

.reindexText {
  flex: 1;
  min-width: 0;
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
  gap: 10px;
}

.tipItem {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.tipMeta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 0 4px;
}

.guide {
  margin-top: auto;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  line-height: 1.5;
  padding-top: 8px;
}
</style>
