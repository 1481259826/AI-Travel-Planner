/**
 * 高德 APP 集成 API
 *
 * 提供与高德地图 APP 联动的功能：
 * - 生成专属地图（同步到高德地图 APP）
 * - 获取导航唤端链接
 * - 获取打车唤端链接
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMCPTools, type IExtendedMCPTools } from '@/lib/agents/mcp-factory'
import { createAmapMCPClient } from '@/lib/agents/mcp-sse-client'
import { appConfig } from '@/lib/config'
import { ApiKeyClient } from '@/lib/api-keys'
import { requireAuth } from '@/app/api/_middleware/auth'
import { handleApiError } from '@/app/api/_middleware'

/**
 * GET /api/amap-app
 *
 * 获取高德 MCP 服务可用的工具列表（调试用）
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 获取高德 API Key
    const mapConfig = await ApiKeyClient.getUserConfig(user.id, 'map', supabase)
    const apiKey = mapConfig?.apiKey || appConfig.map.webServiceKey

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '未配置高德地图 API Key' },
        { status: 400 }
      )
    }

    // 创建 MCP 客户端并列出工具
    const client = createAmapMCPClient({
      apiKey,
      mode: 'streamable-http',
    })

    await client.connect()
    const tools = await client.listTools()
    await client.disconnect()

    return NextResponse.json({
      success: true,
      data: { tools }
    })
  } catch (error) {
    console.error('[API] amap-app GET error:', error)
    return handleApiError(error)
  }
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
    console.log('[API] amap-app: 收到请求')

    const { user, supabase } = await requireAuth(request)
    console.log('[API] amap-app: 用户已认证', user.id)

    const body = await request.json()
    const { action } = body
    console.log('[API] amap-app: action =', action)

    if (!action) {
      return NextResponse.json(
        { success: false, error: '缺少 action 参数' },
        { status: 400 }
      )
    }

    // 获取高德 API Key
    const mapConfig = await ApiKeyClient.getUserConfig(user.id, 'map', supabase)
    const apiKey = mapConfig?.apiKey || appConfig.map.webServiceKey
    console.log('[API] amap-app: API Key 获取', apiKey ? '成功' : '失败')

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '未配置高德地图 API Key' },
        { status: 400 }
      )
    }

    // 创建 MCP 客户端（需要扩展接口支持 APP 联动功能）
    console.log('[API] amap-app: 开始创建 MCP 客户端...')
    const { tools, extended, mode, fallback } = await createMCPTools({ apiKey })
    console.log('[API] amap-app: MCP 客户端创建完成, mode =', mode, ', extended =', extended, ', fallback =', fallback)

    // 检查是否支持扩展功能
    if (!extended) {
      return NextResponse.json(
        { success: false, error: '当前 MCP 模式不支持高德 APP 联动功能，请确保已配置官方 MCP 服务' },
        { status: 400 }
      )
    }

    const mcpClient = tools as IExtendedMCPTools

    let result: string | null = null

    switch (action) {
      case 'custom-map': {
        // 生成专属地图
        const { name, waypoints, city } = body
        console.log('[API] amap-app: custom-map, name =', name, ', city =', city, ', waypoints count =', waypoints?.length)
        if (!name || !waypoints || !Array.isArray(waypoints)) {
          return NextResponse.json(
            { success: false, error: '缺少 name 或 waypoints 参数' },
            { status: 400 }
          )
        }

        console.log('[API] amap-app: 调用 generateCustomMap...')
        result = await mcpClient.generateCustomMap(name, waypoints, city)
        console.log('[API] amap-app: generateCustomMap 结果 =', result)
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
    return handleApiError(error)
  }
}
