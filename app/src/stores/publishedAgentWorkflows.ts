import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listWorkflows } from '@/api/agentWorkflowApi'
import type { AgentWorkflowSummary } from '@/types/agentWorkflow'
import { useChatSettingsStore } from '@/stores/chatSettings'

export const usePublishedAgentWorkflowsStore = defineStore('publishedAgentWorkflows', () => {
  const workflows = ref<AgentWorkflowSummary[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  function isPublishedWorkflow(id: string | null | undefined): boolean {
    if (!id) return false
    return workflows.value.some((item) => item.id === id)
  }

  /** 清除 localStorage 中失效的编排 ID（未发布 / 已删除），回退 LangGraph 默认 */
  function sanitizeStoredWorkflowSelection(): boolean {
    const chatSettings = useChatSettingsStore()
    const currentId = chatSettings.chatSettings.agentWorkflowId
    if (!currentId || isPublishedWorkflow(currentId)) return false
    chatSettings.updateAgentWorkflowId(null)
    return true
  }

  async function loadPublishedWorkflows(force = false): Promise<void> {
    if (loaded.value && !force) {
      sanitizeStoredWorkflowSelection()
      return
    }
    loading.value = true
    try {
      const items = await listWorkflows()
      workflows.value = items.filter((item) => item.status === 'published')
      loaded.value = true
      sanitizeStoredWorkflowSelection()
    } finally {
      loading.value = false
    }
  }

  const workflowOptions = computed(() =>
    workflows.value.map((item) => ({
      value: item.id,
      label: item.name,
    })),
  )

  function getWorkflowName(id: string | null | undefined): string | null {
    if (!id) return null
    return workflows.value.find((item) => item.id === id)?.name ?? null
  }

  return {
    workflows,
    loading,
    loaded,
    workflowOptions,
    loadPublishedWorkflows,
    getWorkflowName,
    isPublishedWorkflow,
    sanitizeStoredWorkflowSelection,
  }
})
