import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import type { ApiKeyService } from '@/types'

interface SystemApiKey {
  service: ApiKeyService
  key_name: string
  key_prefix: string
  is_active: boolean
  is_system: true
}

/**
 * GET /api/user/api-keys/system
 * 获取系统默认配置的 API Keys
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    await requireAuth(request)

    const systemKeys: SystemApiKey[] = []

    // 检查 DeepSeek API Key
    if (process.env.DEEPSEEK_API_KEY) {
      const key = process.env.DEEPSEEK_API_KEY
      systemKeys.push({
        service: 'deepseek',
        key_name: '系统默认 (DeepSeek)',
        key_prefix: key.substring(0, 12) + '...',
        is_active: true,
        is_system: true,
      })
    }

    // 检查 ModelScope API Key
    if (process.env.MODELSCOPE_API_KEY) {
      const key = process.env.MODELSCOPE_API_KEY
      systemKeys.push({
        service: 'modelscope',
        key_name: '系统默认 (ModelScope)',
        key_prefix: key.substring(0, 12) + '...',
        is_active: true,
        is_system: true,
      })
    }

    // 检查高德地图前端 API Key
    if (process.env.NEXT_PUBLIC_MAP_API_KEY) {
      const key = process.env.NEXT_PUBLIC_MAP_API_KEY
      systemKeys.push({
        service: 'map',
        key_name: '系统默认 (前端 JS API)',
        key_prefix: key.substring(0, 12) + '...',
        is_active: true,
        is_system: true,
      })
    }

    // 检查高德地图后端 Web 服务 API Key
    if (process.env.AMAP_WEB_SERVICE_KEY) {
      const key = process.env.AMAP_WEB_SERVICE_KEY
      systemKeys.push({
        service: 'map',
        key_name: '系统默认 (后端 Web 服务)',
        key_prefix: key.substring(0, 12) + '...',
        is_active: true,
        is_system: true,
      })
    }

    // 检查科大讯飞语音 API Key
    if (process.env.VOICE_API_KEY) {
      const key = process.env.VOICE_API_KEY
      systemKeys.push({
        service: 'voice',
        key_name: '系统默认 (科大讯飞)',
        key_prefix: key.substring(0, 12) + '...',
        is_active: true,
        is_system: true,
      })
    }

    return successResponse({ systemKeys })
  } catch (error) {
    return handleApiError(error, 'GET /api/user/api-keys/system')
  }
}
