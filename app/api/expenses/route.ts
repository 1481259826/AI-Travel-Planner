/**
 * API: /api/expenses
 * 费用管理 - 列表查询和创建
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, createdResponse } from '@/app/api/_utils/response'
import { createExpenseSchema } from '@/app/api/_utils/validation'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { z } from 'zod'

/**
 * 验证行程所有权的辅助函数
 */
async function verifyTripOwnership(
  supabase: any,
  tripId: string,
  userId: string
): Promise<void> {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', userId)
    .single()

  if (error || !trip) {
    throw new NotFoundError('行程不存在或无权访问')
  }
}

/**
 * GET /api/expenses?trip_id=xxx
 * 获取费用列表
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('trip_id')

    if (!tripId) {
      throw new ValidationError('缺少 trip_id 参数')
    }

    // 验证行程所有权
    await verifyTripOwnership(supabase, tripId, user.id)

    // 获取费用列表
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('date', { ascending: false })

    if (error) {
      throw error
    }

    return successResponse({ expenses: expenses || [] })
  } catch (error) {
    return handleApiError(error, 'GET /api/expenses')
  }
}

/**
 * POST /api/expenses
 * 创建费用记录
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 解析并验证请求体
    const body = await request.json()
    const validatedData = createExpenseSchema.parse(body)

    // 验证行程所有权
    await verifyTripOwnership(supabase, validatedData.tripId, user.id)

    // 创建费用记录
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: validatedData.tripId,
        category: validatedData.category,
        amount: validatedData.amount,
        currency: validatedData.currency,
        description: validatedData.description || null,
        date: validatedData.date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return createdResponse(expense, '费用记录创建成功')
  } catch (error) {
    return handleApiError(error, 'POST /api/expenses')
  }
}
