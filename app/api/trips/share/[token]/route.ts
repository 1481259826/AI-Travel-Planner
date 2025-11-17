/**
 * API: /api/trips/share/[token]
 * 公开分享的行程查看
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { ValidationError, NotFoundError } from '@/lib/errors'

/**
 * GET /api/trips/share/[token]
 * 通过 token 获取公开的行程
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: shareToken } = await params

    if (!shareToken) {
      throw new ValidationError('缺少分享 token')
    }

    const supabase = createServiceClient()

    // 查询公开的行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        destination,
        origin,
        start_date,
        end_date,
        budget,
        travelers,
        preferences,
        itinerary,
        status,
        created_at,
        updated_at,
        share_token,
        is_public,
        profiles:user_id (
          name,
          email
        )
      `)
      .eq('share_token', shareToken)
      .eq('is_public', true)
      .single()

    if (tripError || !trip) {
      throw new NotFoundError('行程不存在或未公开分享')
    }

    // 获取该行程的费用记录（如果有）
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', trip.id)
      .order('date', { ascending: false })

    // 返回行程信息（脱敏处理用户邮箱）
    const profile = Array.isArray(trip.profiles) ? trip.profiles[0] : trip.profiles
    const response = {
      ...trip,
      profiles: profile
        ? {
            name: profile.name || '匿名用户',
            // 不返回邮箱以保护隐私
          }
        : null,
      expenses: expenses || [],
    }

    return successResponse({ trip: response })
  } catch (error) {
    return handleApiError(error, 'GET /api/trips/share/:token')
  }
}
