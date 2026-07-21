/**
 * tenantApi + pluginApi unit tests
 *
 * 两者使用 platform-shared apiClient（axios 封装），mock apiClient 与 axios。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@schema-platform/platform-shared/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('axios', () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  return {
    default: mockAxios,
    ...mockAxios,
  }
})

import { apiClient } from '@schema-platform/platform-shared/utils/apiClient'
import axios from 'axios'
import { fetchTenants } from '@/api/tenantApi'
import {
  fetchPluginRegistry,
  updatePluginLocalConfig,
} from '@/api/pluginApi'

describe('tenantApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchTenants returns active tenants items', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [
        { id: 't1', name: 'Tenant 1', code: 't1', status: 'active' },
        { id: 't2', name: 'Tenant 2', code: 't2', status: 'active' },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    })

    const result = await fetchTenants()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('t1')
    expect(apiClient.get).toHaveBeenCalledWith('/tenants?status=active&pageSize=100')
  })
})

describe('pluginApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchPluginRegistry without tenantId uses apiClient', async () => {
    const snapshot = { experts: [], skills: [], tools: [], mcpServers: [] }
    vi.mocked(apiClient.get).mockResolvedValue(snapshot)

    const result = await fetchPluginRegistry()
    expect(result).toEqual(snapshot)
    expect(apiClient.get).toHaveBeenCalledWith('/ai/plugins')
  })

  it('fetchPluginRegistry with tenantId uses axios with X-Tenant-Id header', async () => {
    const snapshot = { experts: [{ id: 'e1', label: 'E1', tools: [], skills: [] }], skills: [], tools: [], mcpServers: [] }
    vi.mocked(axios.get).mockResolvedValue({ data: { success: true, data: snapshot } })

    const result = await fetchPluginRegistry('t1')
    expect(result).toEqual(snapshot)
    const [url, config] = vi.mocked(axios.get).mock.calls[0]!
    expect(url).toContain('/ai/plugins')
    expect((config as { headers: Record<string, string> }).headers['X-Tenant-Id']).toBe('t1')
  })

  it('updatePluginLocalConfig PUTs payload via apiClient', async () => {
    const writeResult = { path: '/local/experts/my-expert.yaml', reloaded: true }
    vi.mocked(apiClient.put).mockResolvedValue(writeResult)

    const result = await updatePluginLocalConfig('experts', 'my-expert', { name: 'test' })
    expect(result).toEqual(writeResult)
    expect(apiClient.put).toHaveBeenCalledWith('/ai/plugins/local/experts/my-expert', { name: 'test' })
  })
})
