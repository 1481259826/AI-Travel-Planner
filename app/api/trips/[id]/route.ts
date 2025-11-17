/**
 * API: /api/trips/:id
 * 行程详情的增删改查操作
 */

import { NextRequest } from 'next/server'
import { requireAuth, requireOwnership } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, noContentResponse } from '@/app/api/_utils/response'
import { NotFoundError } from '@/lib/errors'

/**
 * GET /api/trips/:id
 * 获取行程详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: tripId } = await params

    // 查询行程
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single()

    if (error || !trip) {
      throw new NotFoundError('行程不存在')
    }

    // 验证资源所有权
    requireOwnership(user.id, trip.user_id)

    return successResponse(trip)
  } catch (error) {
    return handleApiError(error, 'GET /api/trips/:id')
  }
}

/**
 * PUT /api/trips/:id
 * 更新行程信息（主要用于编辑行程内容）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: tripId } = await params

    // 解析请求体
    const body = await request.json()
    const { itinerary } = body

    if (!itinerary) {
      throw new NotFoundError('缺少行程数据')
    }

    // 验证用户是否拥有这个行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      throw new NotFoundError('行程不存在')
    }

    requireOwnership(user.id, trip.user_id)

    // 更新行程数据
    const { data, error: updateError } = await supabase
      .from('trips')
      .update({
        itinerary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return successResponse(data, '行程更新成功')
  } catch (error) {
    return handleApiError(error, 'PUT /api/trips/:id')
  }
}

/**
 * DELETE /api/trips/:id
 * 删除行程
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: tripId } = await params

    // 验证用户是否拥有这个行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      throw new NotFoundError('行程不存在')
    }

    requireOwnership(user.id, trip.user_id)

    // 删除行程
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)

    if (deleteError) {
      throw deleteError
    }

    return noContentResponse()
  } catch (error) {
    return handleApiError(error, 'DELETE /api/trips/:id')
  }
}
