/**
 * 高德 APP 集成 API
 *
 * 提供与高德地图 APP 联动的功能：
 * - 生成专属地图（同步到高德地图 APP）
 * - 获取导航唤端链接
 * - 获取打车唤端链接
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMCPClient } from '@/lib/agents/mcp-factory'
import { supabase } from '@/lib/supabase'
import { appConfig } from '@/lib/config'
import { ApiKeyClient } from '@/lib/api-keys'

/**
 * 获取认证用户
 */
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}

/**
 * POST /api/amap-app
 *
 * 请求体：
 * - action: 'custom-map' | 'navigation' | 'taxi'
 * - 根据 action 的不同，需要不同的参数
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { success: false, error: '缺少 action 参数' },
        { status: 400 }
      )
    }

    // 获取高德 API Key
    const mapConfig = await ApiKeyClient.getUserConfig(user.id, 'map', supabase)
    const apiKey = mapConfig?.apiKey || appConfig.map.webServiceKey

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '未配置高德地图 API Key' },
        { status: 400 }
      )
    }

    // 创建 MCP 客户端
    const mcpClient = await createMCPClient({ apiKey })

    let result: string | null = null

    switch (action) {
      case 'custom-map': {
        // 生成专属地图
        const { name, waypoints } = body
        if (!name || !waypoints || !Array.isArray(waypoints)) {
          return NextResponse.json(
            { success: false, error: '缺少 name 或 waypoints 参数' },
            { status: 400 }
          )
        }

        result = await mcpClient.generateCustomMap(name, waypoints)
        break
      }

      case 'navigation': {
        // 获取导航链接
        const { destination } = body
        if (!destination) {
          return NextResponse.json(
            { success: false, error: '缺少 destination 参数' },
            { status: 400 }
          )
        }

        result = await mcpClient.getNavigationLink(destination)
        break
      }

      case 'taxi': {
        // 获取打车链接
        const { origin, destination } = body
        if (!origin || !destination) {
          return NextResponse.json(
            { success: false, error: '缺少 origin 或 destination 参数' },
            { status: 400 }
          )
        }

        result = await mcpClient.getTaxiLink(origin, destination)
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: `不支持的 action: ${action}` },
          { status: 400 }
        )
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: '获取链接失败，请稍后重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { url: result }
    })
  } catch (error) {
    console.error('[API] amap-app error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
