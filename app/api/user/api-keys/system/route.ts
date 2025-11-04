import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

    const systemKeys: SystemApiKey[] = []

    // 检查 Anthropic API Key
    if (process.env.ANTHROPIC_API_KEY) {
      const key = process.env.ANTHROPIC_API_KEY
      systemKeys.push({
        service: 'anthropic',
        key_name: '系统默认 (Anthropic)',
        key_prefix: key.substring(0, 12) + '...',
        is_active: true,
        is_system: true,
      })
    }

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

    // 检查高德地图 API Key
    if (process.env.NEXT_PUBLIC_MAP_API_KEY) {
      const key = process.env.NEXT_PUBLIC_MAP_API_KEY
      systemKeys.push({
        service: 'map',
        key_name: '系统默认 (高德地图)',
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

    // 检查 Unsplash Access Key
    if (process.env.UNSPLASH_ACCESS_KEY) {
      const key = process.env.UNSPLASH_ACCESS_KEY
      systemKeys.push({
        service: 'unsplash',
        key_name: '系统默认 (Unsplash)',
        key_prefix: key.substring(0, 12) + '...',
        is_active: true,
        is_system: true,
      })
    }

    return NextResponse.json({ systemKeys })
  } catch (error) {
    console.error('Get system API keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
