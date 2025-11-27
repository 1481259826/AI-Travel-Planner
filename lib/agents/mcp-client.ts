/**
 * MCP 客户端封装
 * 提供统一的 MCP 工具调用接口
 *
 * Phase 2: 复用现有的高德 API 封装
 * Phase 4/5: 可切换到真正的 MCP 客户端（通过 stdio/SSE 连接 MCP Server）
 * Phase 5.1: 添加结果缓存支持
 */

import {
  getWeatherByCityName,
  type AmapWeatherResponse,
  type AmapWeatherForecast,
} from '../amap-weather'
import { appConfig } from '../config'
import { withCache, CACHE_TTL, getMCPCache, logCacheStats } from './cache'
import https from 'https'

// ============================================================================
// HTTP 工具函数
// ============================================================================

/**
 * 绕过代理发送 HTTPS GET 请求
 */
function fetchWithoutProxy(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AI-Travel-Planner/1.0',
      },
      agent: false, // 不使用代理
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(
            new Error(`HTTP ${res.statusCode}: ${data || 'Empty response'}`)
          )
          return
        }

        if (!data) {
          reject(new Error('Empty response body'))
          return
        }

        try {
          const json = JSON.parse(data)
          resolve(json)
        } catch (error) {
          reject(
            new Error(`Failed to parse JSON: ${data.substring(0, 200)}`)
          )
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

// ============================================================================
// MCP 工具返回类型
// ============================================================================

/**
 * 天气预报工具返回
 */
export interface WeatherForecastResult {
  city: string
  adcode: string
  province: string
  reporttime: string
  forecasts: AmapWeatherForecast[]
}

/**
 * POI 搜索结果项
 */
export interface POI {
  id: string
  name: string
  type: string
  typecode: string
  address: string
  location: string // "lng,lat"
  tel?: string
  photos?: string[]
  rating?: string
}

/**
 * POI 搜索工具返回
 */
export interface POISearchResult {
  count: number
  pois: POI[]
}

/**
 * 路线步骤
 */
export interface RouteStep {
  instruction: string // 行驶指示
  road: string // 道路名称
  distance: number // 距离（米）
  duration: number // 时长（秒）
}

/**
 * 路线规划工具返回
 */
export interface RouteResult {
  origin: string
  destination: string
  distance: number // 总距离（米）
  duration: number // 总时长（秒）
  taxi_cost?: number // 出租车费用（元）
  polyline?: string // 路线轨迹
  steps?: RouteStep[]
}

/**
 * 地理编码工具返回
 */
export interface GeocodeResult {
  formatted_address: string
  location: string // "lng,lat"
  level: string // 匹配级别
  adcode: string
  city: string
  district: string
}

/**
 * 距离计算工具返回
 */
export interface DistanceResult {
  origin: string
  destination: string
  distance: number // 米
  duration?: number // 秒（驾车）
}

// ============================================================================
// MCP 客户端类
// ============================================================================

/**
 * MCP 客户端
 * 封装所有 MCP 工具调用
 */
export class MCPClient {
  private apiKey: string
  private enableCache: boolean

  constructor(options?: { apiKey?: string; enableCache?: boolean }) {
    this.apiKey = options?.apiKey || appConfig.map.webServiceKey || ''
    this.enableCache = options?.enableCache !== false // 默认启用缓存
    if (!this.apiKey) {
      throw new Error(
        'AMap API key not configured. Please set NEXT_PUBLIC_MAP_WEB_SERVICE_KEY or AMAP_WEB_SERVICE_KEY'
      )
    }
  }

  // --------------------------------------------------------------------------
  // 缓存控制
  // --------------------------------------------------------------------------

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return getMCPCache().getStats()
  }

  /**
   * 打印缓存统计
   */
  logCacheStats() {
    logCacheStats()
  }

  /**
   * 清除缓存
   */
  clearCache() {
    getMCPCache().clear()
  }

  // --------------------------------------------------------------------------
  // 天气查询
  // --------------------------------------------------------------------------

  /**
   * 获取城市天气预报
   * @param city 城市名称
   * @param extensions 'base' 返回实时天气，'all' 返回未来 3 天预报（默认）
   */
  async getWeatherForecast(
    city: string,
    extensions: 'base' | 'all' = 'all'
  ): Promise<WeatherForecastResult | null> {
    const fetchWeather = async (): Promise<WeatherForecastResult | null> => {
      try {
        const weatherData = await getWeatherByCityName(city)

        if (
          !weatherData ||
          !weatherData.forecasts ||
          weatherData.forecasts.length === 0
        ) {
          console.error('[MCP Client] Weather data not found for city:', city)
          return null
        }

        const forecast = weatherData.forecasts[0]

        return {
          city: forecast.city,
          adcode: forecast.adcode,
          province: forecast.province,
          reporttime: forecast.reporttime,
          forecasts: forecast.casts,
        }
      } catch (error) {
        console.error('[MCP Client] Error fetching weather:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('WEATHER', { city, extensions }, fetchWeather)
    }
    return fetchWeather()
  }

  // --------------------------------------------------------------------------
  // POI 搜索
  // --------------------------------------------------------------------------

  /**
   * 关键词搜索 POI
   * @param keywords 搜索关键词
   * @param city 城市名称（可选）
   * @param types POI 类型代码（可选）
   * @param cityLimit 是否仅在指定城市搜索
   * @param pageSize 返回数量
   */
  async searchPOI(params: {
    keywords: string
    city?: string
    types?: string
    cityLimit?: boolean
    pageSize?: number
    page?: number
  }): Promise<POISearchResult | null> {
    const fetchPOI = async (): Promise<POISearchResult | null> => {
      try {
        const {
          keywords,
          city = '',
          types = '',
          cityLimit = false,
          pageSize = 20,
          page = 1,
        } = params

        const url = new URL('https://restapi.amap.com/v3/place/text')
        url.searchParams.set('keywords', keywords)
        url.searchParams.set('key', this.apiKey)
        url.searchParams.set('offset', pageSize.toString())
        url.searchParams.set('page', page.toString())
        url.searchParams.set('extensions', 'all') // 获取详细信息

        if (city) {
          url.searchParams.set('city', city)
          url.searchParams.set('citylimit', cityLimit ? 'true' : 'false')
        }
        if (types) {
          url.searchParams.set('types', types)
        }

        const data = await fetchWithoutProxy(url.toString())

        if (data.status !== '1' || !data.pois) {
          console.error('[MCP Client] POI search failed:', data.info)
          return null
        }

        return {
          count: parseInt(data.count || '0'),
          pois: data.pois,
        }
      } catch (error) {
        console.error('[MCP Client] Error searching POI:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('POI_SEARCH', params, fetchPOI)
    }
    return fetchPOI()
  }

  /**
   * 搜索指定坐标周边的 POI
   * @param location 中心点坐标 "lng,lat"
   * @param keywords 搜索关键词（可选）
   * @param types POI 类型代码（可选）
   * @param radius 搜索半径（米），默认 1000
   * @param pageSize 返回数量
   */
  async searchNearby(params: {
    location: string
    keywords?: string
    types?: string
    radius?: number
    pageSize?: number
  }): Promise<POISearchResult | null> {
    const fetchNearby = async (): Promise<POISearchResult | null> => {
      try {
        const {
          location,
          keywords = '',
          types = '',
          radius = 1000,
          pageSize = 20,
        } = params

        const url = new URL('https://restapi.amap.com/v3/place/around')
        url.searchParams.set('location', location)
        url.searchParams.set('key', this.apiKey)
        url.searchParams.set('radius', radius.toString())
        url.searchParams.set('offset', pageSize.toString())
        url.searchParams.set('extensions', 'all')

        if (keywords) {
          url.searchParams.set('keywords', keywords)
        }
        if (types) {
          url.searchParams.set('types', types)
        }

        const data = await fetchWithoutProxy(url.toString())

        if (data.status !== '1' || !data.pois) {
          console.error('[MCP Client] Nearby search failed:', data.info)
          return null
        }

        return {
          count: parseInt(data.count || '0'),
          pois: data.pois,
        }
      } catch (error) {
        console.error('[MCP Client] Error searching nearby:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('NEARBY_SEARCH', params, fetchNearby)
    }
    return fetchNearby()
  }

  // --------------------------------------------------------------------------
  // 路线规划
  // --------------------------------------------------------------------------

  /**
   * 获取驾车路线规划
   * @param origin 起点坐标 "lng,lat"
   * @param destination 终点坐标 "lng,lat"
   * @param strategy 路线策略（0-速度优先，1-费用优先，2-距离优先）
   */
  async getDrivingRoute(
    origin: string,
    destination: string,
    strategy: number = 0
  ): Promise<RouteResult | null> {
    const fetchRoute = async (): Promise<RouteResult | null> => {
      try {
        const url = new URL('https://restapi.amap.com/v3/direction/driving')
        url.searchParams.set('origin', origin)
        url.searchParams.set('destination', destination)
        url.searchParams.set('key', this.apiKey)
        url.searchParams.set('strategy', strategy.toString())
        url.searchParams.set('extensions', 'all')

        const data = await fetchWithoutProxy(url.toString())

        if (
          data.status !== '1' ||
          !data.route ||
          !data.route.paths ||
          data.route.paths.length === 0
        ) {
          console.error('[MCP Client] Driving route failed:', data.info)
          return null
        }

        const path = data.route.paths[0]

        return {
          origin,
          destination,
          distance: parseInt(path.distance || '0'),
          duration: parseInt(path.duration || '0'),
          taxi_cost: parseFloat(path.taxi_cost || '0'),
          polyline: path.polyline,
          steps: path.steps?.map((step: any) => ({
            instruction: step.instruction,
            road: step.road,
            distance: parseInt(step.distance || '0'),
            duration: parseInt(step.duration || '0'),
          })),
        }
      } catch (error) {
        console.error('[MCP Client] Error getting driving route:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('ROUTE', { type: 'driving', origin, destination, strategy }, fetchRoute)
    }
    return fetchRoute()
  }

  /**
   * 获取步行路线规划
   * @param origin 起点坐标 "lng,lat"
   * @param destination 终点坐标 "lng,lat"
   */
  async getWalkingRoute(
    origin: string,
    destination: string
  ): Promise<RouteResult | null> {
    const fetchRoute = async (): Promise<RouteResult | null> => {
      try {
        const url = new URL('https://restapi.amap.com/v3/direction/walking')
        url.searchParams.set('origin', origin)
        url.searchParams.set('destination', destination)
        url.searchParams.set('key', this.apiKey)

        const data = await fetchWithoutProxy(url.toString())

        if (
          data.status !== '1' ||
          !data.route ||
          !data.route.paths ||
          data.route.paths.length === 0
        ) {
          console.error('[MCP Client] Walking route failed:', data.info)
          return null
        }

        const path = data.route.paths[0]

        return {
          origin,
          destination,
          distance: parseInt(path.distance || '0'),
          duration: parseInt(path.duration || '0'),
          steps: path.steps?.map((step: any) => ({
            instruction: step.instruction,
            road: step.road || '',
            distance: parseInt(step.distance || '0'),
            duration: parseInt(step.duration || '0'),
          })),
        }
      } catch (error) {
        console.error('[MCP Client] Error getting walking route:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('ROUTE', { type: 'walking', origin, destination }, fetchRoute)
    }
    return fetchRoute()
  }

  /**
   * 获取公交/地铁换乘路线
   * @param origin 起点坐标 "lng,lat"
   * @param destination 终点坐标 "lng,lat"
   * @param city 城市名称
   */
  async getTransitRoute(
    origin: string,
    destination: string,
    city: string
  ): Promise<RouteResult | null> {
    const fetchRoute = async (): Promise<RouteResult | null> => {
      try {
        const url = new URL('https://restapi.amap.com/v3/direction/transit/integrated')
        url.searchParams.set('origin', origin)
        url.searchParams.set('destination', destination)
        url.searchParams.set('city', city)
        url.searchParams.set('key', this.apiKey)

        const data = await fetchWithoutProxy(url.toString())

        if (
          data.status !== '1' ||
          !data.route ||
          !data.route.transits ||
          data.route.transits.length === 0
        ) {
          console.error('[MCP Client] Transit route failed:', data.info)
          return null
        }

        const transit = data.route.transits[0]

        return {
          origin,
          destination,
          distance: parseInt(transit.distance || '0'),
          duration: parseInt(transit.duration || '0'),
        }
      } catch (error) {
        console.error('[MCP Client] Error getting transit route:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('ROUTE', { type: 'transit', origin, destination, city }, fetchRoute)
    }
    return fetchRoute()
  }

  // --------------------------------------------------------------------------
  // 地理编码
  // --------------------------------------------------------------------------

  /**
   * 地理编码：将地址转换为坐标
   * @param address 地址
   * @param city 城市名称（可选，提高精度）
   */
  async geocode(
    address: string,
    city?: string
  ): Promise<GeocodeResult | null> {
    const fetchGeocode = async (): Promise<GeocodeResult | null> => {
      try {
        const url = new URL('https://restapi.amap.com/v3/geocode/geo')
        url.searchParams.set('address', address)
        url.searchParams.set('key', this.apiKey)

        if (city) {
          url.searchParams.set('city', city)
        }

        const data = await fetchWithoutProxy(url.toString())

        if (
          data.status !== '1' ||
          !data.geocodes ||
          data.geocodes.length === 0
        ) {
          console.error('[MCP Client] Geocode failed:', data.info)
          return null
        }

        const geocode = data.geocodes[0]

        return {
          formatted_address: geocode.formatted_address,
          location: geocode.location,
          level: geocode.level,
          adcode: geocode.adcode,
          city: geocode.city,
          district: geocode.district,
        }
      } catch (error) {
        console.error('[MCP Client] Error geocoding:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('GEOCODE', { address, city }, fetchGeocode)
    }
    return fetchGeocode()
  }

  /**
   * 逆地理编码：将坐标转换为地址
   * @param location 坐标 "lng,lat"
   */
  async reverseGeocode(location: string): Promise<GeocodeResult | null> {
    const fetchReverseGeocode = async (): Promise<GeocodeResult | null> => {
      try {
        const url = new URL('https://restapi.amap.com/v3/geocode/regeo')
        url.searchParams.set('location', location)
        url.searchParams.set('key', this.apiKey)

        const data = await fetchWithoutProxy(url.toString())

        if (data.status !== '1' || !data.regeocode) {
          console.error('[MCP Client] Reverse geocode failed:', data.info)
          return null
        }

        const regeocode = data.regeocode
        const addressComponent = regeocode.addressComponent

        return {
          formatted_address: regeocode.formatted_address,
          location,
          level: 'POI',
          adcode: addressComponent.adcode,
          city: addressComponent.city,
          district: addressComponent.district,
        }
      } catch (error) {
        console.error('[MCP Client] Error reverse geocoding:', error)
        return null
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('GEOCODE', { type: 'reverse', location }, fetchReverseGeocode)
    }
    return fetchReverseGeocode()
  }

  // --------------------------------------------------------------------------
  // 距离计算
  // --------------------------------------------------------------------------

  /**
   * 计算两点间的距离
   * @param origins 起点坐标列表 "lng,lat|lng,lat"
   * @param destinations 终点坐标列表 "lng,lat|lng,lat"
   * @param type 距离类型（0-直线距离，1-驾车导航距离）
   */
  async calculateDistance(
    origins: string,
    destinations: string,
    type: 0 | 1 = 1
  ): Promise<DistanceResult[]> {
    const fetchDistance = async (): Promise<DistanceResult[]> => {
      try {
        const url = new URL('https://restapi.amap.com/v3/distance')
        url.searchParams.set('origins', origins)
        url.searchParams.set('destination', destinations)
        url.searchParams.set('type', type.toString())
        url.searchParams.set('key', this.apiKey)

        const data = await fetchWithoutProxy(url.toString())

        if (data.status !== '1' || !data.results) {
          console.error('[MCP Client] Distance calculation failed:', data.info)
          return []
        }

        const originList = origins.split('|')

        return data.results.map((result: any, index: number) => ({
          origin: originList[index] || '',
          destination: destinations,
          distance: parseInt(result.distance || '0'),
          duration: result.duration ? parseInt(result.duration) : undefined,
        }))
      } catch (error) {
        console.error('[MCP Client] Error calculating distance:', error)
        return []
      }
    }

    // 使用缓存包装
    if (this.enableCache) {
      return withCache('DISTANCE', { origins, destinations, type }, fetchDistance)
    }
    return fetchDistance()
  }
}

// ============================================================================
// 导出单例实例
// ============================================================================

/**
 * 全局 MCP 客户端实例（单例）
 */
let mcpClientInstance: MCPClient | null = null

/**
 * 获取 MCP 客户端实例
 * @param options 可选配置（apiKey, enableCache）
 */
export function getMCPClient(options?: { apiKey?: string; enableCache?: boolean }): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient(options)
  }
  return mcpClientInstance
}

/**
 * 重置 MCP 客户端（用于测试）
 */
export function resetMCPClient(): void {
  mcpClientInstance = null
}

/**
 * 默认导出
 */
export default MCPClient
