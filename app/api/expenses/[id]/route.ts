/**
 * API: /api/expenses/[id]
 * 费用管理 - 单条记录更新和删除
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, noContentResponse } from '@/app/api/_utils/response'
import { updateExpenseSchema } from '@/app/api/_utils/validation'
import { NotFoundError, ForbiddenError } from '@/lib/errors'

/**
 * 验证费用记录所有权
 */
async function verifyExpenseOwnership(
  supabase: any,
  expenseId: string,
  userId: string
): Promise<void> {
  // 获取费用记录
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .select('trip_id')
    .eq('id', expenseId)
    .single()

  if (expenseError || !expense) {
    throw new NotFoundError('费用记录不存在')
  }

  // 验证行程所有权
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', expense.trip_id)
    .eq('user_id', userId)
    .single()

  if (tripError || !trip) {
    throw new ForbiddenError('无权操作此费用记录')
  }
}

/**
 * PUT /api/expenses/[id]
 * 更新费用记录
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: expenseId } = await params

    // 解析并验证请求体
    const body = await request.json()
    const validatedData = updateExpenseSchema.parse(body)

    // 验证所有权
    await verifyExpenseOwnership(supabase, expenseId, user.id)

    // 构建更新对象
    const updateData: any = {}
    if (validatedData.category) updateData.category = validatedData.category
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description
    if (validatedData.date) updateData.date = validatedData.date
    if (validatedData.currency) updateData.currency = validatedData.currency

    // 更新费用记录
    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return successResponse(updatedExpense, '费用记录更新成功')
  } catch (error) {
    return handleApiError(error, 'PUT /api/expenses/[id]')
  }
}

/**
 * DELETE /api/expenses/[id]
 * 删除费用记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: expenseId } = await params

    // 验证所有权
    await verifyExpenseOwnership(supabase, expenseId, user.id)

    // 删除费用记录
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      throw error
    }

    return noContentResponse()
  } catch (error) {
    return handleApiError(error, 'DELETE /api/expenses/[id]')
  }
}
