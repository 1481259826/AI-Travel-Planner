/**
 * POI 搜索工具
 * 使用高德 POI 搜索 API (v5)
 */

import { httpGet, buildUrl, AMAP_ENDPOINTS } from '../utils/http.js'
import { transformPOIResponse } from '../utils/transform.js'
import type {
  AmapPOIResponse,
  POIInfo,
  POISearchParams,
  NearbySearchParams,
  POISearchResult,
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
 * 关键词搜索 POI
 * @param params 搜索参数
 * @returns POI 列表
 */
export async function searchPOI(params: POISearchParams): Promise<POISearchResult> {
  const apiKey = getApiKey()
  const {
    keywords,
    city,
    types,
    city_limit = false,
    page_size = 20,
    page = 1,
    extensions = 'all',
  } = params

  // 构建请求 URL（使用 v5 API）
  const url = buildUrl(AMAP_ENDPOINTS.poiSearch, {
    key: apiKey,
    keywords,
    region: city,
    types,
    city_limit: city_limit ? 'true' : 'false',
    page_size,
    page_num: page,
    show_fields: extensions === 'all' ? 'photos,rating,cost,opentime' : '',
    extensions,
  })

  try {
    const response = await httpGet<AmapPOIResponse>(url)

    if (response.status !== '1') {
      console.error('POI search error:', response.info)
      return { count: 0, pois: [] }
    }

    const pois = transformPOIResponse(response)

    return {
      count: parseInt(response.count) || 0,
      pois,
    }
  } catch (error) {
    console.error('Error searching POI:', error)
    return { count: 0, pois: [] }
  }
}

/**
 * 周边搜索 POI
 * @param params 搜索参数
 * @returns POI 列表
 */
export async function searchNearby(params: NearbySearchParams): Promise<POISearchResult> {
  const apiKey = getApiKey()
  const {
    location,
    keywords,
    types,
    radius = 1000,
    page_size = 20,
    page = 1,
    extensions = 'all',
  } = params

  // 构建请求 URL（使用 v5 API）
  const url = buildUrl(AMAP_ENDPOINTS.poiAround, {
    key: apiKey,
    location,
    keywords,
    types,
    radius,
    page_size,
    page_num: page,
    show_fields: extensions === 'all' ? 'photos,rating,cost,opentime,distance' : '',
    extensions,
    sortrule: 'distance', // 按距离排序
  })

  try {
    const response = await httpGet<AmapPOIResponse>(url)

    if (response.status !== '1') {
      console.error('Nearby search error:', response.info)
      return { count: 0, pois: [] }
    }

    const pois = transformPOIResponse(response)

    return {
      count: parseInt(response.count) || 0,
      pois,
    }
  } catch (error) {
    console.error('Error searching nearby:', error)
    return { count: 0, pois: [] }
  }
}

/**
 * MCP 工具定义 - POI 搜索
 */
export const poiSearchToolDefinition = {
  name: 'search_poi',
  description: '关键词搜索 POI 地点（景点、酒店、餐厅等）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      keywords: {
        type: 'string',
        description: '搜索关键词（如：西湖、希尔顿酒店、火锅）',
      },
      city: {
        type: 'string',
        description: '城市名称（如：杭州、北京）',
      },
      types: {
        type: 'string',
        description: 'POI 类型代码（如：110000-旅游景点，050000-餐饮，100000-住宿）',
      },
      city_limit: {
        type: 'boolean',
        description: '是否仅在指定城市搜索，默认 false',
        default: false,
      },
      page_size: {
        type: 'number',
        description: '每页返回数量，最大 25，默认 20',
        default: 20,
      },
      page: {
        type: 'number',
        description: '页码，从 1 开始，默认 1',
        default: 1,
      },
    },
    required: ['keywords'],
  },
}

/**
 * MCP 工具定义 - 周边搜索
 */
export const nearbySearchToolDefinition = {
  name: 'search_nearby',
  description: '搜索指定坐标周边的 POI 地点',
  inputSchema: {
    type: 'object' as const,
    properties: {
      location: {
        type: 'string',
        description: '中心点坐标，格式为 "经度,纬度"（如：116.397428,39.90923）',
      },
      keywords: {
        type: 'string',
        description: '搜索关键词',
      },
      types: {
        type: 'string',
        description: 'POI 类型代码',
      },
      radius: {
        type: 'number',
        description: '搜索半径，单位：米，默认 1000，最大 50000',
        default: 1000,
      },
      page_size: {
        type: 'number',
        description: '每页返回数量，默认 20',
        default: 20,
      },
    },
    required: ['location'],
  },
}

/**
 * 格式化 POI 输出
 */
function formatPOIOutput(poi: POIInfo): Record<string, unknown> {
  return {
    id: poi.id,
    name: poi.name,
    type: poi.type,
    address: poi.address,
    location: poi.location,
    tel: poi.tel || undefined,
    rating: poi.rating || undefined,
    cost: poi.cost ? `人均 ¥${poi.cost}` : undefined,
    opentime: poi.opentime || undefined,
    distance: poi.distance ? `${poi.distance}米` : undefined,
    photos: poi.photos?.length ? poi.photos.map((p) => p.url) : undefined,
    cityname: poi.cityname,
    adname: poi.adname,
  }
}

/**
 * MCP 工具处理函数 - POI 搜索
 */
export async function handlePOISearchTool(args: POISearchParams): Promise<string> {
  const result = await searchPOI(args)

  if (result.count === 0) {
    return JSON.stringify({
      error: false,
      message: `未找到与 "${args.keywords}" 相关的地点`,
      count: 0,
      pois: [],
    })
  }

  return JSON.stringify(
    {
      count: result.count,
      pois: result.pois.map(formatPOIOutput),
    },
    null,
    2
  )
}

/**
 * MCP 工具处理函数 - 周边搜索
 */
export async function handleNearbySearchTool(args: NearbySearchParams): Promise<string> {
  const result = await searchNearby(args)

  if (result.count === 0) {
    return JSON.stringify({
      error: false,
      message: `在 ${args.location} 周围 ${args.radius || 1000} 米范围内未找到相关地点`,
      count: 0,
      pois: [],
    })
  }

  return JSON.stringify(
    {
      count: result.count,
      pois: result.pois.map(formatPOIOutput),
    },
    null,
    2
  )
}
