/**
 * API: /api/user/profile
 * 用户资料管理
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import type { ProfileUpdateData } from '@/types'
import { logger } from '@/lib/utils/logger'

/**
 * 确保 profile 存在，不存在则自动创建
 */
async function ensureProfile(supabase: any, user: any) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Profile 不存在，自动创建
  if (profileError && profileError.code === 'PGRST116') {
    logger.info('自动创建用户 profile', { userId: user.id })

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        theme: 'system',
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return newProfile
  }

  if (profileError) {
    throw profileError
  }

  return profile
}

/**
 * GET /api/user/profile
 * 获取当前用户的配置信息
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 获取或创建 profile
    const profile = await ensureProfile(supabase, user)

    return successResponse({ profile })
  } catch (error) {
    return handleApiError(error, 'GET /api/user/profile')
  }
}

/**
 * PUT /api/user/profile
 * 更新用户配置信息
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 解析请求体
    const updateData: ProfileUpdateData = await request.json()

    // 构建更新对象（只更新提供的字段）
    const updates: any = {}
    if (updateData.name !== undefined) updates.name = updateData.name
    if (updateData.avatar_url !== undefined) updates.avatar_url = updateData.avatar_url
    if (updateData.theme !== undefined) updates.theme = updateData.theme
    if (updateData.default_model !== undefined)
      updates.default_model = updateData.default_model
    if (updateData.default_budget !== undefined)
      updates.default_budget = updateData.default_budget
    if (updateData.default_origin !== undefined)
      updates.default_origin = updateData.default_origin

    // 更新 profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    logger.info('用户 profile 更新成功', { userId: user.id })

    return successResponse({ profile }, '配置更新成功')
  } catch (error) {
    return handleApiError(error, 'PUT /api/user/profile')
  }
}
