/**
 * Finalize Agent 节点
 * 汇总输出 Agent - 整合所有数据生成完整行程
 */

import OpenAI from 'openai'
import type { TripState, TripStateUpdate } from '../state'
import type { Itinerary, DayPlan, Activity, Meal, Accommodation } from '@/types'
import {
  FINALIZE_SYSTEM_PROMPT,
  buildFinalizeUserMessage,
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
 * 创建 Finalize Agent
 * @param aiConfig 可选的 AI 配置
 */
export function createFinalizeAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  /**
   * Finalize Agent 节点函数
   */
  return async function finalizeAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Finalize] Generating final itinerary...')
    const startTime = Date.now()

    try {
      const {
        userInput,
        draftItinerary,
        accommodation,
        transport,
        dining,
        budgetResult,
      } = state

      // 1. 构建每日行程
      const days: DayPlan[] = []

      if (draftItinerary) {
        for (const draftDay of draftItinerary.days) {
          // 转换活动
          const activities: Activity[] = draftDay.attractions.map(a => ({
            time: a.time,
            name: a.name,
            type: (a.type as Activity['type']) || 'attraction',
            location: a.location || {
              name: a.name,
              address: userInput.destination,
              lat: 0,
              lng: 0,
            },
            duration: a.duration,
            description: `游览${a.name}`,
            ticket_price: 0,
          }))

          // 获取当天的餐饮推荐
          const dayMeals: Meal[] = []
          if (dining?.recommendations) {
            const dayDining = dining.recommendations.filter(
              (r: any) => r.day === draftDay.day
            )

            for (const restaurant of dayDining) {
              dayMeals.push({
                time: restaurant.time,
                restaurant: restaurant.restaurant,
                cuisine: restaurant.cuisine,
                location: restaurant.location,
                avg_price: restaurant.avg_price,
                recommended_dishes: restaurant.recommended_dishes || [],
              })
            }
          }

          // 如果没有餐饮推荐，从 mealSlots 生成占位符
          if (dayMeals.length === 0) {
            for (const slot of draftDay.mealSlots) {
              dayMeals.push({
                time: slot.time,
                restaurant: `${userInput.destination}${slot.mealType === 'breakfast' ? '早餐' : slot.mealType === 'lunch' ? '午餐' : '晚餐'}推荐`,
                cuisine: slot.cuisine || '当地美食',
                location: {
                  name: userInput.destination,
                  address: userInput.destination,
                  lat: 0,
                  lng: 0,
                },
                avg_price: 50,
                recommended_dishes: [],
              })
            }
          }

          days.push({
            day: draftDay.day,
            date: draftDay.date,
            activities,
            meals: dayMeals,
          })
        }
      }

      // 2. 构建住宿信息
      const accommodations: Accommodation[] = []
      if (accommodation?.selected) {
        const hotel = accommodation.selected
        accommodations.push({
          name: hotel.name,
          type: hotel.type || 'hotel',
          location: hotel.location,
          check_in: hotel.check_in,
          check_out: hotel.check_out,
          price_per_night: hotel.price_per_night,
          total_price: hotel.total_price,
          rating: hotel.rating,
          amenities: hotel.amenities,
        })
      }

      // 3. 构建交通信息
      const localTransportCost = transport?.totalCost || 0

      // 4. 构建费用汇总
      const costBreakdown = budgetResult?.costBreakdown || {
        accommodation: accommodation?.totalCost || 0,
        transport: transport?.totalCost || 0,
        dining: dining?.totalCost || 0,
        attractions: draftItinerary?.estimatedAttractionCost || 0,
      }

      const totalCost =
        costBreakdown.accommodation +
        costBreakdown.transport +
        costBreakdown.dining +
        costBreakdown.attractions

      // 5. 生成行程总结
      const daysCount = days.length
      const mainAttractions = days
        .flatMap(d => d.activities)
        .slice(0, 3)
        .map(a => a.name)
        .join('、')

      const summary = `${userInput.destination}${daysCount}日游，主要游览${mainAttractions}等景点，${accommodations.length > 0 ? `入住${accommodations[0].name}，` : ''}预计总花费¥${totalCost}。`

      // 6. 构建最终行程
      const finalItinerary: Itinerary = {
        summary,
        days,
        accommodation: accommodations,
        transportation: {
          to_destination: {
            method: userInput.origin ? '高铁/飞机' : '自行前往',
            details: userInput.origin ? `从${userInput.origin}出发` : '自行安排',
            cost: 0,
          },
          from_destination: {
            method: userInput.origin ? '高铁/飞机' : '自行返回',
            details: userInput.origin ? `返回${userInput.origin}` : '自行安排',
            cost: 0,
          },
          local: {
            methods: transport?.recommendedModes?.map(m => {
              switch (m) {
                case 'walking': return '步行'
                case 'transit': return '公交/地铁'
                case 'driving': return '出租车/网约车'
                case 'cycling': return '骑行'
                default: return m
              }
            }) || ['公交', '地铁', '步行'],
            estimated_cost: localTransportCost,
          },
        },
        estimated_cost: {
          accommodation: costBreakdown.accommodation,
          transportation: costBreakdown.transport,
          food: costBreakdown.dining,
          attractions: costBreakdown.attractions,
          other: Math.round(totalCost * 0.05), // 预留 5% 其他费用
          total: Math.round(totalCost * 1.05),
        },
      }

      const duration = Date.now() - startTime
      console.log(`[Finalize] Completed in ${duration}ms`)
      console.log(`[Finalize] Generated ${days.length} days, total cost: ¥${finalItinerary.estimated_cost.total}`)

      return { finalItinerary }
    } catch (error) {
      console.error('[Finalize] Error:', error)

      // 返回基本行程结构
      return {
        finalItinerary: {
          summary: '行程生成过程中出现错误，请重试',
          days: [],
          accommodation: [],
          transportation: {
            to_destination: { method: '', details: '', cost: 0 },
            from_destination: { method: '', details: '', cost: 0 },
            local: { methods: [], estimated_cost: 0 },
          },
          estimated_cost: {
            accommodation: 0,
            transportation: 0,
            food: 0,
            attractions: 0,
            other: 0,
            total: 0,
          },
        },
      }
    }
  }
}

/**
 * 默认导出
 */
export default createFinalizeAgent
