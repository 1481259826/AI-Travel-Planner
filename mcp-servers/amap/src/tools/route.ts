/**
 * 路线规划工具
 * 支持驾车、步行、公交路线规划
 */

import { httpGet, buildUrl, AMAP_ENDPOINTS } from '../utils/http.js'
import { formatDistance, formatDuration } from '../utils/transform.js'
import type {
  AmapDrivingResponse,
  AmapWalkingResponse,
  RouteParams,
  DrivingRoute,
  WalkingRoute,
  RouteResult,
  CoordinateString,
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
 * 驾车路线策略
 */
export const DRIVING_STRATEGIES = {
  0: '速度优先（时间最短）',
  1: '费用优先（不走收费路段）',
  2: '距离优先（距离最短）',
  3: '速度优先，不走高速',
  4: '躲避拥堵',
  5: '多策略综合（不走高速）',
  6: '速度优先，不走高速且避免收费',
  7: '费用优先，不走高速',
  8: '躲避拥堵且不走高速',
  9: '躲避拥堵且避免收费',
} as const

/**
 * 获取驾车路线
 */
export async function getDrivingRoute(
  params: RouteParams
): Promise<RouteResult<DrivingRoute> | null> {
  const apiKey = getApiKey()
  const { origin, destination, strategy = 0 } = params

  const url = buildUrl(AMAP_ENDPOINTS.drivingRoute, {
    key: apiKey,
    origin,
    destination,
    strategy,
    extensions: 'base',
  })

  try {
    const response = await httpGet<AmapDrivingResponse>(url)

    if (response.status !== '1') {
      console.error('Driving route error:', response.info)
      return null
    }

    const routes: DrivingRoute[] = response.route.paths.map((path) => ({
      distance: path.distance,
      duration: path.duration,
      tolls: path.tolls,
      toll_distance: path.toll_distance,
      traffic_lights: path.traffic_lights,
      steps: path.steps.map((step) => ({
        instruction: step.instruction,
        orientation: step.orientation,
        road: step.road,
        distance: step.distance,
        duration: step.duration,
        polyline: step.polyline,
      })),
    }))

    return {
      origin: response.route.origin,
      destination: response.route.destination,
      routes,
    }
  } catch (error) {
    console.error('Error getting driving route:', error)
    return null
  }
}

/**
 * 获取步行路线
 */
export async function getWalkingRoute(
  params: RouteParams
): Promise<RouteResult<WalkingRoute> | null> {
  const apiKey = getApiKey()
  const { origin, destination } = params

  const url = buildUrl(AMAP_ENDPOINTS.walkingRoute, {
    key: apiKey,
    origin,
    destination,
  })

  try {
    const response = await httpGet<AmapWalkingResponse>(url)

    if (response.status !== '1') {
      console.error('Walking route error:', response.info)
      return null
    }

    const routes: WalkingRoute[] = response.route.paths.map((path) => ({
      distance: path.distance,
      duration: path.duration,
      steps: path.steps.map((step) => ({
        instruction: step.instruction,
        orientation: step.orientation,
        road: step.road,
        distance: step.distance,
        duration: step.duration,
        polyline: step.polyline,
      })),
    }))

    return {
      origin: response.route.origin,
      destination: response.route.destination,
      routes,
    }
  } catch (error) {
    console.error('Error getting walking route:', error)
    return null
  }
}

/**
 * 公交路线响应类型
 */
interface AmapTransitResponse {
  status: string
  info: string
  infocode: string
  count: string
  route: {
    origin: CoordinateString
    destination: CoordinateString
    distance: string
    transits: Array<{
      cost: string
      duration: string
      walking_distance: string
      segments: Array<{
        walking?: {
          distance: string
          duration: string
          steps: Array<{
            instruction: string
            road: string
            distance: string
            polyline: string
          }>
        }
        bus?: {
          buslines: Array<{
            name: string
            type: string
            departure_stop: { name: string; location: string }
            arrival_stop: { name: string; location: string }
            via_num: string
            via_stops: Array<{ name: string; location: string }>
            distance: string
            duration: string
          }>
        }
      }>
    }>
  }
}

/**
 * 简化的公交路线结果
 */
interface TransitRouteSimple {
  cost: string
  duration: string
  walking_distance: string
  description: string
  steps: string[]
}

/**
 * 获取公交路线
 */
export async function getTransitRoute(
  params: RouteParams
): Promise<RouteResult<TransitRouteSimple> | null> {
  const apiKey = getApiKey()
  const { origin, destination, city } = params

  if (!city) {
    console.error('Transit route requires city parameter')
    return null
  }

  const url = buildUrl(AMAP_ENDPOINTS.transitRoute, {
    key: apiKey,
    origin,
    destination,
    city,
    strategy: 0, // 最快捷
    nightflag: 0,
  })

  try {
    const response = await httpGet<AmapTransitResponse>(url)

    if (response.status !== '1') {
      console.error('Transit route error:', response.info)
      return null
    }

    const routes: TransitRouteSimple[] = response.route.transits.slice(0, 3).map((transit) => {
      const steps: string[] = []
      let description = ''

      transit.segments.forEach((segment) => {
        if (segment.walking && parseInt(segment.walking.distance) > 0) {
          steps.push(`步行 ${formatDistance(segment.walking.distance)}`)
        }
        if (segment.bus?.buslines?.length) {
          const bus = segment.bus.buslines[0]
          steps.push(
            `乘坐 ${bus.name}，从 ${bus.departure_stop.name} 到 ${bus.arrival_stop.name}（${bus.via_num} 站）`
          )
          if (!description) {
            description = bus.name
          }
        }
      })

      return {
        cost: transit.cost,
        duration: transit.duration,
        walking_distance: transit.walking_distance,
        description: description || '公交方案',
        steps,
      }
    })

    return {
      origin: response.route.origin,
      destination: response.route.destination,
      routes,
    }
  } catch (error) {
    console.error('Error getting transit route:', error)
    return null
  }
}

/**
 * MCP 工具定义 - 驾车路线
 */
export const drivingRouteToolDefinition = {
  name: 'get_driving_route',
  description: '获取驾车路线规划，返回距离、时间、收费等信息',
  inputSchema: {
    type: 'object' as const,
    properties: {
      origin: {
        type: 'string',
        description: '起点坐标，格式为 "经度,纬度"',
      },
      destination: {
        type: 'string',
        description: '终点坐标，格式为 "经度,纬度"',
      },
      strategy: {
        type: 'number',
        description:
          '路线策略：0-速度优先，1-费用优先，2-距离优先，3-不走高速，4-躲避拥堵',
        default: 0,
      },
    },
    required: ['origin', 'destination'],
  },
}

/**
 * MCP 工具定义 - 步行路线
 */
export const walkingRouteToolDefinition = {
  name: 'get_walking_route',
  description: '获取步行路线规划',
  inputSchema: {
    type: 'object' as const,
    properties: {
      origin: {
        type: 'string',
        description: '起点坐标，格式为 "经度,纬度"',
      },
      destination: {
        type: 'string',
        description: '终点坐标，格式为 "经度,纬度"',
      },
    },
    required: ['origin', 'destination'],
  },
}

/**
 * MCP 工具定义 - 公交路线
 */
export const transitRouteToolDefinition = {
  name: 'get_transit_route',
  description: '获取公交/地铁换乘路线规划',
  inputSchema: {
    type: 'object' as const,
    properties: {
      origin: {
        type: 'string',
        description: '起点坐标，格式为 "经度,纬度"',
      },
      destination: {
        type: 'string',
        description: '终点坐标，格式为 "经度,纬度"',
      },
      city: {
        type: 'string',
        description: '城市名称（公交路线必填）',
      },
    },
    required: ['origin', 'destination', 'city'],
  },
}

/**
 * 格式化驾车路线输出
 */
function formatDrivingOutput(result: RouteResult<DrivingRoute>) {
  const route = result.routes[0]
  if (!route) return null

  return {
    origin: result.origin,
    destination: result.destination,
    distance: formatDistance(route.distance),
    duration: formatDuration(route.duration),
    tolls: route.tolls === '0' ? '免费' : `¥${route.tolls}`,
    toll_distance: formatDistance(route.toll_distance),
    traffic_lights: `${route.traffic_lights} 个红绿灯`,
    steps: route.steps.map((step) => ({
      instruction: step.instruction,
      road: step.road || undefined,
      distance: formatDistance(step.distance),
    })),
  }
}

/**
 * 格式化步行路线输出
 */
function formatWalkingOutput(result: RouteResult<WalkingRoute>) {
  const route = result.routes[0]
  if (!route) return null

  return {
    origin: result.origin,
    destination: result.destination,
    distance: formatDistance(route.distance),
    duration: formatDuration(route.duration),
    steps: route.steps.map((step) => ({
      instruction: step.instruction,
      road: step.road || undefined,
      distance: formatDistance(step.distance),
    })),
  }
}

/**
 * MCP 工具处理函数 - 驾车路线
 */
export async function handleDrivingRouteTool(args: RouteParams): Promise<string> {
  const result = await getDrivingRoute(args)

  if (!result) {
    return JSON.stringify({
      error: true,
      message: '无法获取驾车路线，请检查坐标是否正确',
    })
  }

  const formatted = formatDrivingOutput(result)
  return JSON.stringify(formatted, null, 2)
}

/**
 * MCP 工具处理函数 - 步行路线
 */
export async function handleWalkingRouteTool(args: RouteParams): Promise<string> {
  const result = await getWalkingRoute(args)

  if (!result) {
    return JSON.stringify({
      error: true,
      message: '无法获取步行路线，请检查坐标是否正确',
    })
  }

  const formatted = formatWalkingOutput(result)
  return JSON.stringify(formatted, null, 2)
}

/**
 * MCP 工具处理函数 - 公交路线
 */
export async function handleTransitRouteTool(args: RouteParams): Promise<string> {
  if (!args.city) {
    return JSON.stringify({
      error: true,
      message: '公交路线规划需要指定城市参数',
    })
  }

  const result = await getTransitRoute(args)

  if (!result || result.routes.length === 0) {
    return JSON.stringify({
      error: true,
      message: '无法获取公交路线，请检查坐标和城市是否正确',
    })
  }

  return JSON.stringify(
    {
      origin: result.origin,
      destination: result.destination,
      routes: result.routes.map((route) => ({
        duration: formatDuration(route.duration),
        walking_distance: formatDistance(route.walking_distance),
        cost: route.cost === '0' ? '免费' : `¥${route.cost}`,
        description: route.description,
        steps: route.steps,
      })),
    },
    null,
    2
  )
}
