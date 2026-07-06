import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listWorkflows } from '@/api/agentWorkflowApi'
import type { AgentWorkflowSummary } from '@/types/agentWorkflow'

export const usePublishedAgentWorkflowsStore = defineStore('publishedAgentWorkflows', () => {
  const workflows = ref<AgentWorkflowSummary[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function loadPublishedWorkflows(force = false): Promise<void> {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const items = await listWorkflows()
      workflows.value = items.filter((item) => item.status === 'published')
      loaded.value = true
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

  function isPublishedWorkflow(id: string | null | undefined): boolean {
    if (!id) return false
    return workflows.value.some((item) => item.id === id)
  }

  return {
    workflows,
    loading,
    loaded,
    workflowOptions,
    loadPublishedWorkflows,
    getWorkflowName,
    isPublishedWorkflow,
  }
})
