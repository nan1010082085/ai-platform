/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePublishedAgentWorkflowsStore } from '@/stores/publishedAgentWorkflows'
import { useChatSettingsStore } from '@/stores/chatSettings'

vi.mock('@/api/agentWorkflowApi', () => ({
  listWorkflows: vi.fn(),
}))

import { listWorkflows } from '@/api/agentWorkflowApi'

const mockListWorkflows = vi.mocked(listWorkflows)

describe('publishedAgentWorkflows sanitize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('clears stale agentWorkflowId after loading published list', async () => {
    const chatSettings = useChatSettingsStore()
    chatSettings.updateAgentWorkflowId('deleted-workflow-id')

    mockListWorkflows.mockResolvedValue([
      {
        id: 'wf-published',
        name: 'Published WF',
        status: 'published',
        version: '1',
        updatedAt: '2026-07-13T08:00:00Z',
      },
    ])

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()

    expect(chatSettings.chatSettings.agentWorkflowId).toBeNull()
    expect(store.isPublishedWorkflow('wf-published')).toBe(true)
  })

  it('keeps valid published workflow id', async () => {
    const chatSettings = useChatSettingsStore()
    chatSettings.updateAgentWorkflowId('wf-published')

    mockListWorkflows.mockResolvedValue([
      {
        id: 'wf-published',
        name: 'Published WF',
        status: 'published',
        version: '1',
        updatedAt: '2026-07-13T08:00:00Z',
      },
    ])

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()

    expect(chatSettings.chatSettings.agentWorkflowId).toBe('wf-published')
  })
})
