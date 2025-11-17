import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { encrypt } from '@/lib/encryption'
import { ValidationError } from '@/lib/errors'
import type { ApiKeyService } from '@/types'

interface ParsedKey {
  service: ApiKeyService
  key: string
  keyName: string
}

/**
 * 解析 .env.local 文件内容，提取 API Keys
 */
function parseEnvContent(content: string): ParsedKey[] {
  const keys: ParsedKey[] = []
  const lines = content.split('\n')

  const keyMapping: Record<string, { service: ApiKeyService; name: string }> = {
    'DEEPSEEK_API_KEY': { service: 'deepseek', name: 'DeepSeek (从 .env.local 导入)' },
    'MODELSCOPE_API_KEY': { service: 'modelscope', name: 'ModelScope (从 .env.local 导入)' },
    'NEXT_PUBLIC_MAP_API_KEY': { service: 'map', name: '高德地图 (从 .env.local 导入)' },
    'VOICE_API_KEY': { service: 'voice', name: '科大讯飞语音 (从 .env.local 导入)' },
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳过注释和空行
    if (!trimmed || trimmed.startsWith('#')) continue

    // 解析环境变量：KEY=value
    const match = trimmed.match(/^([A-Z_]+)=(.+)$/)
    if (!match) continue

    const [, envKey, envValue] = match
    const mapping = keyMapping[envKey]

    if (mapping && envValue && envValue !== 'your_' + envKey.toLowerCase()) {
      keys.push({
        service: mapping.service,
        key: envValue,
        keyName: mapping.name,
      })
    }
  }

  return keys
}

/**
 * POST /api/user/api-keys/import
 * 从 .env.local 文件内容批量导入 API Keys
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { envContent } = await request.json()

    if (!envContent || typeof envContent !== 'string') {
      throw new ValidationError('缺少 .env.local 文件内容')
    }

    // 解析环境变量文件
    const parsedKeys = parseEnvContent(envContent)

    if (parsedKeys.length === 0) {
      throw new ValidationError('未找到有效的 API Key')
    }

    // 批量导入
    const imported: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const { service, key, keyName } of parsedKeys) {
      try {
        // 检查是否已存在相同的 Key
        const { data: existing } = await supabase
          .from('api_keys')
          .select('id')
          .eq('user_id', user.id)
          .eq('service', service)
          .eq('key_name', keyName)
          .single()

        if (existing) {
          skipped.push(`${keyName} (已存在)`)
          continue
        }

        // 加密 API Key
        const encryptedKey = encrypt(key)
        const keyPrefix = key.substring(0, 12) + '...'

        // 插入数据库
        const { error: insertError } = await supabase
          .from('api_keys')
          .insert({
            user_id: user.id,
            service,
            key_name: keyName,
            encrypted_key: encryptedKey,
            key_prefix: keyPrefix,
            is_active: true,
          })

        if (insertError) {
          errors.push(`${keyName}: ${insertError.message}`)
        } else {
          imported.push(keyName)
        }
      } catch (error: any) {
        errors.push(`${keyName}: ${error.message}`)
      }
    }

    return successResponse({
      imported,
      skipped,
      errors,
      total: parsedKeys.length,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/user/api-keys/import')
  }
}
