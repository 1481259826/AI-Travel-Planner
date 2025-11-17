/**
 * API: /api/trips/[id]/share
 * 行程分享管理
 */

import { NextRequest } from 'next/server'
import { requireAuth, requireOwnership, createServiceClient } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { generateShareToken } from '@/lib/share'
import { ValidationError, NotFoundError } from '@/lib/errors'

/**
 * 获取行程并验证所有权
 */
async function getAndVerifyTrip(tripId: string, userId: string) {
  const supabase = createServiceClient()

  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, user_id, share_token')
    .eq('id', tripId)
    .single()

  if (error || !trip) {
    throw new NotFoundError('行程不存在')
  }

  requireOwnership(userId, trip.user_id)
  return trip
}

/**
 * POST /api/trips/[id]/share
 * 生成或更新分享链接
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth(request)
    const { id: tripId } = await params

    // 获取请求数据
    const body = await request.json()
    const { is_public } = body

    if (typeof is_public !== 'boolean') {
      throw new ValidationError('is_public 必须是布尔值')
    }

    // 验证用户是否拥有该行程
    const trip = await getAndVerifyTrip(tripId, user.id)

    // 生成新的 token（如果还没有）或使用现有的
    const shareToken = trip.share_token || generateShareToken()

    // 更新行程
    const supabase = createServiceClient()
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        share_token: shareToken,
        is_public: is_public,
      })
      .eq('id', tripId)

    if (updateError) {
      throw updateError
    }

    // 构造分享 URL
    const baseUrl = request.headers.get('origin') || ''
    const shareUrl = `${baseUrl}/share/${shareToken}`

    return successResponse({
      share_token: shareToken,
      share_url: shareUrl,
      is_public: is_public,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/trips/:id/share')
  }
}

/**
 * DELETE /api/trips/[id]/share
 * 取消分享
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth(request)
    const { id: tripId } = await params

    // 验证用户是否拥有该行程
    await getAndVerifyTrip(tripId, user.id)

    // 取消分享：设置为私密，但保留 token
    const supabase = createServiceClient()
    const { error: updateError } = await supabase
      .from('trips')
      .update({ is_public: false })
      .eq('id', tripId)

    if (updateError) {
      throw updateError
    }

    return successResponse({ message: '已取消分享' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/trips/:id/share')
  }
}
