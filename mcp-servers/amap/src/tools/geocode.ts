/**
 * 地理编码工具
 * 地址 -> 坐标（地理编码）
 * 坐标 -> 地址（逆地理编码）
 */

import { httpGet, buildUrl, AMAP_ENDPOINTS } from '../utils/http.js'
import {
  transformGeocodeResponse,
  transformReverseGeocodeResponse,
} from '../utils/transform.js'
import type {
  AmapGeocodeResponse,
  AmapReverseGeocodeResponse,
  GeocodeParams,
  ReverseGeocodeParams,
  GeocodeResult,
  ReverseGeocodeResult,
} from '../types.js'

/**
 * 获取 API Key
 */
function getApiKey(): string {
  const apiKey = process.env.AMAP_API_KEY || process.env.AMAP_WEB_SERVICE_KEY
  if (!apiKey) {
    throw new Error('AMAP_API_KEY or AMAP_WEB_SERVICE_KEY environment variable is required')
  }
  return apiKey
}

/**
 * 地理编码（地址 -> 坐标）
 * @param params 查询参数
 * @returns 地理编码结果
 */
export async function geocode(params: GeocodeParams): Promise<GeocodeResult[]> {
  const apiKey = getApiKey()
  const { address, city } = params

  const url = buildUrl(AMAP_ENDPOINTS.geocode, {
    key: apiKey,
    address,
    city,
  })

  try {
    const response = await httpGet<AmapGeocodeResponse>(url)

    if (response.status !== '1') {
      console.error('Geocode error:', response.info)
      return []
    }

    return transformGeocodeResponse(response)
  } catch (error) {
    console.error('Error geocoding:', error)
    return []
  }
}

/**
 * 逆地理编码（坐标 -> 地址）
 * @param params 查询参数
 * @returns 逆地理编码结果
 */
export async function reverseGeocode(
  params: ReverseGeocodeParams
): Promise<ReverseGeocodeResult | null> {
  const apiKey = getApiKey()
  const { location, extensions = 'base' } = params

  const url = buildUrl(AMAP_ENDPOINTS.reverseGeocode, {
    key: apiKey,
    location,
    extensions,
    radius: 1000,
    roadlevel: 1, // 显示附近道路
  })

  try {
    const response = await httpGet<AmapReverseGeocodeResponse>(url)

    if (response.status !== '1') {
      console.error('Reverse geocode error:', response.info)
      return null
    }

    return transformReverseGeocodeResponse(response)
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * MCP 工具定义 - 地理编码
 */
export const geocodeToolDefinition = {
  name: 'geocode',
  description: '地理编码：将地址转换为坐标（经纬度）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      address: {
        type: 'string',
        description: '地址（如：北京市朝阳区阜通东大街6号）',
      },
      city: {
        type: 'string',
        description: '城市名称（可选，用于提高精度）',
      },
    },
    required: ['address'],
  },
}

/**
 * MCP 工具定义 - 逆地理编码
 */
export const reverseGeocodeToolDefinition = {
  name: 'reverse_geocode',
  description: '逆地理编码：将坐标（经纬度）转换为地址',
  inputSchema: {
    type: 'object' as const,
    properties: {
      location: {
        type: 'string',
        description: '坐标，格式为 "经度,纬度"（如：116.397428,39.90923）',
      },
      extensions: {
        type: 'string',
        enum: ['base', 'all'],
        description: '返回数据详细程度：base=基础地址，all=包含周边 POI',
        default: 'base',
      },
    },
    required: ['location'],
  },
}

/**
 * MCP 工具处理函数 - 地理编码
 */
export async function handleGeocodeTool(args: GeocodeParams): Promise<string> {
  const results = await geocode(args)

  if (results.length === 0) {
    return JSON.stringify({
      error: true,
      message: `无法解析地址 "${args.address}"，请检查地址是否正确`,
    })
  }

  // 返回第一个最匹配的结果
  const result = results[0]

  return JSON.stringify(
    {
      address: args.address,
      location: result.location,
      formatted_address: result.formatted_address,
      province: result.province,
      city: result.city,
      district: result.district,
      street: result.street || undefined,
      number: result.number || undefined,
      adcode: result.adcode,
      level: result.level,
    },
    null,
    2
  )
}

/**
 * MCP 工具处理函数 - 逆地理编码
 */
export async function handleReverseGeocodeTool(args: ReverseGeocodeParams): Promise<string> {
  const result = await reverseGeocode(args)

  if (!result) {
    return JSON.stringify({
      error: true,
      message: `无法解析坐标 "${args.location}"，请检查坐标是否正确`,
    })
  }

  // 根据 extensions 参数返回不同详细程度的结果
  const output: Record<string, unknown> = {
    location: args.location,
    formatted_address: result.formatted_address,
    province: result.province,
    city: result.city,
    district: result.district,
    township: result.township,
    adcode: result.adcode,
  }

  // 添加街道信息
  if (result.streetNumber?.street) {
    output.street = result.streetNumber.street
    output.number = result.streetNumber.number
  }

  // 如果是 all 模式，添加周边 POI
  if (args.extensions === 'all' && result.pois?.length) {
    output.nearby_pois = result.pois.slice(0, 5).map((poi) => ({
      name: poi.name,
      type: poi.type,
      distance: poi.distance ? `${poi.distance}米` : undefined,
      address: poi.address,
    }))
  }

  return JSON.stringify(output, null, 2)
}

/**
 * 智能地理编码
 * 支持地址或 POI 名称，自动尝试多种解析方式
 */
export async function smartGeocode(
  query: string,
  city?: string
): Promise<{ location: string; name: string } | null> {
  // 首先尝试普通地理编码
  const geocodeResults = await geocode({ address: query, city })

  if (geocodeResults.length > 0) {
    return {
      location: geocodeResults[0].location,
      name: geocodeResults[0].formatted_address,
    }
  }

  // 如果普通地理编码失败，尝试 POI 搜索
  // 这里只返回 null，因为 POI 搜索需要导入 poi 模块
  // 实际使用时可以在外部组合调用
  return null
}
