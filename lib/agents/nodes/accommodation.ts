/**
 * Accommodation Specialist Agent 节点
 * 住宿专家 Agent - 推荐酒店
 */

import OpenAI from 'openai'
import type {
  TripState,
  TripStateUpdate,
  AccommodationResult,
  HotelRecommendation,
} from '../state'
import type { Location } from '@/types'
import { getMCPClient } from '../mcp-client'
import {
  ACCOMMODATION_SYSTEM_PROMPT,
  buildAccommodationUserMessage,
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
 * 创建 Accommodation Specialist Agent
 * @param aiConfig 可选的 AI 配置
 */
export function createAccommodationAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  /**
   * Accommodation Specialist Agent 节点函数
   */
  return async function accommodationAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Accommodation Specialist] Starting hotel recommendations...')
    const startTime = Date.now()

    try {
      const { userInput, draftItinerary, budgetResult } = state

      if (!draftItinerary || draftItinerary.days.length === 0) {
        console.warn('[Accommodation Specialist] No draft itinerary, skipping')
        return {
          accommodation: {
            recommendations: [],
            selected: null,
            totalCost: 0,
          },
        }
      }

      // 1. 计算入住天数
      const nights = draftItinerary.days.length - 1 || 1
      const checkIn = userInput.start_date
      const checkOut = userInput.end_date

      // 2. 收集所有景点位置计算中心点
      const attractions = draftItinerary.days.flatMap(day =>
        day.attractions.map(a => ({
          name: a.name,
          location: a.location,
        }))
      )

      // 3. 计算地理中心点
      const centroidLocation = calculateCentroid(attractions)

      // 4. 使用 MCP 搜索周边酒店
      const mcpClient = getMCPClient()
      let hotelPOIs: any[] = []

      if (centroidLocation) {
        console.log(`[Accommodation Specialist] Searching hotels near centroid (${centroidLocation.lat}, ${centroidLocation.lng})`)
        const nearbyResult = await mcpClient.searchNearby({
          location: `${centroidLocation.lng},${centroidLocation.lat}`,
          types: '100100', // 酒店 POI 类型
          radius: 3000,
          pageSize: 10,
        })

        if (nearbyResult && nearbyResult.pois.length > 0) {
          hotelPOIs = nearbyResult.pois
        }
      }

      // 如果周边搜索无结果，使用关键词搜索
      if (hotelPOIs.length === 0) {
        console.log('[Accommodation Specialist] Falling back to keyword search')
        const searchResult = await mcpClient.searchPOI({
          keywords: '酒店',
          city: userInput.destination,
          types: '100100',
          cityLimit: true,
          pageSize: 10,
        })

        if (searchResult) {
          hotelPOIs = searchResult.pois
        }
      }

      // 5. 确定酒店价格等级
      const priceLevel = determineHotelPriceLevel(
        userInput.budget,
        nights,
        userInput.travelers,
        userInput.hotel_preferences
      )

      // 6. 调用 AI 生成推荐
      if (!config.apiKey) {
        console.warn('[Accommodation Specialist] No API key, using POI results directly')
        return {
          accommodation: createAccommodationFromPOIs(
            hotelPOIs,
            checkIn,
            checkOut,
            nights,
            priceLevel,
            centroidLocation
          ),
        }
      }

      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })

      const userMessage = buildAccommodationUserMessage({
        destination: userInput.destination,
        checkIn,
        checkOut,
        nights,
        budget: userInput.budget,
        travelers: userInput.travelers,
        adultCount: userInput.adult_count,
        childCount: userInput.child_count,
        hotelPreferences: userInput.hotel_preferences,
        attractions,
      })

      // 添加 POI 搜索结果作为参考
      let finalMessage = userMessage
      if (hotelPOIs.length > 0) {
        finalMessage += `\n\n**附近酒店参考**\n`
        finalMessage += hotelPOIs.slice(0, 5).map(poi =>
          `- ${poi.name}: ${poi.address} (${poi.rating || '暂无评分'})`
        ).join('\n')
      }

      // 如果是预算超支重试，添加降价建议
      if (budgetResult?.feedback?.action === 'downgrade_hotel') {
        finalMessage += `\n\n**预算反馈**\n`
        finalMessage += `需要降低住宿成本，目标节省 ¥${budgetResult.feedback.targetReduction}\n`
        finalMessage += `请推荐更经济的住宿选择。`
      }

      console.log('[Accommodation Specialist] Calling AI for recommendations...')
      const completion = await client.chat.completions.create({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: ACCOMMODATION_SYSTEM_PROMPT },
          { role: 'user', content: finalMessage },
        ],
        max_tokens: 2000,
        temperature: 0.5,
      })

      const responseText = completion.choices[0]?.message?.content || ''

      // 7. 解析 AI 响应
      const accommodation = parseAccommodationResponse(
        responseText,
        checkIn,
        checkOut,
        nights,
        centroidLocation
      )

      const duration = Date.now() - startTime
      console.log(`[Accommodation Specialist] Completed in ${duration}ms`)
      console.log(`[Accommodation Specialist] Total cost: ¥${accommodation.totalCost}`)

      return { accommodation }
    } catch (error) {
      console.error('[Accommodation Specialist] Error:', error)

      return {
        accommodation: {
          recommendations: [],
          selected: null,
          totalCost: 0,
        },
      }
    }
  }
}

/**
 * 计算地理中心点
 */
function calculateCentroid(
  attractions: Array<{ name: string; location?: { lat: number; lng: number } }>
): Location | undefined {
  const validLocations = attractions.filter(
    a => a.location && !isNaN(a.location.lat) && !isNaN(a.location.lng)
  )

  if (validLocations.length === 0) {
    return undefined
  }

  const sumLat = validLocations.reduce((sum, a) => sum + a.location!.lat, 0)
  const sumLng = validLocations.reduce((sum, a) => sum + a.location!.lng, 0)

  return {
    name: '行程中心点',
    address: '根据行程景点计算',
    lat: sumLat / validLocations.length,
    lng: sumLng / validLocations.length,
  }
}

/**
 * 确定酒店价格等级
 */
function determineHotelPriceLevel(
  totalBudget: number,
  nights: number,
  travelers: number,
  preferences?: string[]
): 'economy' | 'standard' | 'luxury' {
  // 住宿预算约占总预算 30%
  const accommodationBudget = totalBudget * 0.3
  const perNightPerPerson = accommodationBudget / nights / travelers

  // 根据偏好调整
  if (preferences?.includes('豪华') || preferences?.includes('奢华')) {
    return 'luxury'
  }
  if (preferences?.includes('经济型') || preferences?.includes('实惠')) {
    return 'economy'
  }

  // 根据价格判断
  if (perNightPerPerson < 150) {
    return 'economy'
  } else if (perNightPerPerson < 350) {
    return 'standard'
  } else {
    return 'luxury'
  }
}

/**
 * 从 POI 结果创建住宿推荐
 */
function createAccommodationFromPOIs(
  pois: any[],
  checkIn: string,
  checkOut: string,
  nights: number,
  priceLevel: 'economy' | 'standard' | 'luxury',
  centroidLocation?: Location
): AccommodationResult {
  // 根据价格等级设置价格范围
  const priceRanges = {
    economy: { min: 100, max: 200 },
    standard: { min: 200, max: 400 },
    luxury: { min: 400, max: 800 },
  }

  const range = priceRanges[priceLevel]
  const recommendations: HotelRecommendation[] = pois.slice(0, 3).map((poi, index) => {
    const [lng, lat] = poi.location.split(',').map(Number)
    const pricePerNight = Math.round(range.min + (range.max - range.min) * (1 - index * 0.2))

    return {
      name: poi.name,
      type: 'hotel' as const,
      location: {
        name: poi.name,
        address: poi.address || '',
        lat,
        lng,
      },
      check_in: checkIn,
      check_out: checkOut,
      price_per_night: pricePerNight,
      total_price: pricePerNight * nights,
      rating: parseFloat(poi.rating) || 4.0,
      amenities: ['免费WiFi', '空调', '热水'],
      distanceFromCenter: centroidLocation
        ? calculateDistance(lat, lng, centroidLocation.lat, centroidLocation.lng)
        : undefined,
      matchScore: 0.8 - index * 0.1,
    }
  })

  const selected = recommendations[0] || null

  return {
    recommendations,
    selected,
    totalCost: selected?.total_price || 0,
    centroidLocation,
  }
}

/**
 * 解析 AI 返回的住宿推荐
 */
function parseAccommodationResponse(
  responseText: string,
  checkIn: string,
  checkOut: string,
  nights: number,
  centroidLocation?: Location
): AccommodationResult {
  try {
    const jsonMatch =
      responseText.match(/```json\n([\s\S]*?)\n```/) ||
      responseText.match(/```\n([\s\S]*?)\n```/) ||
      responseText.match(/\{[\s\S]*\}/)

    const jsonString = jsonMatch
      ? jsonMatch[1] || jsonMatch[0]
      : responseText

    const parsed = JSON.parse(jsonString)

    const recommendations: HotelRecommendation[] = (parsed.recommendations || []).map((h: any) => ({
      name: h.name || '未知酒店',
      type: h.type || 'hotel',
      location: h.location || { name: h.name, address: '', lat: 0, lng: 0 },
      check_in: h.check_in || checkIn,
      check_out: h.check_out || checkOut,
      price_per_night: h.price_per_night || 200,
      total_price: h.total_price || (h.price_per_night || 200) * nights,
      rating: h.rating || 4.0,
      amenities: h.amenities || [],
      distanceFromCenter: h.distanceFromCenter,
      matchScore: h.matchScore || 0.8,
    }))

    const selected = parsed.selected
      ? {
          name: parsed.selected.name || '未知酒店',
          type: parsed.selected.type || 'hotel',
          location: parsed.selected.location || { name: parsed.selected.name, address: '', lat: 0, lng: 0 },
          check_in: parsed.selected.check_in || checkIn,
          check_out: parsed.selected.check_out || checkOut,
          price_per_night: parsed.selected.price_per_night || 200,
          total_price: parsed.selected.total_price || (parsed.selected.price_per_night || 200) * nights,
          rating: parsed.selected.rating || 4.0,
          amenities: parsed.selected.amenities || [],
          distanceFromCenter: parsed.selected.distanceFromCenter,
          matchScore: parsed.selected.matchScore || 0.9,
        }
      : recommendations[0] || null

    return {
      recommendations,
      selected,
      totalCost: parsed.totalCost || selected?.total_price || 0,
      centroidLocation: parsed.centroidLocation || centroidLocation,
    }
  } catch (error) {
    console.warn('[Accommodation Specialist] Failed to parse AI response')
    return {
      recommendations: [],
      selected: null,
      totalCost: 0,
      centroidLocation,
    }
  }
}

/**
 * 计算两点间距离（km）
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // 地球半径（km）
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

/**
 * 默认导出
 */
export default createAccommodationAgent
