<script setup lang="ts">
import { ref, watch, onBeforeUnmount, shallowRef } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { buildHeaders } from '@/api/aiApi'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import styles from './PdfPreviewCard.module.scss'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

const props = defineProps<{
  url: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.2)
const pdfDoc = shallowRef<pdfjsLib.PDFDocumentProxy | null>(null)

const SCALE_MIN = 0.5
const SCALE_MAX = 3.0
const SCALE_STEP = 0.2

async function loadDocument(): Promise<void> {
  loading.value = true
  error.value = null
  pdfDoc.value = null
  currentPage.value = 1
  scale.value = 1.2

  try {
    const loadingTask = pdfjsLib.getDocument({
      url: props.url,
      httpHeaders: buildHeaders(),
    })
    pdfDoc.value = await loadingTask.promise
    totalPages.value = pdfDoc.value.numPages
    await renderPage(1)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'PDF 加载失败'
  } finally {
    loading.value = false
  }
}

async function renderPage(pageNum: number): Promise<void> {
  if (!pdfDoc.value || !canvasRef.value) return

  loading.value = true
  error.value = null

  try {
    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: scale.value })
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')!

    // Support HiDPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = viewport.width * dpr
    canvas.height = viewport.height * dpr
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    context.scale(dpr, dpr)

    await page.render({ canvas, canvasContext: context, viewport }).promise
    currentPage.value = pageNum
  } catch (err) {
    error.value = err instanceof Error ? err.message : '页面渲染失败'
  } finally {
    loading.value = false
  }
}

function prevPage(): void {
  if (currentPage.value > 1) {
    renderPage(currentPage.value - 1)
  }
}

function nextPage(): void {
  if (currentPage.value < totalPages.value) {
    renderPage(currentPage.value + 1)
  }
}

function zoomIn(): void {
  if (scale.value < SCALE_MAX) {
    scale.value = Math.min(SCALE_MAX, +(scale.value + SCALE_STEP).toFixed(1))
    renderPage(currentPage.value)
  }
}

function zoomOut(): void {
  if (scale.value > SCALE_MIN) {
    scale.value = Math.max(SCALE_MIN, +(scale.value - SCALE_STEP).toFixed(1))
    renderPage(currentPage.value)
  }
}

function resetZoom(): void {
  scale.value = 1.2
  renderPage(currentPage.value)
}

watch(() => props.url, (url) => {
  if (url) {
    loadDocument()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  pdfDoc.value?.cleanup()
  pdfDoc.value = null
})
</script>

<template>
  <div :class="styles.container">
    <!-- Toolbar -->
    <div :class="styles.toolbar">
      <div :class="styles.pageNav">
        <button
          type="button"
          :class="styles.btn"
          :disabled="currentPage <= 1 || loading"
          @click="prevPage"
        >
          <AppIcon name="arrow-left" :size="14" />
        </button>
        <span :class="styles.pageInfo">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          type="button"
          :class="styles.btn"
          :disabled="currentPage >= totalPages || loading"
          @click="nextPage"
        >
          <AppIcon name="arrow-right" :size="14" />
        </button>
      </div>

      <div :class="styles.zoomControls">
        <button
          type="button"
          :class="styles.btn"
          :disabled="scale <= SCALE_MIN || loading"
          @click="zoomOut"
        >
          <AppIcon name="minus" :size="14" />
        </button>
        <button
          type="button"
          :class="[styles.btn, styles.zoomLabel]"
          :disabled="loading"
          @click="resetZoom"
        >
          {{ Math.round(scale * 100) }}%
        </button>
        <button
          type="button"
          :class="styles.btn"
          :disabled="scale >= SCALE_MAX || loading"
          @click="zoomIn"
        >
          <AppIcon name="plus" :size="14" />
        </button>
      </div>
    </div>

    <!-- Canvas viewport -->
    <div :class="styles.viewport">
      <div v-if="loading" :class="styles.loadingOverlay">
        <AppIcon name="loading" :size="24" :class="styles.spinner" />
      </div>
      <div v-if="error" :class="styles.errorOverlay">{{ error }}</div>
      <canvas ref="canvasRef" :class="styles.canvas" />
    </div>
  </div>
</template>
