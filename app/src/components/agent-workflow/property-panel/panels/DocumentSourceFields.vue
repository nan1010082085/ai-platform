<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import FieldRow from '../FieldRow.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const headersText = ref('')
const headersError = ref('')

const source = computed(() => String(props.node.data?.documentSource ?? 'stream'))
const responseMode = computed(() => String(props.node.data?.fetchResponseMode ?? 'json-base64'))

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

watch(
  () => props.node.data?.fetchHeaders,
  (val) => {
    headersText.value = val == null ? '{}' : JSON.stringify(val, null, 2)
    headersError.value = ''
  },
  { immediate: true },
)

function onHeadersBlur() {
  const text = headersText.value.trim()
  if (!text || text === '{}') {
    update('fetchHeaders', undefined)
    headersError.value = ''
    return
  }
  try {
    update('fetchHeaders', JSON.parse(text) as Record<string, string>)
    headersError.value = ''
  } catch {
    headersError.value = 'JSON 格式无效'
  }
}
</script>

<template>
  <FieldRow label="来源">
    <el-select
      :model-value="source"
      @update:model-value="update('documentSource', $event)"
    >
      <el-option label="上传流（推荐）" value="stream" />
      <el-option label="查询接口" value="api" />
      <el-option label="平台文档 ID（字段）" value="inputField" />
      <el-option label="平台文档 ID（固定）" value="documentId" />
    </el-select>
  </FieldRow>

  <template v-if="source === 'stream'">
    <FieldRow
      label="文件字段"
      hint="默认 $input.file：base64 或 Chat 附件 documentId 引用"
    >
      <el-input
        :model-value="String(props.node.data?.streamField ?? 'file')"
        placeholder="file"
        @update:model-value="update('streamField', $event)"
      />
    </FieldRow>
  </template>

  <template v-else-if="source === 'api'">
    <FieldRow label="请求 URL" hint="支持 {{$input.xxx}}，如 https://api.example.com/files/{{$input.fileId}}">
      <el-input
        :model-value="String(props.node.data?.fetchUrl ?? '')"
        placeholder="https://api.example.com/files/{{$input.fileId}}"
        @update:model-value="update('fetchUrl', $event)"
      />
    </FieldRow>
    <FieldRow label="请求方法">
      <el-select
        :model-value="String(props.node.data?.fetchMethod ?? 'GET')"
        @update:model-value="update('fetchMethod', $event)"
      >
        <el-option label="GET" value="GET" />
        <el-option label="POST" value="POST" />
      </el-select>
    </FieldRow>
    <FieldRow label="请求头" textarea hint='JSON，如 {"Authorization":"Bearer {{$input.token}}"}'>
      <el-input
        v-model="headersText"
        type="textarea"
        :rows="3"
        placeholder="{}"
        @blur="onHeadersBlur"
      />
      <div v-if="headersError" style="color: var(--el-color-danger); font-size: 12px; margin-top: 4px;">
        {{ headersError }}
      </div>
    </FieldRow>
    <FieldRow
      v-if="(props.node.data?.fetchMethod ?? 'GET') === 'POST'"
      label="请求体"
      textarea
      hint="POST 时 JSON 模板，支持 {{$input.xxx}}"
    >
      <el-input
        type="textarea"
        :rows="4"
        :model-value="String(props.node.data?.fetchBody ?? '')"
        placeholder='{"fileId":"{{$input.fileId}}"}'
        @update:model-value="update('fetchBody', $event)"
      />
    </FieldRow>
    <FieldRow label="响应类型">
      <el-select
        :model-value="responseMode"
        @update:model-value="update('fetchResponseMode', $event)"
      >
        <el-option label="JSON 内 base64 字段" value="json-base64" />
        <el-option label="JSON 内下载 URL" value="json-url" />
        <el-option label="响应体即文件" value="binary" />
      </el-select>
    </FieldRow>
    <FieldRow
      v-if="responseMode !== 'binary'"
      label="内容字段路径"
      hint="JSON 路径，默认 content；下载 URL 模式填 url 字段路径"
    >
      <el-input
        :model-value="String(props.node.data?.fetchContentPath ?? 'content')"
        placeholder="data.content"
        @update:model-value="update('fetchContentPath', $event)"
      />
    </FieldRow>
    <FieldRow
      v-if="responseMode !== 'binary'"
      label="文件名字段"
      hint="JSON 路径，如 data.filename"
    >
      <el-input
        :model-value="String(props.node.data?.fetchFilenamePath ?? '')"
        placeholder="filename"
        @update:model-value="update('fetchFilenamePath', $event)"
      />
    </FieldRow>
    <FieldRow
      label="默认文件名"
      hint="响应未带文件名时使用"
    >
      <el-input
        :model-value="String(props.node.data?.fetchFilename ?? '')"
        placeholder="report.pdf"
        @update:model-value="update('fetchFilename', $event)"
      />
    </FieldRow>
    <FieldRow
      v-if="responseMode !== 'binary'"
      label="MIME 字段"
      hint="JSON 路径，如 data.mimetype"
    >
      <el-input
        :model-value="String(props.node.data?.fetchMimetypePath ?? '')"
        placeholder="mimetype"
        @update:model-value="update('fetchMimetypePath', $event)"
      />
    </FieldRow>
    <FieldRow label="默认 MIME" hint="响应未带 MIME 时使用">
      <el-input
        :model-value="String(props.node.data?.fetchMimetype ?? '')"
        placeholder="application/pdf"
        @update:model-value="update('fetchMimetype', $event)"
      />
    </FieldRow>
  </template>

  <template v-else-if="source === 'documentId'">
    <FieldRow label="文档 ID" hint="平台已上传文档；支持 {{$input.documentId}}">
      <el-input
        :model-value="String(props.node.data?.documentId ?? '')"
        placeholder="{{$input.documentId}}"
        @update:model-value="update('documentId', $event)"
      />
    </FieldRow>
  </template>

  <template v-else>
    <FieldRow label="输入字段" hint="从 $input / 上游读取平台 documentId">
      <el-input
        :model-value="String(props.node.data?.inputField ?? 'documentId')"
        placeholder="documentId"
        @update:model-value="update('inputField', $event)"
      />
    </FieldRow>
  </template>
</template>
