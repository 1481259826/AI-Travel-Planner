/**
 * Transport Logistician Agent 节点
 * 交通调度 Agent - 计算路线和费用
 */

import OpenAI from 'openai'
import type {
  TripState,
  TripStateUpdate,
  TransportResult,
  TransportSegment,
  TransportMode,
} from '../state'
import type { Location } from '@/types'
import { getMCPClient } from '../mcp-client'
import {
  TRANSPORT_SYSTEM_PROMPT,
  buildTransportUserMessage,
} from '../prompts'

/**
 * AI 客户端配置接口
 */
interface AIClientConfig {
  apiKey: string
  baseURL: string
  model?: string
}

/**
 * 默认 AI 配置
 */
const DEFAULT_AI_CONFIG: AIClientConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: 'deepseek-chat',
}

/**
 * 创建 Transport Logistician Agent
 * @param aiConfig 可选的 AI 配置
 */
export function createTransportAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  /**
   * Transport Logistician Agent 节点函数
   */
  return async function transportAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Transport Logistician] Starting route calculation...')
    const startTime = Date.now()

    try {
      const { userInput, draftItinerary, accommodation } = state

      if (!draftItinerary || draftItinerary.days.length === 0) {
        console.warn('[Transport Logistician] No draft itinerary, skipping')
        return {
          transport: {
            segments: [],
            totalTime: 0,
            totalDistance: 0,
            totalCost: 0,
            recommendedModes: [],
          },
        }
      }

      // 1. 收集所有需要计算路线的位置
      const allSegments: TransportSegment[] = []
      const mcpClient = getMCPClient()

      // 获取酒店位置
      const hotelLocation = accommodation?.selected?.location

      // 2. 计算每天的交通路线
      for (const day of draftItinerary.days) {
        const dayAttractions = day.attractions.filter(
          a => a.location && !isNaN(a.location.lat) && !isNaN(a.location.lng)
        )

        if (dayAttractions.length === 0) continue

        // 从酒店到第一个景点
        if (hotelLocation && dayAttractions[0].location) {
          const segment = await calculateSegment(
            mcpClient,
            hotelLocation,
            dayAttractions[0].location,
            userInput.destination
          )
          if (segment) {
            allSegments.push(segment)
          }
        }

        // 景点之间
        for (let i = 0; i < dayAttractions.length - 1; i++) {
          const from = dayAttractions[i].location!
          const to = dayAttractions[i + 1].location!

          const segment = await calculateSegment(
            mcpClient,
            from,
            to,
            userInput.destination
          )
          if (segment) {
            allSegments.push(segment)
          }

          // 添加延迟避免 API 限流
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        // 从最后一个景点回酒店
        if (hotelLocation && dayAttractions.length > 0) {
          const lastAttraction = dayAttractions[dayAttractions.length - 1]
          if (lastAttraction.location) {
            const segment = await calculateSegment(
              mcpClient,
              lastAttraction.location,
              hotelLocation,
              userInput.destination
            )
            if (segment) {
              allSegments.push(segment)
            }
          }
        }
      }

      // 3. 汇总结果
      const totalTime = allSegments.reduce((sum, s) => sum + s.duration, 0)
      const totalDistance = allSegments.reduce((sum, s) => sum + s.distance, 0)
      const baseCost = allSegments.reduce((sum, s) => sum + s.cost, 0)
      const totalCost = baseCost * userInput.travelers // 乘以人数

      // 4. 推荐交通方式
      const modeCounts: Record<TransportMode, number> = {
        driving: 0,
        transit: 0,
        walking: 0,
        cycling: 0,
      }
      allSegments.forEach(s => {
        modeCounts[s.mode]++
      })

      const recommendedModes = (Object.entries(modeCounts) as [TransportMode, number][])
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([mode]) => mode)

      const transport: TransportResult = {
        segments: allSegments,
        totalTime,
        totalDistance,
        totalCost,
        recommendedModes,
      }

      const duration = Date.now() - startTime
      console.log(`[Transport Logistician] Completed in ${duration}ms`)
      console.log(`[Transport Logistician] ${allSegments.length} segments, total cost: ¥${totalCost}`)

      return { transport }
    } catch (error) {
      console.error('[Transport Logistician] Error:', error)

      return {
        transport: {
          segments: [],
          totalTime: 0,
          totalDistance: 0,
          totalCost: 0,
          recommendedModes: [],
        },
      }
    }
  }
}

/**
 * 计算单个路段
 */
async function calculateSegment(
  mcpClient: ReturnType<typeof getMCPClient>,
  from: Location,
  to: Location,
  city: string
): Promise<TransportSegment | null> {
  try {
    const origin = `${from.lng},${from.lat}`
    const destination = `${to.lng},${to.lat}`

    // 首先尝试获取步行距离
    const walkingRoute = await mcpClient.getWalkingRoute(origin, destination)

    if (walkingRoute && walkingRoute.distance < 1000) {
      // 小于 1km，推荐步行
      return {
        from,
        to,
        mode: 'walking',
        duration: Math.ceil(walkingRoute.duration / 60), // 秒转分钟
        distance: walkingRoute.distance,
        cost: 0,
      }
    }

    // 1-5km 范围尝试骑行
    if (walkingRoute && walkingRoute.distance >= 1000 && walkingRoute.distance < 5000) {
      const cyclingRoute = await mcpClient.getBicyclingRoute(origin, destination)

      if (cyclingRoute) {
        // 骑行成本：共享单车约 1.5 元起步
        const cyclingCost = Math.min(Math.ceil(cyclingRoute.duration / 60 / 15) * 1.5, 5)

        return {
          from,
          to,
          mode: 'cycling',
          duration: Math.ceil(cyclingRoute.duration / 60),
          distance: cyclingRoute.distance,
          cost: cyclingCost,
        }
      }
    }

    // 尝试公交
    const transitRoute = await mcpClient.getTransitRoute(origin, destination, city)

    if (transitRoute) {
      // 估算公交费用（简化）
      const transitCost = Math.min(Math.ceil(transitRoute.distance / 5000) * 2, 10)

      return {
        from,
        to,
        mode: 'transit',
        duration: Math.ceil(transitRoute.duration / 60) + 10, // 加上等车时间
        distance: transitRoute.distance,
        cost: transitCost,
      }
    }

    // 最后尝试驾车
    const drivingRoute = await mcpClient.getDrivingRoute(origin, destination)

    if (drivingRoute) {
      return {
        from,
        to,
        mode: 'driving',
        duration: Math.ceil(drivingRoute.duration / 60) + 5, // 加上叫车时间
        distance: drivingRoute.distance,
        cost: drivingRoute.taxi_cost || estimateTaxiCost(drivingRoute.distance),
        polyline: drivingRoute.polyline,
      }
    }

    // 如果所有路线都失败，使用直线距离估算
    const directDistance = calculateDirectDistance(
      from.lat,
      from.lng,
      to.lat,
      to.lng
    )

    if (directDistance < 1000) {
      return {
        from,
        to,
        mode: 'walking',
        duration: Math.ceil(directDistance / 80), // 约 80m/min 步行速度
        distance: directDistance,
        cost: 0,
      }
    } else if (directDistance < 5000) {
      // 1-5km 推荐骑行
      return {
        from,
        to,
        mode: 'cycling',
        duration: Math.ceil(directDistance / 250), // 约 250m/min 骑行速度
        distance: directDistance,
        cost: 1.5,
      }
    } else {
      return {
        from,
        to,
        mode: 'transit',
        duration: Math.ceil(directDistance / 500) + 15, // 约 500m/min + 等车
        distance: directDistance,
        cost: Math.min(Math.ceil(directDistance / 5000) * 2, 10),
      }
    }
  } catch (error) {
    console.warn(`[Transport] Failed to calculate route from ${from.name} to ${to.name}:`, error)
    return null
  }
}

/**
 * 估算出租车费用
 */
function estimateTaxiCost(distanceInMeters: number): number {
  // 简化的出租车计费：起步价 13 元 + 2.5 元/km
  const km = distanceInMeters / 1000
  if (km <= 3) {
    return 13
  }
  return Math.round(13 + (km - 3) * 2.5)
}

/**
 * 计算直线距离（米）
 */
function calculateDirectDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // 地球半径（米）
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * 默认导出
 */
export default createTransportAgent
