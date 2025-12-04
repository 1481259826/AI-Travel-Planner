/**
 * MCP 数据转换器
 *
 * 将高德官方 MCP 服务返回的数据格式转换为项目内部使用的格式
 * 保持与现有 MCPClient 接口的兼容性
 */

import type {
  WeatherForecastResult,
  POI,
  POISearchResult,
  RouteResult,
  RouteStep,
  GeocodeResult,
  DistanceResult,
} from './mcp-client'

// ============================================================================
// 天气数据转换
// ============================================================================

/**
 * 官方 MCP 天气响应格式
 */
export interface OfficialWeatherResponse {
  forecasts?: Array<{
    city?: string
    adcode?: string
    province?: string
    reporttime?: string
    casts?: Array<{
      date?: string
      week?: string
      dayweather?: string
      nightweather?: string
      daytemp?: string
      nighttemp?: string
      daywind?: string
      nightwind?: string
      daypower?: string
      nightpower?: string
    }>
  }>
}

/**
 * 转换天气数据
 */
export function transformWeatherResponse(
  data: OfficialWeatherResponse | null
): WeatherForecastResult | null {
  if (!data || !data.forecasts || data.forecasts.length === 0) {
    return null
  }

  const forecast = data.forecasts[0]

  return {
    city: forecast.city || '',
    adcode: forecast.adcode || '',
    province: forecast.province || '',
    reporttime: forecast.reporttime || '',
    forecasts: (forecast.casts || []).map((cast) => ({
      date: cast.date || '',
      week: cast.week || '',
      dayweather: cast.dayweather || '',
      nightweather: cast.nightweather || '',
      daytemp: cast.daytemp || '',
      nighttemp: cast.nighttemp || '',
      daywind: cast.daywind || '',
      nightwind: cast.nightwind || '',
      daypower: cast.daypower || '',
      nightpower: cast.nightpower || '',
    })),
  }
}

// ============================================================================
// POI 数据转换
// ============================================================================

/**
 * 官方 MCP POI 响应格式
 */
export interface OfficialPOIResponse {
  pois?: Array<{
    id?: string
    name?: string
    type?: string
    typecode?: string
    address?: string | string[]
    location?: string
    tel?: string | string[]
    photos?: Array<{ url?: string }> | string[]
    biz_ext?: {
      rating?: string
    }
  }>
  suggestion?: any
  count?: string | number
}

/**
 * 单个 POI 类型
 */
type OfficialPOI = NonNullable<OfficialPOIResponse['pois']>[number]

/**
 * 转换单个 POI
 */
export function transformPOI(poi: OfficialPOI): POI {
  // 处理地址（可能是字符串或数组）
  let address = ''
  if (typeof poi.address === 'string') {
    address = poi.address
  } else if (Array.isArray(poi.address) && poi.address.length > 0) {
    address = poi.address[0]
  }

  // 处理电话
  let tel: string | undefined
  if (typeof poi.tel === 'string' && poi.tel) {
    tel = poi.tel
  } else if (Array.isArray(poi.tel) && poi.tel.length > 0) {
    tel = poi.tel[0]
  }

  // 处理照片
  let photos: string[] | undefined
  if (Array.isArray(poi.photos) && poi.photos.length > 0) {
    photos = poi.photos.map((p: { url?: string } | string) => {
      if (typeof p === 'string') return p
      return p.url || ''
    }).filter(Boolean)
  }

  return {
    id: poi.id || '',
    name: poi.name || '',
    type: poi.type || '',
    typecode: poi.typecode || '',
    address,
    location: poi.location || '',
    tel,
    photos,
    rating: poi.biz_ext?.rating,
  }
}

/**
 * 转换 POI 搜索结果
 */
export function transformPOISearchResponse(
  data: OfficialPOIResponse | null
): POISearchResult | null {
  if (!data || !data.pois) {
    return null
  }

  return {
    count:
      typeof data.count === 'string'
        ? parseInt(data.count, 10)
        : data.count || 0,
    pois: data.pois.map(transformPOI),
  }
}

// ============================================================================
// 路线数据转换
// ============================================================================

/**
 * 官方 MCP 驾车/步行路线响应格式
 */
export interface OfficialRouteResponse {
  origin?: string
  destination?: string
  paths?: Array<{
    distance?: string | number
    duration?: string | number
    taxi_cost?: string | number
    polyline?: string
    steps?: Array<{
      instruction?: string
      road?: string
      distance?: string | number
      duration?: string | number
    }>
  }>
  distance?: string | number
  duration?: string | number
  steps?: Array<{
    instruction?: string
    road?: string
    distance?: string | number
    duration?: string | number
  }>
}

/**
 * 官方 MCP 公交路线响应格式
 */
export interface OfficialTransitResponse {
  origin?: string
  destination?: string
  distance?: string | number
  transits?: Array<{
    duration?: string | number
    walking_distance?: string | number
    segments?: any[]
  }>
}

/**
 * 转换路线步骤
 */
function transformRouteStep(step: any): RouteStep {
  return {
    instruction: step.instruction || '',
    road: step.road || '',
    distance: parseNumber(step.distance),
    duration: parseNumber(step.duration),
  }
}

/**
 * 转换驾车/步行路线
 */
export function transformRouteResponse(
  data: OfficialRouteResponse | null,
  origin?: string,
  destination?: string
): RouteResult | null {
  if (!data) {
    return null
  }

  // 优先使用 paths 数组中的第一个路径
  if (data.paths && data.paths.length > 0) {
    const path = data.paths[0]
    return {
      origin: data.origin || origin || '',
      destination: data.destination || destination || '',
      distance: parseNumber(path.distance),
      duration: parseNumber(path.duration),
      taxi_cost: path.taxi_cost ? parseNumber(path.taxi_cost) : undefined,
      polyline: path.polyline,
      steps: path.steps?.map(transformRouteStep),
    }
  }

  // 某些接口直接返回 distance/duration
  return {
    origin: data.origin || origin || '',
    destination: data.destination || destination || '',
    distance: parseNumber(data.distance),
    duration: parseNumber(data.duration),
    steps: data.steps?.map(transformRouteStep),
  }
}

/**
 * 转换公交路线
 */
export function transformTransitResponse(
  data: OfficialTransitResponse | null,
  origin?: string,
  destination?: string
): RouteResult | null {
  if (!data || !data.transits || data.transits.length === 0) {
    return null
  }

  const transit = data.transits[0]

  return {
    origin: data.origin || origin || '',
    destination: data.destination || destination || '',
    distance: parseNumber(data.distance),
    duration: parseNumber(transit.duration),
  }
}

// ============================================================================
// 地理编码数据转换
// ============================================================================

/**
 * 官方 MCP 地理编码响应格式
 */
export interface OfficialGeocodeResponse {
  location?: string
  formatted_address?: string
  level?: string
  adcode?: string
  city?: string | string[]
  district?: string | string[]
  province?: string
}

/**
 * 官方 MCP 逆地理编码响应格式
 */
export interface OfficialRegeoResponse {
  formatted_address?: string
  addressComponent?: {
    province?: string
    city?: string | string[]
    district?: string | string[]
    adcode?: string
    township?: string
    streetNumber?: {
      street?: string
      number?: string
    }
  }
}

/**
 * 转换地理编码结果
 */
export function transformGeocodeResponse(
  data: OfficialGeocodeResponse | null
): GeocodeResult | null {
  if (!data || !data.location) {
    return null
  }

  return {
    formatted_address: data.formatted_address || '',
    location: data.location,
    level: data.level || '',
    adcode: data.adcode || '',
    city: extractFirstString(data.city),
    district: extractFirstString(data.district),
  }
}

/**
 * 转换逆地理编码结果
 */
export function transformRegeoResponse(
  data: OfficialRegeoResponse | null,
  location: string
): GeocodeResult | null {
  if (!data || !data.formatted_address) {
    return null
  }

  const addr = data.addressComponent

  return {
    formatted_address: data.formatted_address,
    location,
    level: 'POI',
    adcode: addr?.adcode || '',
    city: extractFirstString(addr?.city),
    district: extractFirstString(addr?.district),
  }
}

// ============================================================================
// 距离数据转换
// ============================================================================

/**
 * 官方 MCP 距离响应格式
 */
export interface OfficialDistanceResponse {
  origin_id?: string
  dest_id?: string
  distance?: string | number
  duration?: string | number
}

/**
 * 转换距离计算结果
 */
export function transformDistanceResponse(
  data: OfficialDistanceResponse | OfficialDistanceResponse[] | null,
  origin: string,
  destination: string
): DistanceResult[] {
  if (!data) {
    return []
  }

  // 如果是数组
  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      origin: item.origin_id || origin.split('|')[index] || origin,
      destination: item.dest_id || destination,
      distance: parseNumber(item.distance),
      duration: item.duration ? parseNumber(item.duration) : undefined,
    }))
  }

  // 单个结果
  return [
    {
      origin: data.origin_id || origin,
      destination: data.dest_id || destination,
      distance: parseNumber(data.distance),
      duration: data.duration ? parseNumber(data.duration) : undefined,
    },
  ]
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 安全解析数字
 */
function parseNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseInt(value, 10) || 0
  return 0
}

/**
 * 从字符串或数组中提取第一个字符串
 */
function extractFirstString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return ''
}
