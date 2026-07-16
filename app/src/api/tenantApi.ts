/**
 * 租户 API 客户端
 */

import { apiClient } from '@schema-platform/platform-shared/utils/apiClient'

export interface TenantInfo {
  id: string
  name: string
  code: string
  status: 'active' | 'inactive' | 'suspended'
}

interface TenantListResponse {
  items: TenantInfo[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function fetchTenants(): Promise<TenantInfo[]> {
  const res = await apiClient.get<TenantListResponse>('/tenants?status=active&pageSize=100')
  return res.items
}
