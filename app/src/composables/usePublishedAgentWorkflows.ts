import { storeToRefs } from 'pinia'
import { usePublishedAgentWorkflowsStore } from '@/stores/publishedAgentWorkflows'

export function usePublishedAgentWorkflows() {
  const store = usePublishedAgentWorkflowsStore()
  const { workflows, loading, loaded, workflowOptions } = storeToRefs(store)

  return {
    workflows,
    loading,
    loaded,
    workflowOptions,
    loadPublishedWorkflows: store.loadPublishedWorkflows,
    getWorkflowName: store.getWorkflowName,
    isPublishedWorkflow: store.isPublishedWorkflow,
    sanitizeStoredWorkflowSelection: store.sanitizeStoredWorkflowSelection,
  }
}
