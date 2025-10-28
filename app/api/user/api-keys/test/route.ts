import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { testAnthropicKey, testDeepSeekKey, testMapKey } from '@/lib/api-keys'
import type { ApiKeyService } from '@/types'

/**
 * POST /api/user/api-keys/test
 * 测试 API Key 是否有效
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authorization.replace('Bearer ', '')

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyId } = await request.json()

    if (!keyId) {
      return NextResponse.json({ error: '缺少 keyId' }, { status: 400 })
    }

    // 查询 API Key（确保是用户自己的）
    const { data: apiKey, error: queryError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .single()

    if (queryError || !apiKey) {
      return NextResponse.json({ error: 'API Key 不存在' }, { status: 404 })
    }

    // 解密 API Key
    let decryptedKey: string
    try {
      decryptedKey = decrypt(apiKey.encrypted_key)
    } catch (error) {
      console.error('Decrypt error:', error)
      return NextResponse.json({ error: '密钥解密失败' }, { status: 500 })
    }

    // 根据服务类型测试
    let isValid = false
    let errorMessage = ''

    try {
      switch (apiKey.service as ApiKeyService) {
        case 'anthropic':
          isValid = await testAnthropicKey(decryptedKey)
          errorMessage = isValid ? '' : 'Anthropic API Key 无效或无权限'
          break
        case 'deepseek':
          isValid = await testDeepSeekKey(decryptedKey)
          errorMessage = isValid ? '' : 'DeepSeek API Key 无效或无权限'
          break
        case 'map':
          isValid = await testMapKey(decryptedKey)
          errorMessage = isValid ? '' : '高德地图 API Key 无效或无权限'
          break
        default:
          return NextResponse.json({ error: '不支持的服务类型' }, { status: 400 })
      }

      // 更新 last_used_at
      if (isValid) {
        await supabase
          .from('api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', keyId)
      }

      return NextResponse.json({
        valid: isValid,
        message: isValid ? 'API Key 有效' : errorMessage
      })
    } catch (error: any) {
      console.error('Test API key error:', error)
      return NextResponse.json({
        valid: false,
        message: error.message || '测试失败，请稍后重试'
      })
    }
  } catch (error) {
    console.error('Test API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
