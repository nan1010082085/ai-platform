<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import * as XLSX from 'xlsx'
import { fetchRaw } from '@/api/aiApi'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import styles from './ExcelPreviewCard.module.scss'

const props = defineProps<{
  url: string
  filename?: string
}>()

const loading = ref(true)
const error = ref<string | null>(null)
const sheetNames = ref<string[]>([])
const activeSheet = ref('')
const headers = ref<string[]>([])
const rows = ref<string[][]>([])
const totalRows = ref(0)

const MAX_PREVIEW_ROWS = 100

let workbook: XLSX.WorkBook | null = null

async function loadDocument(): Promise<void> {
  loading.value = true
  error.value = null
  workbook = null
  sheetNames.value = []
  activeSheet.value = ''
  headers.value = []
  rows.value = []
  totalRows.value = 0

  try {
    const resp = await fetchRaw(props.url)
    if (!resp.ok) {
      throw new Error(`加载失败: ${resp.status}`)
    }
    const buffer = await resp.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array' })

    sheetNames.value = workbook.SheetNames
    if (sheetNames.value.length > 0) {
      activeSheet.value = sheetNames.value[0]
      renderSheet(activeSheet.value)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Excel 加载失败'
  } finally {
    loading.value = false
  }
}

function renderSheet(sheetName: string): void {
  if (!workbook) return
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return

  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
  totalRows.value = data.length

  if (data.length === 0) {
    headers.value = []
    rows.value = []
    return
  }

  headers.value = data[0].map(String)
  rows.value = data.slice(1, MAX_PREVIEW_ROWS + 1).map(row =>
    row.map(cell => String(cell ?? ''))
  )
}

function switchSheet(name: string): void {
  activeSheet.value = name
  renderSheet(name)
}

watch(() => props.url, (url) => {
  if (url) {
    loadDocument()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  workbook = null
})
</script>

<template>
  <div :class="styles.container">
    <!-- Toolbar: sheet tabs -->
    <div v-if="sheetNames.length > 0" :class="styles.toolbar">
      <div :class="styles.sheetTabs">
        <button
          v-for="name in sheetNames"
          :key="name"
          type="button"
          :class="[styles.tab, activeSheet === name && styles.tabActive]"
          @click="switchSheet(name)"
        >
          {{ name }}
        </button>
      </div>
      <div :class="styles.info">
        {{ totalRows }} 行
        <span v-if="totalRows > MAX_PREVIEW_ROWS">（显示前 {{ MAX_PREVIEW_ROWS }} 行）</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" :class="styles.loading">
      <AppIcon name="loading" :size="24" :class="styles.spinner" />
      <span>加载中...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" :class="styles.error">{{ error }}</div>

    <!-- Table -->
    <div v-else-if="headers.length > 0" :class="styles.tableWrapper">
      <table :class="styles.table">
        <thead>
          <tr>
            <th :class="styles.rowNum">#</th>
            <th v-for="(h, i) in headers" :key="i" :class="styles.th">
              {{ h || `列${i + 1}` }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in rows" :key="ri">
            <td :class="styles.rowNum">{{ ri + 1 }}</td>
            <td v-for="(cell, ci) in row" :key="ci" :class="styles.td">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty -->
    <div v-else :class="styles.empty">无数据</div>
  </div>
</template>
