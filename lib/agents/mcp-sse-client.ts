/**
 * 高德官方 MCP SSE 客户端
 *
 * 使用 Model Context Protocol SDK 连接高德官方 MCP 服务
 * 支持 SSE 和 Streamable HTTP 两种连接方式
 *
 * @see https://lbs.amap.com/api/mcp-server/gettingstarted
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 连接模式
 */
export type MCPConnectionMode = 'sse' | 'streamable-http'

/**
 * SSE 客户端配置
 */
export interface AmapMCPClientConfig {
  /** 高德 API Key */
  apiKey: string
  /** 连接模式，默认 'streamable-http' (官方推荐) */
  mode?: MCPConnectionMode
  /** SSE 服务 URL，默认使用官方地址 */
  sseUrl?: string
  /** Streamable HTTP 服务 URL，默认使用官方地址 */
  httpUrl?: string
  /** 连接超时时间（毫秒），默认 10000 */
  connectTimeout?: number
  /** 自动重连，默认 true */
  autoReconnect?: boolean
  /** 重连间隔（毫秒），默认 5000 */
  reconnectInterval?: number
  /** 最大重连次数，默认 3 */
  maxReconnectAttempts?: number
}

/**
 * 连接状态
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

/**
 * 工具调用结果
 */
export interface ToolCallResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * 连接状态变更回调
 */
export type ConnectionStateCallback = (
  state: ConnectionState,
  error?: Error
) => void

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_SSE_URL = 'https://mcp.amap.com/sse'
const DEFAULT_HTTP_URL = 'https://mcp.amap.com/mcp'
const DEFAULT_CONNECT_TIMEOUT = 10000
const DEFAULT_RECONNECT_INTERVAL = 5000
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 3

// ============================================================================
// 官方工具名称常量
// ============================================================================

/**
 * 高德官方 MCP 工具名称
 */
export const AMAP_MCP_TOOLS = {
  // 地理编码
  GEO: 'maps_geo',
  REGEO: 'maps_regeo',

  // IP 定位
  IP_LOCATION: 'maps_ip_location',

  // 天气
  WEATHER: 'maps_weather',

  // 路径规划
  BICYCLING: 'maps_bicycling',
  WALKING: 'maps_walking',
  DRIVING: 'maps_driving',
  TRANSIT: 'maps_transit_integrated',

  // 距离测量
  DISTANCE: 'maps_distance',

  // POI 搜索
  SEARCH_TEXT: 'maps_search_text',
  SEARCH_AROUND: 'maps_search_around',
  SEARCH_DETAIL: 'maps_search_detail',

  // 高德 APP 联动功能
  BINDMAP: 'amap_maps_bindmap', // 生成专属地图
  NAVI: 'amap_maps_navi', // 导航唤端
  TAXI: 'amap_maps_taxi', // 打车唤端
} as const

export type AmapMCPToolName =
  (typeof AMAP_MCP_TOOLS)[keyof typeof AMAP_MCP_TOOLS]

// ============================================================================
// MCP SSE 客户端类
// ============================================================================

/**
 * 高德官方 MCP SSE 客户端
 *
 * 封装 MCP SDK，提供与高德官方 MCP 服务的连接和工具调用功能
 */
export class AmapMCPClient {
  private client: Client
  private config: Required<AmapMCPClientConfig>
  private transport: SSEClientTransport | StreamableHTTPClientTransport | null =
    null
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts: number = 0
  private stateCallbacks: Set<ConnectionStateCallback> = new Set()
  private availableTools: Set<string> = new Set()

  constructor(config: AmapMCPClientConfig) {
    if (!config.apiKey) {
      throw new Error('AMap API Key is required')
    }

    this.config = {
      apiKey: config.apiKey,
      mode: config.mode || 'streamable-http',
      sseUrl: config.sseUrl || DEFAULT_SSE_URL,
      httpUrl: config.httpUrl || DEFAULT_HTTP_URL,
      connectTimeout: config.connectTimeout || DEFAULT_CONNECT_TIMEOUT,
      autoReconnect: config.autoReconnect !== false,
      reconnectInterval: config.reconnectInterval || DEFAULT_RECONNECT_INTERVAL,
      maxReconnectAttempts:
        config.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS,
    }

    this.client = new Client({
      name: 'ai-travel-planner',
      version: '1.0.0',
    })
  }

  // --------------------------------------------------------------------------
  // 连接管理
  // --------------------------------------------------------------------------

  /**
   * 获取当前连接状态
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connectionState === 'connected'
  }

  /**
   * 添加连接状态变更监听器
   */
  onStateChange(callback: ConnectionStateCallback): () => void {
    this.stateCallbacks.add(callback)
    return () => {
      this.stateCallbacks.delete(callback)
    }
  }

  /**
   * 更新连接状态并通知监听器
   */
  private updateState(state: ConnectionState, error?: Error): void {
    this.connectionState = state
    this.stateCallbacks.forEach((callback) => {
      try {
        callback(state, error)
      } catch (e) {
        console.error('[AmapMCPClient] State callback error:', e)
      }
    })
  }

  /**
   * 连接到高德 MCP 服务
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') {
      console.log('[AmapMCPClient] Already connected')
      return
    }

    if (this.connectionState === 'connecting') {
      console.log('[AmapMCPClient] Connection in progress')
      return
    }

    this.updateState('connecting')

    try {
      // 根据模式创建 transport
      if (this.config.mode === 'sse') {
        const url = new URL(this.config.sseUrl)
        url.searchParams.set('key', this.config.apiKey)

        this.transport = new SSEClientTransport(url)
      } else {
        const url = new URL(this.config.httpUrl)
        url.searchParams.set('key', this.config.apiKey)

        this.transport = new StreamableHTTPClientTransport(url)
      }

      // 连接超时处理
      const connectPromise = this.client.connect(this.transport)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, this.config.connectTimeout)
      })

      await Promise.race([connectPromise, timeoutPromise])

      // 获取可用工具列表
      await this.listTools()

      this.reconnectAttempts = 0
      this.updateState('connected')
      console.log(
        '[AmapMCPClient] Connected to Amap MCP service (mode: %s)',
        this.config.mode
      )
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error('[AmapMCPClient] Connection failed:', err.message)
      this.updateState('error', err)

      // 尝试重连
      if (this.config.autoReconnect) {
        await this.scheduleReconnect()
      }

      throw err
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (
      this.connectionState === 'disconnected' ||
      this.connectionState === 'error'
    ) {
      return
    }

    try {
      await this.client.close()
    } catch (error) {
      console.error('[AmapMCPClient] Disconnect error:', error)
    } finally {
      this.transport = null
      this.availableTools.clear()
      this.updateState('disconnected')
      console.log('[AmapMCPClient] Disconnected')
    }
  }

  /**
   * 安排重连
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(
        '[AmapMCPClient] Max reconnect attempts reached (%d)',
        this.config.maxReconnectAttempts
      )
      return
    }

    this.reconnectAttempts++
    this.updateState('reconnecting')
    console.log(
      '[AmapMCPClient] Reconnecting in %dms (attempt %d/%d)',
      this.config.reconnectInterval,
      this.reconnectAttempts,
      this.config.maxReconnectAttempts
    )

    await new Promise((resolve) =>
      setTimeout(resolve, this.config.reconnectInterval)
    )

    try {
      await this.connect()
    } catch {
      // 错误已在 connect 中处理
    }
  }

  // --------------------------------------------------------------------------
  // 工具调用
  // --------------------------------------------------------------------------

  /**
   * 获取可用工具列表
   */
  async listTools(): Promise<string[]> {
    try {
      const result = await this.client.listTools()
      this.availableTools.clear()
      for (const tool of result.tools) {
        this.availableTools.add(tool.name)
      }
      console.log(
        '[AmapMCPClient] Available tools:',
        Array.from(this.availableTools)
      )
      return Array.from(this.availableTools)
    } catch (error) {
      console.error('[AmapMCPClient] Failed to list tools:', error)
      return []
    }
  }

  /**
   * 检查工具是否可用
   */
  hasToolAvailable(toolName: string): boolean {
    return this.availableTools.has(toolName)
  }

  /**
   * 调用 MCP 工具
   *
   * @param name 工具名称（使用 AMAP_MCP_TOOLS 常量）
   * @param args 工具参数
   * @returns 工具调用结果
   */
  async callTool(
    name: AmapMCPToolName | string,
    args: Record<string, any>
  ): Promise<ToolCallResult> {
    if (!this.isConnected()) {
      return {
        success: false,
        error: 'Not connected to MCP service',
      }
    }

    try {
      console.log('[AmapMCPClient] Calling tool: %s with args:', name, args)

      const result = await this.client.callTool({
        name,
        arguments: args,
      })

      // 解析结果
      if (result.isError) {
        return {
          success: false,
          error:
            typeof result.content === 'string'
              ? result.content
              : JSON.stringify(result.content),
        }
      }

      // 提取内容
      let data: any
      if (Array.isArray(result.content)) {
        // MCP 返回的 content 通常是数组格式
        const textContent = result.content.find(
          (c: any) => c.type === 'text'
        ) as any
        if (textContent) {
          try {
            data = JSON.parse(textContent.text)
          } catch {
            data = textContent.text
          }
        } else {
          data = result.content
        }
      } else {
        data = result.content
      }

      console.log('[AmapMCPClient] Tool result:', data)

      return {
        success: true,
        data,
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('[AmapMCPClient] Tool call failed:', errMsg)

      return {
        success: false,
        error: errMsg,
      }
    }
  }

  // --------------------------------------------------------------------------
  // 便捷方法：地理编码
  // --------------------------------------------------------------------------

  /**
   * 地理编码：地址转坐标
   */
  async geocode(
    address: string,
    city?: string
  ): Promise<{
    location: string
    formatted_address?: string
    adcode?: string
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.GEO, {
      address,
      ...(city && { city }),
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * 逆地理编码：坐标转地址
   */
  async reverseGeocode(location: string): Promise<{
    formatted_address: string
    addressComponent?: any
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.REGEO, { location })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  // --------------------------------------------------------------------------
  // 便捷方法：天气
  // --------------------------------------------------------------------------

  /**
   * 获取天气预报
   */
  async getWeather(city: string): Promise<{
    forecasts: any[]
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.WEATHER, { city })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  // --------------------------------------------------------------------------
  // 便捷方法：路径规划
  // --------------------------------------------------------------------------

  /**
   * 驾车路径规划
   */
  async getDrivingRoute(
    origin: string,
    destination: string
  ): Promise<{
    distance: number
    duration: number
    paths?: any[]
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.DRIVING, {
      origin,
      destination,
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * 步行路径规划
   */
  async getWalkingRoute(
    origin: string,
    destination: string
  ): Promise<{
    distance: number
    duration: number
    paths?: any[]
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.WALKING, {
      origin,
      destination,
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * 骑行路径规划
   */
  async getBicyclingRoute(
    origin: string,
    destination: string
  ): Promise<{
    distance: number
    duration: number
    steps?: any[]
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.BICYCLING, {
      origin,
      destination,
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * 公交/地铁路径规划
   */
  async getTransitRoute(
    origin: string,
    destination: string,
    city: string,
    cityd?: string
  ): Promise<{
    distance: number
    transits?: any[]
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.TRANSIT, {
      origin,
      destination,
      city,
      ...(cityd && { cityd }),
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  // --------------------------------------------------------------------------
  // 便捷方法：POI 搜索
  // --------------------------------------------------------------------------

  /**
   * 关键词搜索 POI
   */
  async searchPOI(
    keywords: string,
    city?: string
  ): Promise<{
    pois: any[]
    suggestion?: any
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.SEARCH_TEXT, {
      keywords,
      ...(city && { city }),
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * 周边搜索 POI
   */
  async searchNearby(
    location: string,
    keywords?: string,
    radius?: number
  ): Promise<{
    pois: any[]
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.SEARCH_AROUND, {
      location,
      ...(keywords && { keywords }),
      ...(radius && { radius: radius.toString() }),
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * POI 详情搜索
   */
  async getPOIDetail(id: string): Promise<any | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.SEARCH_DETAIL, { id })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  // --------------------------------------------------------------------------
  // 便捷方法：距离测量
  // --------------------------------------------------------------------------

  /**
   * 计算两点间距离
   */
  async calculateDistance(
    origin: string,
    destination: string
  ): Promise<{
    distance: number
    duration?: number
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.DISTANCE, {
      origin,
      destination,
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  // --------------------------------------------------------------------------
  // 便捷方法：高德 APP 联动
  // --------------------------------------------------------------------------

  /**
   * 生成专属地图（唤起高德 APP）
   *
   * @param name 行程名称
   * @param details 行程详情
   * @returns 唤端链接
   */
  async generateCustomMap(
    name: string,
    details: {
      description?: string
      waypoints: Array<{
        name: string
        location: string
      }>
    }
  ): Promise<string | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.BINDMAP, {
      name,
      details,
    })

    if (!result.success || !result.data) {
      return null
    }

    // 返回唤端链接
    return result.data.url || result.data
  }

  /**
   * 获取导航唤端链接
   */
  async getNavigationLink(destination: string): Promise<string | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.NAVI, {
      destination,
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data.url || result.data
  }

  /**
   * 获取打车唤端链接
   */
  async getTaxiLink(origin: string, destination: string): Promise<string | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.TAXI, {
      origin,
      destination,
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data.url || result.data
  }

  // --------------------------------------------------------------------------
  // IP 定位
  // --------------------------------------------------------------------------

  /**
   * IP 定位
   */
  async getIPLocation(ip: string): Promise<{
    province: string
    city: string
    adcode: string
  } | null> {
    const result = await this.callTool(AMAP_MCP_TOOLS.IP_LOCATION, { ip })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }
}

// ============================================================================
// 单例管理
// ============================================================================

let amapMCPClientInstance: AmapMCPClient | null = null

/**
 * 获取高德 MCP 客户端实例（单例）
 */
export function getAmapMCPClient(
  config?: AmapMCPClientConfig
): AmapMCPClient | null {
  if (!amapMCPClientInstance && config) {
    amapMCPClientInstance = new AmapMCPClient(config)
  }
  return amapMCPClientInstance
}

/**
 * 创建新的高德 MCP 客户端实例
 */
export function createAmapMCPClient(config: AmapMCPClientConfig): AmapMCPClient {
  return new AmapMCPClient(config)
}

/**
 * 重置高德 MCP 客户端（用于测试）
 */
export async function resetAmapMCPClient(): Promise<void> {
  if (amapMCPClientInstance) {
    await amapMCPClientInstance.disconnect()
    amapMCPClientInstance = null
  }
}

/**
 * 默认导出
 */
export default AmapMCPClient
