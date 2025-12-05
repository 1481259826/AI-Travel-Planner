/**
 * MCP 工具映射层
 *
 * 将高德官方 MCP 服务的工具调用映射为与现有 MCPClient 相同的接口
 * 实现无缝切换，保持向后兼容
 */

import {
  AmapMCPClient,
  AMAP_MCP_TOOLS,
  type AmapMCPClientConfig,
} from './mcp-sse-client'
import {
  transformWeatherResponse,
  transformPOISearchResponse,
  transformRouteResponse,
  transformTransitResponse,
  transformGeocodeResponse,
  transformRegeoResponse,
  transformDistanceResponse,
} from './mcp-transformers'
import type {
  WeatherForecastResult,
  POISearchResult,
  RouteResult,
  GeocodeResult,
  DistanceResult,
} from './mcp-client'
import { withCache, CACHE_TTL, getMCPCache, logCacheStats } from './cache'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * MCP 工具接口
 * 与现有 MCPClient 保持一致的接口定义
 */
export interface IMCPTools {
  // 天气
  getWeatherForecast(
    city: string,
    extensions?: 'base' | 'all'
  ): Promise<WeatherForecastResult | null>

  // POI 搜索
  searchPOI(params: {
    keywords: string
    city?: string
    types?: string
    cityLimit?: boolean
    pageSize?: number
    page?: number
  }): Promise<POISearchResult | null>

  searchNearby(params: {
    location: string
    keywords?: string
    types?: string
    radius?: number
    pageSize?: number
  }): Promise<POISearchResult | null>

  // 路线规划
  getDrivingRoute(
    origin: string,
    destination: string,
    strategy?: number
  ): Promise<RouteResult | null>

  getWalkingRoute(
    origin: string,
    destination: string
  ): Promise<RouteResult | null>

  getTransitRoute(
    origin: string,
    destination: string,
    city: string
  ): Promise<RouteResult | null>

  // 地理编码
  geocode(address: string, city?: string): Promise<GeocodeResult | null>
  reverseGeocode(location: string): Promise<GeocodeResult | null>

  // 距离计算
  calculateDistance(
    origins: string,
    destinations: string,
    type?: 0 | 1
  ): Promise<DistanceResult[]>

  // 缓存控制
  getCacheStats(): { hits: number; misses: number; size: number }
  logCacheStats(): void
  clearCache(): void
}

/**
 * 扩展 MCP 工具接口（包含新功能）
 */
export interface IExtendedMCPTools extends IMCPTools {
  // 骑行路线（新功能）
  getBicyclingRoute(
    origin: string,
    destination: string
  ): Promise<RouteResult | null>

  // POI 详情（新功能）
  getPOIDetail(id: string): Promise<any | null>

  // IP 定位（新功能）
  getIPLocation(ip: string): Promise<{
    province: string
    city: string
    adcode: string
  } | null>

  // 高德 APP 联动（新功能）
  generateCustomMap(
    name: string,
    waypoints: Array<{ name: string; location: string }>,
    city?: string
  ): Promise<string | null>

  getNavigationLink(destination: string): Promise<string | null>

  getTaxiLink(origin: string, destination: string): Promise<string | null>
}

// ============================================================================
// AmapMCPTools 类
// ============================================================================

/**
 * 高德 MCP 工具适配器
 *
 * 使用官方 MCP 服务，但保持与现有 MCPClient 相同的接口
 */
export class AmapMCPTools implements IExtendedMCPTools {
  private client: AmapMCPClient
  private enableCache: boolean
  private connected: boolean = false

  constructor(
    client: AmapMCPClient,
    options?: { enableCache?: boolean }
  ) {
    this.client = client
    this.enableCache = options?.enableCache !== false
  }

  /**
   * 确保已连接
   */
  private async ensureConnected(): Promise<boolean> {
    if (this.client.isConnected()) {
      return true
    }

    try {
      await this.client.connect()
      this.connected = true
      return true
    } catch (error) {
      console.error('[AmapMCPTools] Failed to connect:', error)
      return false
    }
  }

  // --------------------------------------------------------------------------
  // 缓存控制
  // --------------------------------------------------------------------------

  getCacheStats() {
    return getMCPCache().getStats()
  }

  logCacheStats() {
    logCacheStats()
  }

  clearCache() {
    getMCPCache().clear()
  }

  // --------------------------------------------------------------------------
  // 天气查询
  // --------------------------------------------------------------------------

  async getWeatherForecast(
    city: string,
    extensions: 'base' | 'all' = 'all'
  ): Promise<WeatherForecastResult | null> {
    const fetchWeather = async (): Promise<WeatherForecastResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.WEATHER, {
        city,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Weather query failed:', result.error)
        return null
      }

      return transformWeatherResponse(result.data)
    }

    if (this.enableCache) {
      return withCache('WEATHER', { city, extensions }, fetchWeather)
    }
    return fetchWeather()
  }

  // --------------------------------------------------------------------------
  // POI 搜索
  // --------------------------------------------------------------------------

  async searchPOI(params: {
    keywords: string
    city?: string
    types?: string
    cityLimit?: boolean
    pageSize?: number
    page?: number
  }): Promise<POISearchResult | null> {
    const fetchPOI = async (): Promise<POISearchResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.SEARCH_TEXT, {
        keywords: params.keywords,
        ...(params.city && { city: params.city }),
        ...(params.cityLimit && { citylimit: true }),
      })

      if (!result.success) {
        console.error('[AmapMCPTools] POI search failed:', result.error)
        return null
      }

      return transformPOISearchResponse(result.data)
    }

    if (this.enableCache) {
      return withCache('POI_SEARCH', params, fetchPOI)
    }
    return fetchPOI()
  }

  async searchNearby(params: {
    location: string
    keywords?: string
    types?: string
    radius?: number
    pageSize?: number
  }): Promise<POISearchResult | null> {
    const fetchNearby = async (): Promise<POISearchResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.SEARCH_AROUND, {
        location: params.location,
        ...(params.keywords && { keywords: params.keywords }),
        ...(params.radius && { radius: params.radius.toString() }),
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Nearby search failed:', result.error)
        return null
      }

      return transformPOISearchResponse(result.data)
    }

    if (this.enableCache) {
      return withCache('NEARBY_SEARCH', params, fetchNearby)
    }
    return fetchNearby()
  }

  async getPOIDetail(id: string): Promise<any | null> {
    const fetchDetail = async (): Promise<any | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.SEARCH_DETAIL, {
        id,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] POI detail failed:', result.error)
        return null
      }

      return result.data
    }

    if (this.enableCache) {
      return withCache('POI_DETAIL', { id }, fetchDetail)
    }
    return fetchDetail()
  }

  // --------------------------------------------------------------------------
  // 路线规划
  // --------------------------------------------------------------------------

  async getDrivingRoute(
    origin: string,
    destination: string,
    strategy: number = 0
  ): Promise<RouteResult | null> {
    const fetchRoute = async (): Promise<RouteResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.DRIVING, {
        origin,
        destination,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Driving route failed:', result.error)
        return null
      }

      return transformRouteResponse(result.data, origin, destination)
    }

    if (this.enableCache) {
      return withCache(
        'ROUTE',
        { type: 'driving', origin, destination, strategy },
        fetchRoute
      )
    }
    return fetchRoute()
  }

  async getWalkingRoute(
    origin: string,
    destination: string
  ): Promise<RouteResult | null> {
    const fetchRoute = async (): Promise<RouteResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.WALKING, {
        origin,
        destination,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Walking route failed:', result.error)
        return null
      }

      return transformRouteResponse(result.data, origin, destination)
    }

    if (this.enableCache) {
      return withCache(
        'ROUTE',
        { type: 'walking', origin, destination },
        fetchRoute
      )
    }
    return fetchRoute()
  }

  async getBicyclingRoute(
    origin: string,
    destination: string
  ): Promise<RouteResult | null> {
    const fetchRoute = async (): Promise<RouteResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.BICYCLING, {
        origin,
        destination,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Bicycling route failed:', result.error)
        return null
      }

      return transformRouteResponse(result.data, origin, destination)
    }

    if (this.enableCache) {
      return withCache(
        'ROUTE',
        { type: 'bicycling', origin, destination },
        fetchRoute
      )
    }
    return fetchRoute()
  }

  async getTransitRoute(
    origin: string,
    destination: string,
    city: string
  ): Promise<RouteResult | null> {
    const fetchRoute = async (): Promise<RouteResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.TRANSIT, {
        origin,
        destination,
        city,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Transit route failed:', result.error)
        return null
      }

      return transformTransitResponse(result.data, origin, destination)
    }

    if (this.enableCache) {
      return withCache(
        'ROUTE',
        { type: 'transit', origin, destination, city },
        fetchRoute
      )
    }
    return fetchRoute()
  }

  // --------------------------------------------------------------------------
  // 地理编码
  // --------------------------------------------------------------------------

  async geocode(
    address: string,
    city?: string
  ): Promise<GeocodeResult | null> {
    const fetchGeocode = async (): Promise<GeocodeResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.GEO, {
        address,
        ...(city && { city }),
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Geocode failed:', result.error)
        return null
      }

      return transformGeocodeResponse(result.data)
    }

    if (this.enableCache) {
      return withCache('GEOCODE', { address, city }, fetchGeocode)
    }
    return fetchGeocode()
  }

  async reverseGeocode(location: string): Promise<GeocodeResult | null> {
    const fetchRegeo = async (): Promise<GeocodeResult | null> => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.REGEO, {
        location,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Reverse geocode failed:', result.error)
        return null
      }

      return transformRegeoResponse(result.data, location)
    }

    if (this.enableCache) {
      return withCache('GEOCODE', { type: 'reverse', location }, fetchRegeo)
    }
    return fetchRegeo()
  }

  // --------------------------------------------------------------------------
  // 距离计算
  // --------------------------------------------------------------------------

  async calculateDistance(
    origins: string,
    destinations: string,
    type: 0 | 1 = 1
  ): Promise<DistanceResult[]> {
    const fetchDistance = async (): Promise<DistanceResult[]> => {
      if (!(await this.ensureConnected())) {
        return []
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.DISTANCE, {
        origin: origins,
        destination: destinations,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] Distance calculation failed:', result.error)
        return []
      }

      return transformDistanceResponse(result.data, origins, destinations)
    }

    if (this.enableCache) {
      return withCache(
        'DISTANCE',
        { origins, destinations, type },
        fetchDistance
      )
    }
    return fetchDistance()
  }

  // --------------------------------------------------------------------------
  // IP 定位
  // --------------------------------------------------------------------------

  async getIPLocation(ip: string): Promise<{
    province: string
    city: string
    adcode: string
  } | null> {
    const fetchIP = async () => {
      if (!(await this.ensureConnected())) {
        return null
      }

      const result = await this.client.callTool(AMAP_MCP_TOOLS.IP_LOCATION, {
        ip,
      })

      if (!result.success) {
        console.error('[AmapMCPTools] IP location failed:', result.error)
        return null
      }

      return result.data
    }

    // IP 定位不缓存
    return fetchIP()
  }

  // --------------------------------------------------------------------------
  // 高德 APP 联动
  // --------------------------------------------------------------------------

  async generateCustomMap(
    name: string,
    waypoints: Array<{ name: string; location: string; poiId?: string }>,
    city?: string
  ): Promise<string | null> {
    if (!(await this.ensureConnected())) {
      return null
    }

    // 从行程名称中提取城市（如 "杭州之旅" -> "杭州"）
    const cityName = city || name.replace(/之旅|旅行|游|行程$/g, '')

    // 构造行程详情，按高德要求的格式
    // 参数格式: { orgName, lineList: [{ title, pointInfoList: [{ name, lon, lat, poiId }] }] }
    const pointInfoList: Array<{ name: string; lon: number; lat: number; poiId: string }> = []

    for (const wp of waypoints) {
      const [lon, lat] = wp.location.split(',').map(Number)
      let poiId = wp.poiId

      // 如果没有 poiId，尝试通过 POI 搜索获取
      if (!poiId) {
        try {
          const searchResult = await this.searchPOI({
            keywords: wp.name,
            city: cityName, // 限定城市范围
            cityLimit: true, // 强制限定在该城市
            pageSize: 1,
          })
          if (searchResult?.pois?.[0]?.id) {
            poiId = searchResult.pois[0].id
            console.log(`[AmapMCPTools] Found poiId for "${wp.name}": ${poiId}`)
          }
        } catch (e) {
          console.warn('[AmapMCPTools] Failed to get poiId for:', wp.name, e)
        }
      }

      // 如果还是没有 poiId，使用坐标生成一个虚拟 ID（高德可能不接受）
      if (!poiId) {
        console.warn('[AmapMCPTools] No poiId found for:', wp.name, '- this point may be skipped')
        // 跳过没有 poiId 的点
        continue
      }

      pointInfoList.push({
        name: wp.name,
        lon,
        lat,
        poiId,
      })
    }

    if (pointInfoList.length === 0) {
      console.error('[AmapMCPTools] No valid waypoints with poiId')
      return null
    }

    const result = await this.client.callTool(AMAP_MCP_TOOLS.BINDMAP, {
      orgName: name,
      lineList: [
        {
          title: name,
          pointInfoList,
        },
      ],
    })

    if (!result.success) {
      console.error('[AmapMCPTools] Generate custom map failed:', result.error)
      return null
    }

    console.log('[AmapMCPTools] generateCustomMap raw data:', result.data, typeof result.data)

    // 高德返回的是 amapuri:// 协议链接，只能在移动端唤起 APP
    // 为了支持桌面浏览器，我们同时生成一个网页版的多点标记链接
    const amapuriUrl = typeof result.data === 'string'
      ? result.data
      : (result.data?.url || result.data?.uri || result.data?.link || String(result.data))

    // 生成网页版链接（使用高德 URI API 的多点标记功能）
    // 格式: https://uri.amap.com/marker?markers=lng1,lat1,name1|lng2,lat2,name2&callnative=1
    const markers = pointInfoList.map(p => `${p.lon},${p.lat},${encodeURIComponent(p.name)}`).join('|')
    const webUrl = `https://uri.amap.com/marker?markers=${markers}&src=ai-travel-planner&callnative=1`

    console.log('[AmapMCPTools] Generated web URL:', webUrl)
    console.log('[AmapMCPTools] Original amapuri URL:', amapuriUrl)

    // 返回网页版链接（在移动端会自动尝试唤起 APP）
    return webUrl
  }

  async getNavigationLink(destination: string): Promise<string | null> {
    if (!(await this.ensureConnected())) {
      return null
    }

    const result = await this.client.callTool(AMAP_MCP_TOOLS.NAVI, {
      destination,
    })

    if (!result.success) {
      console.error('[AmapMCPTools] Get navigation link failed:', result.error)
      return null
    }

    return result.data?.url || result.data
  }

  async getTaxiLink(origin: string, destination: string): Promise<string | null> {
    if (!(await this.ensureConnected())) {
      return null
    }

    const result = await this.client.callTool(AMAP_MCP_TOOLS.TAXI, {
      origin,
      destination,
    })

    if (!result.success) {
      console.error('[AmapMCPTools] Get taxi link failed:', result.error)
      return null
    }

    return result.data?.url || result.data
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 MCP 工具实例
 */
export async function createAmapMCPTools(
  config: AmapMCPClientConfig & { enableCache?: boolean }
): Promise<AmapMCPTools> {
  const client = new AmapMCPClient(config)
  await client.connect()
  return new AmapMCPTools(client, { enableCache: config.enableCache })
}

/**
 * 默认导出
 */
export default AmapMCPTools
