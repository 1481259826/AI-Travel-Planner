import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { decrypt } from '@/lib/encryption'
import { testDeepSeekKey, testModelScopeKey, testMapKey, testVoiceKey } from '@/lib/api-keys'
import { ValidationError, NotFoundError, EncryptionError } from '@/lib/errors'
import type { ApiKeyService } from '@/types'

/**
 * POST /api/user/api-keys/test
 * 测试 API Key 是否有效
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { keyId } = await request.json()

    if (!keyId) {
      throw new ValidationError('缺少 keyId')
    }

    // 查询 API Key（确保是用户自己的）
    const { data: apiKey, error: queryError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .single()

    if (queryError || !apiKey) {
      throw new NotFoundError('API Key 不存在')
    }

    // 解密 API Key
    let decryptedKey: string
    try {
      decryptedKey = decrypt(apiKey.encrypted_key)
    } catch (error) {
      throw new EncryptionError('密钥解密失败')
    }

    // 根据服务类型测试
    let isValid = false
    let errorMessage = ''

    try {
      switch (apiKey.service as ApiKeyService) {
        case 'deepseek':
          isValid = await testDeepSeekKey(decryptedKey)
          errorMessage = isValid ? '' : 'DeepSeek API Key 无效或无权限'
          break
        case 'modelscope':
          isValid = await testModelScopeKey(decryptedKey)
          errorMessage = isValid ? '' : 'ModelScope API Key 无效或无权限'
          break
        case 'map':
          isValid = await testMapKey(decryptedKey)
          errorMessage = isValid ? '' : '高德地图 API Key 无效或无权限'
          break
        case 'voice':
          isValid = await testVoiceKey(decryptedKey)
          errorMessage = isValid ? '' : '科大讯飞语音 API Key 格式无效'
          break
        default:
          throw new ValidationError('不支持的服务类型')
      }

      // 更新 last_used_at
      if (isValid) {
        await supabase
          .from('api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', keyId)
      }

      return successResponse({
        valid: isValid,
        message: isValid ? 'API Key 有效' : errorMessage
      })
    } catch (error: any) {
      // 测试过程中的错误也返回结构化响应
      return successResponse({
        valid: false,
        message: error.message || '测试失败，请稍后重试'
      })
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/user/api-keys/test')
  }
}
