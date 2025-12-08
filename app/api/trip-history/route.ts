/**
 * API: /api/trip-history
 * 行程生成历史记录列表 API
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { paginatedResponse } from '@/app/api/_utils/response'
import { TripHistoryService, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/trip-history'
import type { HistoryFilters, HistoryStatus } from '@/lib/trip-history'

// ============================================================================
// GET 处理器
// ============================================================================

/**
 * GET /api/trip-history
 * 获取用户的行程生成历史记录列表
 *
 * Query Parameters:
 * - page: 页码（默认1）
 * - page_size: 每页数量（默认20，最大100）
 * - status: 状态筛选（pending/generating/completed/failed/all）
 * - destination: 目的地搜索
 * - date_from: 日期范围开始
 * - date_to: 日期范围结束
 * - sort_by: 排序字段（createdAt/destination/status）
 * - sort_order: 排序方向（asc/desc）
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 解析查询参数
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('page_size') || String(DEFAULT_PAGE_SIZE)))
    )

    // 构建筛选条件
    const filters: HistoryFilters = {}

    const status = searchParams.get('status')
    if (status && ['pending', 'generating', 'completed', 'failed', 'all'].includes(status)) {
      filters.status = status as HistoryStatus | 'all'
    }

    const destination = searchParams.get('destination')
    if (destination) {
      filters.destination = destination
    }

    const dateFrom = searchParams.get('date_from')
    if (dateFrom) {
      filters.dateFrom = dateFrom
    }

    const dateTo = searchParams.get('date_to')
    if (dateTo) {
      filters.dateTo = dateTo
    }

    // 排序参数
    const sortBy = searchParams.get('sort_by') as 'createdAt' | 'destination' | 'status' | null
    const sortOrder = searchParams.get('sort_order') as 'asc' | 'desc' | null

    // 获取列表
    const result = await TripHistoryService.list(supabase, user.id, {
      page,
      pageSize,
      filters,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    })

    return paginatedResponse(
      result.records,
      result.page,
      result.pageSize,
      result.total
    )
  } catch (error) {
    return handleApiError(error, 'GET /api/trip-history')
  }
}
