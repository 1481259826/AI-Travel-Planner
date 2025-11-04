/**
 * API Key 可用性检查工具
 * 用于在使用服务前检查是否配置了相应的 API Key
 */

import type { ApiKeyService } from '@/types'

interface ApiKeyCheckResult {
  available: boolean
  source: 'system' | 'user' | 'none'
  message?: string
}

/**
 * 检查指定服务的 API Key 是否可用
 * @param userId 用户 ID（可选）
 * @param service 服务类型
 * @param token 用户认证 token（可选）
 * @returns API Key 可用性结果
 */
export async function checkApiKeyAvailable(
  service: ApiKeyService,
  userId?: string,
  token?: string
): Promise<ApiKeyCheckResult> {
  try {
    // 优先检查用户自定义 Key
    if (userId && token) {
      const userResponse = await fetch('/api/user/api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (userResponse.ok) {
        const { apiKeys } = await userResponse.json()
        const userKey = apiKeys.find(
          (key: any) => key.service === service && key.is_active
        )

        if (userKey) {
          return {
            available: true,
            source: 'user',
            message: `使用您的自定义 ${getServiceName(service)} Key`,
          }
        }
      }
    }

    // 检查系统默认 Key
    const systemResponse = await fetch('/api/user/api-keys/system', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })

    if (systemResponse.ok) {
      const { systemKeys } = await systemResponse.json()
      const systemKey = systemKeys.find((key: any) => key.service === service)

      if (systemKey) {
        return {
          available: true,
          source: 'system',
          message: `使用系统默认 ${getServiceName(service)} Key`,
        }
      }
    }

    // 都没有配置
    return {
      available: false,
      source: 'none',
      message: `未配置 ${getServiceName(service)} API Key`,
    }
  } catch (error) {
    console.error('Check API key error:', error)
    return {
      available: false,
      source: 'none',
      message: `检查 ${getServiceName(service)} API Key 失败`,
    }
  }
}

/**
 * 检查 DeepSeek Key 是否配置（必需）
 * @param userId 用户 ID
 * @param token 用户认证 token
 * @returns 是否可用
 */
export async function checkDeepSeekKeyRequired(
  userId?: string,
  token?: string
): Promise<{ available: boolean; message: string }> {
  const result = await checkApiKeyAvailable('deepseek', userId, token)

  if (!result.available) {
    return {
      available: false,
      message:
        'DeepSeek API Key 未配置！这是系统必需的服务，请在设置页面添加 DeepSeek API Key 后再创建行程。',
    }
  }

  return {
    available: true,
    message: result.message || '使用 DeepSeek API Key',
  }
}

/**
 * 检查地图 Key 是否配置（可选但建议）
 * @param userId 用户 ID
 * @param token 用户认证 token
 * @returns 是否可用及提示信息
 */
export async function checkMapKeyOptional(
  userId?: string,
  token?: string
): Promise<{ available: boolean; message: string }> {
  const result = await checkApiKeyAvailable('map', userId, token)

  if (!result.available) {
    return {
      available: false,
      message:
        '未配置地图 API Key，地图功能将不可用。您可以在设置页面添加高德地图 API Key 以使用地图功能。',
    }
  }

  return {
    available: true,
    message: result.message || '使用地图 API Key',
  }
}

/**
 * 检查语音 Key 是否配置（可选）
 * @param userId 用户 ID
 * @param token 用户认证 token
 * @returns 是否可用及提示信息
 */
export async function checkVoiceKeyOptional(
  userId?: string,
  token?: string
): Promise<{ available: boolean; message: string }> {
  const result = await checkApiKeyAvailable('voice', userId, token)

  if (!result.available) {
    return {
      available: false,
      message:
        '未配置语音识别 API Key，将使用浏览器原生语音识别（仅支持部分浏览器）。您可以在设置页面添加科大讯飞 API Key 以获得更好的语音识别效果。',
    }
  }

  return {
    available: true,
    message: result.message || '使用语音 API Key',
  }
}

/**
 * 检查 Unsplash Key 是否配置（可选）
 * @param userId 用户 ID
 * @param token 用户认证 token
 * @returns 是否可用及提示信息
 */
export async function checkUnsplashKeyOptional(
  userId?: string,
  token?: string
): Promise<{ available: boolean; message: string }> {
  const result = await checkApiKeyAvailable('unsplash', userId, token)

  if (!result.available) {
    return {
      available: false,
      message:
        '未配置 Unsplash API Key，将无法自动获取目的地图片。您可以在设置页面添加 Unsplash API Key 以获得更好的视觉体验。',
    }
  }

  return {
    available: true,
    message: result.message || '使用 Unsplash API Key',
  }
}

/**
 * 获取服务中文名称
 */
function getServiceName(service: ApiKeyService): string {
  const names: Record<ApiKeyService, string> = {
    anthropic: 'Anthropic Claude',
    deepseek: 'DeepSeek',
    modelscope: 'ModelScope',
    map: '高德地图',
    voice: '科大讯飞语音',
    unsplash: 'Unsplash 图片',
  }
  return names[service]
}
