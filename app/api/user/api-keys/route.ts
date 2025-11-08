import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt, decrypt, getKeyPrefix } from '@/lib/encryption'
import type { ApiKeyService } from '@/types'

/**
 * GET /api/user/api-keys
 * 获取用户的所有 API Keys（返回时解密 key 用于显示前缀）
 */
export async function GET(request: NextRequest) {
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

    // 查询用户的 API Keys
    const { data: apiKeys, error: queryError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('Query API keys error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // 返回（不包含完整的加密 key，只返回元数据）
    return NextResponse.json({
      apiKeys: apiKeys || []
    })
  } catch (error) {
    console.error('Get API keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/api-keys
 * 创建新的 API Key
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

    const { service, key_name, api_key } = await request.json()

    // 验证输入
    if (!service || !key_name || !api_key) {
      return NextResponse.json({ error: '请填写所有字段' }, { status: 400 })
    }

    // 验证 service 类型
    const validServices: ApiKeyService[] = ['deepseek', 'modelscope', 'map', 'voice']
    if (!validServices.includes(service)) {
      return NextResponse.json({ error: '无效的服务类型' }, { status: 400 })
    }

    // 加密 API Key
    const encryptedKey = encrypt(api_key)
    const keyPrefix = getKeyPrefix(api_key, 8)

    // 插入数据库
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        service,
        key_name,
        encrypted_key: encryptedKey,
        key_prefix: keyPrefix,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert API key error:', insertError)
      return NextResponse.json({ error: '创建失败' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'API Key 添加成功',
      apiKey: newKey
    })
  } catch (error) {
    console.error('Create API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
