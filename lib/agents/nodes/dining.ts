/**
 * Dining Recommender Agent 节点
 * 餐饮推荐 Agent - 推荐餐厅
 */

import OpenAI from 'openai'
import type {
  TripState,
  TripStateUpdate,
  DiningResult,
  RestaurantRecommendation,
} from '../state'
import type { Location } from '@/types'
import { getMCPClient } from '../mcp-client'
import {
  DINING_SYSTEM_PROMPT,
  buildDiningUserMessage,
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
 * 创建 Dining Recommender Agent
 * @param aiConfig 可选的 AI 配置
 */
export function createDiningAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  /**
   * Dining Recommender Agent 节点函数
   */
  return async function diningAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Dining Recommender] Starting restaurant recommendations...')
    const startTime = Date.now()

    try {
      const { userInput, draftItinerary } = state

      if (!draftItinerary || draftItinerary.days.length === 0) {
        console.warn('[Dining Recommender] No draft itinerary, skipping')
        return {
          dining: {
            recommendations: [],
            totalCost: 0,
          },
        }
      }

      const mcpClient = getMCPClient()

      // 1. 收集所有餐饮时间槽
      const mealSlots: Array<{
        day: number
        date: string
        time: string
        mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
        cuisine?: string
        nearbyAttractions?: string[]
        nearbyLocation?: Location
      }> = []

      for (const day of draftItinerary.days) {
        for (const slot of day.mealSlots) {
          // 找到用餐时间前后的景点
          const nearbyAttractions = day.attractions
            .filter(a => {
              const slotHour = parseInt(slot.time.split(':')[0])
              const attractionHour = parseInt(a.time.split(':')[0])
              return Math.abs(slotHour - attractionHour) <= 2
            })
            .map(a => a.name)

          // 找最近的景点位置
          const nearestAttraction = day.attractions.find(a => {
            const slotHour = parseInt(slot.time.split(':')[0])
            const attractionHour = parseInt(a.time.split(':')[0])
            return attractionHour <= slotHour && a.location
          })

          mealSlots.push({
            day: day.day,
            date: day.date,
            time: slot.time,
            mealType: slot.mealType,
            cuisine: slot.cuisine,
            nearbyAttractions,
            nearbyLocation: nearestAttraction?.location as Location | undefined,
          })
        }
      }

      // 2. 为每个餐饮槽搜索餐厅
      const recommendations: RestaurantRecommendation[] = []

      for (const slot of mealSlots) {
        // 确定搜索关键词
        let keywords = slot.cuisine || ''
        if (slot.mealType === 'breakfast') {
          keywords = keywords || '早餐 早点'
        } else if (slot.mealType === 'snack') {
          keywords = keywords || '小吃 甜品'
        } else {
          keywords = keywords || '餐厅'
        }

        let restaurantPOIs: any[] = []

        // 如果有附近位置，使用周边搜索
        if (slot.nearbyLocation) {
          const nearbyResult = await mcpClient.searchNearby({
            location: `${slot.nearbyLocation.lng},${slot.nearbyLocation.lat}`,
            keywords,
            types: '050000', // 餐饮 POI 类型
            radius: 1000,
            pageSize: 3,
          })

          if (nearbyResult && nearbyResult.pois.length > 0) {
            restaurantPOIs = nearbyResult.pois
          }
        }

        // 如果周边搜索无结果，使用关键词搜索
        if (restaurantPOIs.length === 0) {
          const searchResult = await mcpClient.searchPOI({
            keywords: keywords + ' ' + userInput.destination,
            city: userInput.destination,
            types: '050000',
            cityLimit: true,
            pageSize: 3,
          })

          if (searchResult) {
            restaurantPOIs = searchResult.pois
          }
        }

        // 选择最佳餐厅
        if (restaurantPOIs.length > 0) {
          const poi = restaurantPOIs[0]
          const [lng, lat] = poi.location.split(',').map(Number)

          // 根据餐次估算价格
          const avgPrice = estimateMealPrice(slot.mealType, userInput.budget, draftItinerary.totalMeals)

          recommendations.push({
            time: slot.time,
            restaurant: poi.name,
            cuisine: extractCuisine(poi.type) || slot.cuisine || '当地美食',
            location: {
              name: poi.name,
              address: poi.address || '',
              lat,
              lng,
            },
            avg_price: avgPrice,
            recommended_dishes: [],
            rating: parseFloat(poi.rating) || 4.0,
            openHours: poi.openHours,
            phone: poi.tel,
            // 扩展字段
            day: slot.day,
            mealType: slot.mealType,
          } as RestaurantRecommendation & { day: number; mealType: string })
        }

        // 添加延迟避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      // 3. 计算总成本
      const totalCost = recommendations.reduce(
        (sum, r) => sum + r.avg_price * userInput.travelers,
        0
      )

      const dining: DiningResult = {
        recommendations,
        totalCost,
      }

      const duration = Date.now() - startTime
      console.log(`[Dining Recommender] Completed in ${duration}ms`)
      console.log(`[Dining Recommender] ${recommendations.length} restaurants, total cost: ¥${totalCost}`)

      return { dining }
    } catch (error) {
      console.error('[Dining Recommender] Error:', error)

      return {
        dining: {
          recommendations: [],
          totalCost: 0,
        },
      }
    }
  }
}

/**
 * 估算餐费
 */
function estimateMealPrice(
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  totalBudget: number,
  totalMeals: number
): number {
  // 餐饮预算约占总预算 25%
  const diningBudget = totalBudget * 0.25
  const avgMealPrice = diningBudget / totalMeals

  // 根据餐次调整
  switch (mealType) {
    case 'breakfast':
      return Math.round(avgMealPrice * 0.5)
    case 'lunch':
      return Math.round(avgMealPrice * 1.0)
    case 'dinner':
      return Math.round(avgMealPrice * 1.3)
    case 'snack':
      return Math.round(avgMealPrice * 0.4)
    default:
      return Math.round(avgMealPrice)
  }
}

/**
 * 从 POI 类型提取菜系
 */
function extractCuisine(poiType: string): string | undefined {
  const cuisineMap: Record<string, string> = {
    '中餐厅': '中餐',
    '火锅店': '火锅',
    '西餐厅': '西餐',
    '日本料理': '日料',
    '韩国料理': '韩餐',
    '快餐店': '快餐',
    '小吃店': '小吃',
    '甜品店': '甜品',
    '咖啡厅': '咖啡',
    '茶馆': '茶点',
  }

  for (const [key, value] of Object.entries(cuisineMap)) {
    if (poiType.includes(key)) {
      return value
    }
  }

  return undefined
}

/**
 * 默认导出
 */
export default createDiningAgent
