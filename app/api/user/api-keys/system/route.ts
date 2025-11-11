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

    return NextResponse.json({ systemKeys })
  } catch (error) {
    console.error('Get system API keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
