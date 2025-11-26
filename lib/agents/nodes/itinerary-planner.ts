/**
 * Itinerary Planner Agent 节点
 * 核心规划 Agent - 生成行程骨架
 */

import OpenAI from 'openai'
import type {
  TripState,
  TripStateUpdate,
  DraftItinerary,
  DraftDay,
  AttractionSlot,
  MealSlot,
} from '../state'
import { getMCPClient } from '../mcp-client'
import {
  ITINERARY_PLANNER_SYSTEM_PROMPT,
  buildItineraryPlannerUserMessage,
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
 * 创建 Itinerary Planner Agent
 * @param aiConfig 可选的 AI 配置
 */
export function createItineraryPlannerAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  /**
   * Itinerary Planner Agent 节点函数
   */
  return async function itineraryPlannerAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Itinerary Planner] Starting itinerary planning...')
    const startTime = Date.now()

    try {
      const { userInput, weather, budgetResult, retryCount } = state

      // 如果是重试，记录反馈信息
      if (retryCount > 0 && budgetResult?.feedback) {
        console.log(`[Itinerary Planner] Retry ${retryCount}, feedback: ${budgetResult.feedback.suggestion}`)
      }

      // 1. 构建用户消息
      const userMessage = buildItineraryPlannerUserMessage({
        destination: userInput.destination,
        origin: userInput.origin,
        startDate: userInput.start_date,
        endDate: userInput.end_date,
        startTime: userInput.start_time,
        endTime: userInput.end_time,
        budget: userInput.budget,
        travelers: userInput.travelers,
        adultCount: userInput.adult_count,
        childCount: userInput.child_count,
        preferences: userInput.preferences,
        hotelPreferences: userInput.hotel_preferences,
        additionalNotes: userInput.additional_notes,
        strategyTags: weather?.strategyTags || [],
        clothingAdvice: weather?.clothingAdvice,
        weatherWarnings: weather?.warnings,
      })

      // 添加重试反馈
      let finalMessage = userMessage
      if (retryCount > 0 && budgetResult?.feedback) {
        finalMessage += `\n\n**预算反馈（第 ${retryCount} 次重试）**\n`
        finalMessage += `- 问题：预算超支 ¥${budgetResult.feedback.targetReduction}\n`
        finalMessage += `- 建议：${budgetResult.feedback.suggestion}\n`
        finalMessage += `- 请相应调整行程，减少费用。`
      }

      // 2. 调用 AI 生成行程
      if (!config.apiKey) {
        console.warn('[Itinerary Planner] No API key, returning empty draft')
        return {
          draftItinerary: createEmptyDraft(userInput.start_date, userInput.end_date),
        }
      }

      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })

      console.log('[Itinerary Planner] Calling AI for itinerary generation...')
      const completion = await client.chat.completions.create({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: ITINERARY_PLANNER_SYSTEM_PROMPT },
          { role: 'user', content: finalMessage },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      })

      const responseText = completion.choices[0]?.message?.content || ''

      // 3. 解析 AI 响应
      const draftItinerary = parseDraftItinerary(responseText)

      // 4. 使用 MCP 验证和补充景点坐标
      console.log('[Itinerary Planner] Enriching attractions with coordinates...')
      const enrichedDraft = await enrichDraftWithCoordinates(
        draftItinerary,
        userInput.destination
      )

      const duration = Date.now() - startTime
      console.log(`[Itinerary Planner] Completed in ${duration}ms`)
      console.log(`[Itinerary Planner] Generated ${enrichedDraft.totalAttractions} attractions, ${enrichedDraft.totalMeals} meals`)

      return { draftItinerary: enrichedDraft }
    } catch (error) {
      console.error('[Itinerary Planner] Error:', error)

      // 返回空草稿
      return {
        draftItinerary: createEmptyDraft(
          state.userInput.start_date,
          state.userInput.end_date
        ),
      }
    }
  }
}

/**
 * 解析 AI 返回的草稿行程
 */
function parseDraftItinerary(responseText: string): DraftItinerary {
  try {
    // 尝试提取 JSON
    const jsonMatch =
      responseText.match(/```json\n([\s\S]*?)\n```/) ||
      responseText.match(/```\n([\s\S]*?)\n```/) ||
      responseText.match(/\{[\s\S]*\}/)

    const jsonString = jsonMatch
      ? jsonMatch[1] || jsonMatch[0]
      : responseText

    const parsed = JSON.parse(jsonString)

    // 验证和转换
    const days: DraftDay[] = (parsed.days || []).map((day: any) => ({
      day: day.day || 1,
      date: day.date || '',
      attractions: (day.attractions || []).map((a: any) => ({
        time: a.time || '09:00',
        name: a.name || '未知景点',
        duration: a.duration || '2小时',
        type: a.type || 'attraction',
        location: a.location,
      })) as AttractionSlot[],
      mealSlots: (day.mealSlots || []).map((m: any) => ({
        time: m.time || '12:00',
        mealType: m.mealType || 'lunch',
        cuisine: m.cuisine,
      })) as MealSlot[],
    }))

    return {
      days,
      totalAttractions: parsed.totalAttractions || days.reduce((sum, d) => sum + d.attractions.length, 0),
      totalMeals: parsed.totalMeals || days.reduce((sum, d) => sum + d.mealSlots.length, 0),
      estimatedAttractionCost: parsed.estimatedAttractionCost || 0,
    }
  } catch (error) {
    console.warn('[Itinerary Planner] Failed to parse AI response')
    return {
      days: [],
      totalAttractions: 0,
      totalMeals: 0,
    }
  }
}

/**
 * 使用 MCP 客户端补充景点坐标
 */
async function enrichDraftWithCoordinates(
  draft: DraftItinerary,
  city: string
): Promise<DraftItinerary> {
  const mcpClient = getMCPClient()
  const enrichedDays: DraftDay[] = []
  let totalAttractionCost = 0

  for (const day of draft.days) {
    const enrichedAttractions: AttractionSlot[] = []

    for (const attraction of day.attractions) {
      // 如果已有坐标，跳过
      if (attraction.location?.lat && attraction.location?.lng) {
        enrichedAttractions.push(attraction)
        continue
      }

      try {
        // 使用 POI 搜索获取详细信息
        const poiResult = await mcpClient.searchPOI({
          keywords: attraction.name,
          city,
          cityLimit: true,
          pageSize: 1,
        })

        if (poiResult && poiResult.pois.length > 0) {
          const poi = poiResult.pois[0]
          const [lng, lat] = poi.location.split(',').map(Number)

          enrichedAttractions.push({
            ...attraction,
            location: {
              name: poi.name,
              address: poi.address || city,
              lat,
              lng,
            },
          })
        } else {
          // 尝试地理编码
          const geocodeResult = await mcpClient.geocode(attraction.name, city)

          if (geocodeResult) {
            const [lng, lat] = geocodeResult.location.split(',').map(Number)

            enrichedAttractions.push({
              ...attraction,
              location: {
                name: attraction.name,
                address: geocodeResult.formatted_address,
                lat,
                lng,
              },
            })
          } else {
            // 无法获取坐标，保持原样
            enrichedAttractions.push(attraction)
          }
        }

        // 添加延迟避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.warn(`[Itinerary Planner] Failed to enrich ${attraction.name}:`, error)
        enrichedAttractions.push(attraction)
      }
    }

    enrichedDays.push({
      ...day,
      attractions: enrichedAttractions,
    })
  }

  return {
    days: enrichedDays,
    totalAttractions: draft.totalAttractions,
    totalMeals: draft.totalMeals,
    estimatedAttractionCost: draft.estimatedAttractionCost || totalAttractionCost,
  }
}

/**
 * 创建空草稿
 */
function createEmptyDraft(startDate: string, endDate: string): DraftItinerary {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days: DraftDay[] = []

  let currentDate = new Date(start)
  let dayNum = 1

  while (currentDate <= end) {
    days.push({
      day: dayNum,
      date: currentDate.toISOString().split('T')[0],
      attractions: [],
      mealSlots: [
        { time: '08:00', mealType: 'breakfast' },
        { time: '12:00', mealType: 'lunch' },
        { time: '18:00', mealType: 'dinner' },
      ],
    })

    currentDate.setDate(currentDate.getDate() + 1)
    dayNum++
  }

  return {
    days,
    totalAttractions: 0,
    totalMeals: days.length * 3,
  }
}

/**
 * 默认导出
 */
export default createItineraryPlannerAgent
