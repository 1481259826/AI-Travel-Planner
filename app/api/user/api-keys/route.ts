/**
 * API: /api/user/api-keys
 * 用户 API Keys 管理
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { encrypt, getKeyPrefix } from '@/lib/encryption'
import type { ApiKeyService } from '@/types'
import { ValidationError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/user/api-keys
 * 获取用户的所有 API Keys
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 查询用户的 API Keys
    const { data: apiKeys, error: queryError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      throw queryError
    }

    return successResponse({ apiKeys: apiKeys || [] })
  } catch (error) {
    return handleApiError(error, 'GET /api/user/api-keys')
  }
}

/**
 * POST /api/user/api-keys
 * 创建新的 API Key
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { service, key_name, api_key, base_url, extra_config } = await request.json()

    // 验证输入
    if (!service || !key_name || !api_key) {
      throw new ValidationError('请填写所有必填字段：service, key_name, api_key')
    }

    // 验证 service 类型
    const validServices: ApiKeyService[] = ['deepseek', 'modelscope', 'map', 'voice']
    if (!validServices.includes(service)) {
      throw new ValidationError('无效的服务类型')
    }

    // 验证 extra_config 格式（如果提供）
    if (extra_config) {
      try {
        JSON.parse(extra_config)
      } catch {
        throw new ValidationError('extra_config 必须是有效的 JSON 字符串')
      }
    }

    // 加密 API Key
    let encryptedKey: string
    let keyPrefix: string

    try {
      encryptedKey = encrypt(api_key)
      keyPrefix = getKeyPrefix(api_key, 8)
    } catch (encryptError) {
      logger.error('API Key 加密失败', { error: encryptError })
      throw new Error('加密失败，请检查 ENCRYPTION_KEY 环境变量')
    }

    // 准备插入数据
    const insertData: any = {
      user_id: user.id,
      service,
      key_name,
      encrypted_key: encryptedKey,
      key_prefix: keyPrefix,
      is_active: true,
    }

    // 添加可选字段
    if (base_url && base_url.trim()) {
      insertData.base_url = base_url.trim()
    }

    if (extra_config && extra_config.trim()) {
      insertData.extra_config = extra_config.trim()
    }

    // 插入数据库
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    logger.info('API Key 创建成功', { userId: user.id, service })

    return successResponse({ apiKey: newKey }, 'API Key 添加成功')
  } catch (error) {
    return handleApiError(error, 'POST /api/user/api-keys')
  }
}
