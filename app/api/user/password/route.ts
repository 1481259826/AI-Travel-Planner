/**
 * API: /api/user/password
 * 用户密码修改
 */

import { NextRequest } from 'next/server'
import { requireAuth, createServiceClient } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { changePasswordSchema } from '@/app/api/_utils/validation'
import { isPasswordValid } from '@/lib/utils/password'
import { ValidationError } from '@/lib/errors'

/**
 * 验证当前密码
 */
async function verifyCurrentPassword(
  supabase: any,
  email: string,
  currentPassword: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })

  if (error) {
    throw new ValidationError('当前密码不正确')
  }
}

/**
 * 更新用户密码（使用 Admin API）
 */
async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const adminClient = createServiceClient()

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    throw error
  }
}

/**
 * POST /api/user/password
 * 修改用户密码
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 解析并验证请求体
    const body = await request.json()
    const validatedData = changePasswordSchema.parse(body)

    const { current_password, new_password, confirm_password } = validatedData

    // 验证新密码和确认密码是否一致
    if (new_password !== confirm_password) {
      throw new ValidationError('两次输入的密码不一致')
    }

    // 验证新密码强度
    if (!isPasswordValid(new_password)) {
      throw new ValidationError('密码强度不足，请满足所有要求')
    }

    // 验证当前密码
    await verifyCurrentPassword(supabase, user.email!, current_password)

    // 更新密码
    await updateUserPassword(user.id, new_password)

    return successResponse(
      { success: true },
      '密码修改成功！请使用新密码重新登录'
    )
  } catch (error) {
    return handleApiError(error, 'POST /api/user/password')
  }
}
