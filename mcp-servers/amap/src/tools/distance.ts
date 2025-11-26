/**
 * 距离计算工具
 * 计算两点之间的距离（直线/驾车/步行）
 */

import { httpGet, buildUrl, AMAP_ENDPOINTS } from '../utils/http.js'
import { formatDistance, formatDuration } from '../utils/transform.js'
import type { AmapDistanceResponse, DistanceParams, DistanceResult } from '../types.js'

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
 * 距离计算类型
 */
export const DISTANCE_TYPES = {
  0: '直线距离',
  1: '驾车导航距离',
  3: '步行规划距离',
} as const

/**
 * 计算两点之间的距离
 * @param params 计算参数
 * @returns 距离结果
 */
export async function calculateDistance(params: DistanceParams): Promise<DistanceResult[]> {
  const apiKey = getApiKey()
  const { origins, destination, type = 1 } = params

  const url = buildUrl(AMAP_ENDPOINTS.distance, {
    key: apiKey,
    origins,
    destination,
    type,
  })

  try {
    const response = await httpGet<AmapDistanceResponse>(url)

    if (response.status !== '1') {
      console.error('Distance calculation error:', response.info)
      return []
    }

    return response.results || []
  } catch (error) {
    console.error('Error calculating distance:', error)
    return []
  }
}

/**
 * 批量计算多个起点到一个终点的距离
 * @param origins 起点坐标数组
 * @param destination 终点坐标
 * @param type 距离类型
 * @returns 距离结果数组
 */
export async function batchCalculateDistance(
  origins: string[],
  destination: string,
  type: 0 | 1 | 3 = 1
): Promise<DistanceResult[]> {
  // 高德 API 支持一次最多 100 个起点
  const maxOriginsPerRequest = 100
  const results: DistanceResult[] = []

  for (let i = 0; i < origins.length; i += maxOriginsPerRequest) {
    const batch = origins.slice(i, i + maxOriginsPerRequest)
    const batchResults = await calculateDistance({
      origins: batch.join('|'),
      destination,
      type,
    })
    results.push(...batchResults)
  }

  return results
}

/**
 * MCP 工具定义 - 距离计算
 */
export const distanceToolDefinition = {
  name: 'calculate_distance',
  description: '计算两点或多点之间的距离（直线距离、驾车距离或步行距离）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      origins: {
        type: 'string',
        description:
          '起点坐标，格式为 "经度,纬度"。支持多个起点，用 "|" 分隔（如：116.397428,39.90923|116.494722,39.925539）',
      },
      destination: {
        type: 'string',
        description: '终点坐标，格式为 "经度,纬度"',
      },
      type: {
        type: 'number',
        enum: [0, 1, 3],
        description: '距离类型：0=直线距离，1=驾车距离（默认），3=步行距离',
        default: 1,
      },
    },
    required: ['origins', 'destination'],
  },
}

/**
 * MCP 工具处理函数 - 距离计算
 */
export async function handleDistanceTool(args: DistanceParams): Promise<string> {
  const results = await calculateDistance(args)

  if (results.length === 0) {
    return JSON.stringify({
      error: true,
      message: '无法计算距离，请检查坐标是否正确',
    })
  }

  const typeDescription = DISTANCE_TYPES[args.type || 1]

  // 解析起点坐标
  const originCoords = args.origins.split('|')

  const formattedResults = results.map((result, index) => ({
    origin_index: index,
    origin: originCoords[index] || result.origin_id,
    destination: args.destination,
    distance: formatDistance(result.distance),
    distance_meters: parseInt(result.distance),
    duration: result.duration ? formatDuration(result.duration) : undefined,
    duration_seconds: result.duration ? parseInt(result.duration) : undefined,
  }))

  return JSON.stringify(
    {
      type: typeDescription,
      destination: args.destination,
      results: formattedResults,
    },
    null,
    2
  )
}

/**
 * 找出最近的点
 * @param origins 起点坐标数组
 * @param destination 终点坐标
 * @param type 距离类型
 * @returns 最近点的索引和距离
 */
export async function findNearest(
  origins: string[],
  destination: string,
  type: 0 | 1 | 3 = 1
): Promise<{ index: number; origin: string; distance: number; duration?: number } | null> {
  const results = await batchCalculateDistance(origins, destination, type)

  if (results.length === 0) {
    return null
  }

  let nearestIndex = 0
  let nearestDistance = parseInt(results[0].distance)

  for (let i = 1; i < results.length; i++) {
    const distance = parseInt(results[i].distance)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = i
    }
  }

  return {
    index: nearestIndex,
    origin: origins[nearestIndex],
    distance: nearestDistance,
    duration: results[nearestIndex].duration
      ? parseInt(results[nearestIndex].duration)
      : undefined,
  }
}

/**
 * 按距离排序
 * @param origins 起点坐标数组
 * @param destination 终点坐标
 * @param type 距离类型
 * @returns 按距离排序的结果
 */
export async function sortByDistance(
  origins: string[],
  destination: string,
  type: 0 | 1 | 3 = 1
): Promise<Array<{ index: number; origin: string; distance: number; duration?: number }>> {
  const results = await batchCalculateDistance(origins, destination, type)

  if (results.length === 0) {
    return []
  }

  return results
    .map((result, index) => ({
      index,
      origin: origins[index],
      distance: parseInt(result.distance),
      duration: result.duration ? parseInt(result.duration) : undefined,
    }))
    .sort((a, b) => a.distance - b.distance)
}
