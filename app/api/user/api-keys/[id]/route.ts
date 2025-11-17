/**
 * API: /api/user/api-keys/[id]
 * 单个 API Key 的操作
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, noContentResponse } from '@/app/api/_utils/response'
import { ValidationError, NotFoundError } from '@/lib/errors'

/**
 * PUT /api/user/api-keys/[id]
 * 更新 API Key（主要用于切换激活状态）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id } = await params
    const { is_active } = await request.json()

    // 验证输入
    if (typeof is_active !== 'boolean') {
      throw new ValidationError('is_active 必须是布尔值')
    }

    // 更新（只允许更新自己的 key）
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({ is_active })
      .eq('id', id)
      .eq('user_id', user.id) // 确保只能更新自己的 key
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    if (!updatedKey) {
      throw new NotFoundError('API Key 不存在')
    }

    return successResponse({ apiKey: updatedKey }, '更新成功')
  } catch (error) {
    return handleApiError(error, 'PUT /api/user/api-keys/:id')
  }
}

/**
 * DELETE /api/user/api-keys/[id]
 * 删除 API Key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id } = await params

    // 删除（只允许删除自己的 key）
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // 确保只能删除自己的 key

    if (deleteError) {
      throw deleteError
    }

    return noContentResponse()
  } catch (error) {
    return handleApiError(error, 'DELETE /api/user/api-keys/:id')
  }
}
