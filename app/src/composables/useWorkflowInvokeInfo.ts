import { ref } from 'vue'
import { getWorkflow, rotateWorkflowInvokeKey } from '@/api/agentWorkflowApi'

export interface WorkflowInvokeInfo {
  invokePath: string | null
  invokeKeyMasked: string | null
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'

export function useWorkflowInvokeInfo() {
  const loading = ref(false)
  const invokeInfo = ref<WorkflowInvokeInfo | null>(null)
  const error = ref<string | null>(null)

  function buildInvokeUrl(invokePath: string | null): string | null {
    if (!invokePath) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}${API_BASE}${invokePath}`
  }

  async function loadInvokeInfo(workflowId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const detail = await getWorkflow(workflowId)
      invokeInfo.value = {
        invokePath: detail.invokePath ?? null,
        invokeKeyMasked: detail.invokeKeyMasked ?? null,
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载调用信息失败'
      invokeInfo.value = null
    } finally {
      loading.value = false
    }
  }

  async function rotateKey(workflowId: string): Promise<string | null> {
    loading.value = true
    error.value = null
    try {
      const result = await rotateWorkflowInvokeKey(workflowId)
      invokeInfo.value = {
        invokePath: result.invokePath ?? invokeInfo.value?.invokePath ?? null,
        invokeKeyMasked: result.invokeKeyMasked ?? null,
      }
      return result.invokeKey ?? null
    } catch (e) {
      error.value = e instanceof Error ? e.message : '轮换密钥失败'
      return null
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    invokeInfo.value = null
    error.value = null
  }

  return {
    loading,
    invokeInfo,
    error,
    buildInvokeUrl,
    loadInvokeInfo,
    rotateKey,
    reset,
  }
}
