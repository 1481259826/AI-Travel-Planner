/**
 * API: /api/trip-history/[id]
 * 行程生成历史记录详情/删除 API
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, noContentResponse, errorResponse } from '@/app/api/_utils/response'
import { TripHistoryService } from '@/lib/trip-history'
import { NotFoundError } from '@/lib/errors'

// ============================================================================
// GET 处理器
// ============================================================================

/**
 * GET /api/trip-history/[id]
 * 获取单条历史记录详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id } = await params

    if (!id) {
      return errorResponse('INVALID_REQUEST', '缺少记录 ID', 400)
    }

    const record = await TripHistoryService.getById(supabase, id, user.id)

    if (!record) {
      throw new NotFoundError('历史记录不存在')
    }

    return successResponse(record)
  } catch (error) {
    return handleApiError(error, 'GET /api/trip-history/[id]')
  }
}

// ============================================================================
// DELETE 处理器
// ============================================================================

/**
 * DELETE /api/trip-history/[id]
 * 删除历史记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id } = await params

    if (!id) {
      return errorResponse('INVALID_REQUEST', '缺少记录 ID', 400)
    }

    // 检查记录是否存在
    const record = await TripHistoryService.getById(supabase, id, user.id)
    if (!record) {
      throw new NotFoundError('历史记录不存在')
    }

    // 删除记录
    await TripHistoryService.delete(supabase, id, user.id)

    return noContentResponse()
  } catch (error) {
    return handleApiError(error, 'DELETE /api/trip-history/[id]')
  }
}
