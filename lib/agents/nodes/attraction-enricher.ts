/**
 * Attraction Enricher Agent 节点
 * 景点详情增强 Agent - 为景点添加详细信息
 */

import OpenAI from 'openai'
import type {
  TripState,
  TripStateUpdate,
  AttractionEnrichmentResult,
  EnrichedAttraction,
} from '../state'
import { getMCPClient, type POI } from '../mcp-client'
import {
  ATTRACTION_ENRICHER_SYSTEM_PROMPT,
  buildAttractionEnricherUserMessage,
  parseAttractionEnricherResponse,
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
 * 从 POI 数据提取有用信息
 */
function extractPOIData(poi: POI): Partial<EnrichedAttraction> {
  const result: Partial<EnrichedAttraction> = {
    poiId: poi.id,
    category: poi.type,
    tel: poi.tel,
    photos: poi.photos,
  }

  // 提取评分（高德返回的是字符串）
  if (poi.rating) {
    const rating = parseFloat(poi.rating)
    if (!isNaN(rating)) {
      result.rating = rating
    }
  }

  return result
}

/**
 * 估算门票价格（基于景点类型）
 */
export function estimateTicketPrice(
  name: string,
  poiType?: string,
  poiTypecode?: string
): number {
  const nameLower = name.toLowerCase()
  const typeLower = (poiType || '').toLowerCase()

  // 免费景点关键词
  const freeKeywords = ['公园', '广场', '步行街', '商业街', '夜市', '免费']
  if (freeKeywords.some(kw => nameLower.includes(kw) || typeLower.includes(kw))) {
    return 0
  }

  // 著名景点（5A 级别）- 优先匹配
  const famousSpots = ['故宫', '长城', '兵马俑', '西湖', '黄山', '张家界', '九寨沟', '丽江']
  if (famousSpots.some(spot => nameLower.includes(spot))) {
    return 150
  }

  // 博物馆/纪念馆（部分免费）
  if (nameLower.includes('博物馆') || nameLower.includes('纪念馆') || nameLower.includes('美术馆')) {
    return 30 // 平均估算
  }

  // 寺庙/宗教场所
  if (nameLower.includes('寺') || nameLower.includes('庙') || nameLower.includes('观') || nameLower.includes('塔')) {
    return 50
  }

  // 古镇/古村
  if (nameLower.includes('古镇') || nameLower.includes('古村') || nameLower.includes('老街')) {
    return 80
  }

  // 主题乐园
  if (nameLower.includes('乐园') || nameLower.includes('欢乐谷') || nameLower.includes('迪士尼') || nameLower.includes('环球')) {
    return 300
  }

  // 山/自然景区
  if (nameLower.includes('山') || nameLower.includes('峰') || nameLower.includes('岭')) {
    return 100
  }

  // 湖/水景
  if (nameLower.includes('湖') || nameLower.includes('河') || nameLower.includes('江')) {
    return 50
  }

  // 动物园/植物园
  if (nameLower.includes('动物园') || nameLower.includes('植物园') || nameLower.includes('海洋馆')) {
    return 120
  }

  // 默认景点价格
  return 60
}

/**
 * 推断开放时间
 */
export function inferOpeningHours(name: string, poiType?: string): string {
  const nameLower = name.toLowerCase()
  const typeLower = (poiType || '').toLowerCase()

  // 博物馆
  if (nameLower.includes('博物馆') || nameLower.includes('纪念馆') || nameLower.includes('美术馆')) {
    return '09:00-17:00（周一闭馆）'
  }

  // 公园
  if (nameLower.includes('公园') || typeLower.includes('公园')) {
    return '06:00-22:00'
  }

  // 商业区
  if (nameLower.includes('步行街') || nameLower.includes('商业街') || nameLower.includes('购物')) {
    return '10:00-22:00'
  }

  // 夜市
  if (nameLower.includes('夜市')) {
    return '17:00-24:00'
  }

  // 寺庙
  if (nameLower.includes('寺') || nameLower.includes('庙')) {
    return '07:00-17:00'
  }

  // 默认景区时间
  return '08:30-17:30'
}

/**
 * 推断游玩时长
 */
export function inferDuration(name: string, poiType?: string): string {
  const nameLower = name.toLowerCase()

  // 大型景区
  const largeSpots = ['故宫', '长城', '迪士尼', '环球', '欢乐谷', '黄山', '张家界']
  if (largeSpots.some(spot => nameLower.includes(spot))) {
    return '4-6小时'
  }

  // 博物馆
  if (nameLower.includes('博物馆') || nameLower.includes('美术馆')) {
    return '2-3小时'
  }

  // 古镇
  if (nameLower.includes('古镇') || nameLower.includes('古村')) {
    return '3-4小时'
  }

  // 公园/湖泊
  if (nameLower.includes('公园') || nameLower.includes('湖')) {
    return '2-3小时'
  }

  // 商业街
  if (nameLower.includes('步行街') || nameLower.includes('商业街')) {
    return '2-3小时'
  }

  // 打卡点
  if (nameLower.includes('塔') || nameLower.includes('桥') || nameLower.includes('广场')) {
    return '1-2小时'
  }

  // 默认
  return '2小时'
}

/**
 * 生成景点标签
 */
export function generateTags(name: string, poiType?: string, ticketPrice?: number): string[] {
  const tags: string[] = []
  const nameLower = name.toLowerCase()

  // 免费标签
  if (ticketPrice === 0) {
    tags.push('免费开放')
  }

  // 著名景点
  const worldHeritage = ['故宫', '长城', '兵马俑', '西湖', '丽江', '黄山', '九寨沟', '峨眉山', '武夷山']
  if (worldHeritage.some(spot => nameLower.includes(spot))) {
    tags.push('世界遗产')
    tags.push('必去景点')
  }

  // 类型标签
  if (nameLower.includes('博物馆') || nameLower.includes('纪念馆')) {
    tags.push('历史文化')
    tags.push('室内')
  }

  if (nameLower.includes('公园') || nameLower.includes('山') || nameLower.includes('湖')) {
    tags.push('自然风光')
    tags.push('户外')
  }

  if (nameLower.includes('古镇') || nameLower.includes('老街')) {
    tags.push('人文景观')
    tags.push('拍照打卡')
  }

  if (nameLower.includes('乐园') || nameLower.includes('动物园') || nameLower.includes('海洋馆')) {
    tags.push('亲子游')
    tags.push('娱乐休闲')
  }

  if (nameLower.includes('夜市') || nameLower.includes('夜景')) {
    tags.push('夜游')
  }

  // 确保至少有一个标签
  if (tags.length === 0) {
    tags.push('景点游览')
  }

  return tags
}

/**
 * 创建 Attraction Enricher Agent
 * @param aiConfig 可选的 AI 配置
 */
export function createAttractionEnricherAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  /**
   * Attraction Enricher Agent 节点函数
   */
  return async function attractionEnricherAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Attraction Enricher] Starting attraction enrichment...')
    const startTime = Date.now()

    try {
      const { userInput, draftItinerary } = state

      // 检查是否有草稿行程
      if (!draftItinerary || draftItinerary.days.length === 0) {
        console.warn('[Attraction Enricher] No draft itinerary available')
        return {
          attractionEnrichment: {
            enrichedAttractions: [],
            totalAttractions: 0,
            enrichedCount: 0,
            totalTicketCost: 0,
            errors: ['No draft itinerary available'],
          },
        }
      }

      // 收集所有景点
      const allAttractions: Array<{
        name: string
        address?: string
        location?: { lat: number; lng: number }
        type?: string
        duration?: string
        dayIndex: number
        attractionIndex: number
      }> = []

      draftItinerary.days.forEach((day, dayIndex) => {
        day.attractions.forEach((attraction, attractionIndex) => {
          allAttractions.push({
            name: attraction.name,
            address: attraction.location?.address,
            location: attraction.location
              ? { lat: attraction.location.lat, lng: attraction.location.lng }
              : undefined,
            type: attraction.type,
            duration: attraction.duration,
            dayIndex,
            attractionIndex,
          })
        })
      })

      console.log(`[Attraction Enricher] Found ${allAttractions.length} attractions to enrich`)

      if (allAttractions.length === 0) {
        return {
          attractionEnrichment: {
            enrichedAttractions: [],
            totalAttractions: 0,
            enrichedCount: 0,
            totalTicketCost: 0,
          },
        }
      }

      // 使用 MCP 客户端获取 POI 详情
      const mcpClient = getMCPClient()
      const enrichedAttractions: EnrichedAttraction[] = []
      const errors: string[] = []
      let totalTicketCost = 0

      for (const attraction of allAttractions) {
        try {
          // 搜索 POI 获取详情
          const poiResult = await mcpClient.searchPOI({
            keywords: attraction.name,
            city: userInput.destination,
            cityLimit: true,
            pageSize: 1,
          })

          let enriched: EnrichedAttraction = {
            name: attraction.name,
            address: attraction.address,
            location: attraction.location
              ? {
                  name: attraction.name,
                  address: attraction.address || userInput.destination,
                  lat: attraction.location.lat,
                  lng: attraction.location.lng,
                }
              : undefined,
            type: attraction.type as any,
          }

          if (poiResult && poiResult.pois.length > 0) {
            const poi = poiResult.pois[0]

            // 从 POI 提取信息
            enriched = {
              ...enriched,
              poiId: poi.id,
              category: poi.type,
              tel: poi.tel,
              photos: poi.photos,
              address: poi.address || enriched.address,
            }

            // 提取评分
            if (poi.rating) {
              const rating = parseFloat(poi.rating)
              if (!isNaN(rating)) {
                enriched.rating = rating
              }
            }

            // 估算门票价格
            enriched.ticketPrice = estimateTicketPrice(attraction.name, poi.type, poi.typecode)
          } else {
            // 没有找到 POI，使用估算
            enriched.ticketPrice = estimateTicketPrice(attraction.name)
          }

          // 推断开放时间
          enriched.openingHours = inferOpeningHours(attraction.name, enriched.category)

          // 推断游玩时长
          enriched.recommendedDuration = attraction.duration || inferDuration(attraction.name)

          // 生成标签
          enriched.tags = generateTags(attraction.name, enriched.category, enriched.ticketPrice)

          // 累计门票费用（按人数计算）
          if (enriched.ticketPrice) {
            totalTicketCost += enriched.ticketPrice * userInput.travelers
          }

          enrichedAttractions.push(enriched)

          // 添加延迟避免 API 限流
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.warn(`[Attraction Enricher] Failed to enrich ${attraction.name}:`, error)
          errors.push(`Failed to enrich ${attraction.name}: ${(error as Error).message}`)

          // 即使失败也添加基本信息
          enrichedAttractions.push({
            name: attraction.name,
            address: attraction.address,
            location: attraction.location
              ? {
                  name: attraction.name,
                  address: attraction.address || userInput.destination,
                  lat: attraction.location.lat,
                  lng: attraction.location.lng,
                }
              : undefined,
            type: attraction.type as any,
            ticketPrice: estimateTicketPrice(attraction.name),
            openingHours: inferOpeningHours(attraction.name),
            recommendedDuration: attraction.duration || inferDuration(attraction.name),
            tags: generateTags(attraction.name),
          })
        }
      }

      // 如果有 AI API Key，使用 AI 进一步增强信息
      if (config.apiKey && enrichedAttractions.length > 0) {
        try {
          console.log('[Attraction Enricher] Using AI to enhance attraction details...')

          const client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
          })

          // 构建用户消息
          const userMessage = buildAttractionEnricherUserMessage({
            destination: userInput.destination,
            attractions: enrichedAttractions.map(a => ({
              name: a.name,
              address: a.address,
              location: a.location,
              type: a.type,
              duration: a.recommendedDuration,
              poiData: {
                id: a.poiId,
                type: a.category,
                tel: a.tel,
                photos: a.photos,
                rating: a.rating?.toString(),
              },
            })),
            travelers: userInput.travelers,
            adultCount: userInput.adult_count,
            childCount: userInput.child_count,
          })

          const completion = await client.chat.completions.create({
            model: config.model || 'deepseek-chat',
            messages: [
              { role: 'system', content: ATTRACTION_ENRICHER_SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            max_tokens: 4000,
            temperature: 0.7,
          })

          const responseText = completion.choices[0]?.message?.content || ''
          const aiEnriched = parseAttractionEnricherResponse(responseText)

          // 合并 AI 增强的信息
          if (aiEnriched.enrichedAttractions.length > 0) {
            aiEnriched.enrichedAttractions.forEach((aiAttraction, index) => {
              if (index < enrichedAttractions.length) {
                // 保留 POI 数据，合并 AI 增强的信息
                enrichedAttractions[index] = {
                  ...enrichedAttractions[index],
                  ...aiAttraction,
                  // 保留原始 POI 数据
                  poiId: enrichedAttractions[index].poiId,
                  photos: enrichedAttractions[index].photos || aiAttraction.photos,
                  tel: enrichedAttractions[index].tel || aiAttraction.tel,
                  rating: enrichedAttractions[index].rating || aiAttraction.rating,
                }
              }
            })

            // 更新门票总费用（如果 AI 提供了更准确的价格）
            if (aiEnriched.totalTicketCost > 0) {
              totalTicketCost = aiEnriched.totalTicketCost * userInput.travelers
            }
          }
        } catch (aiError) {
          console.warn('[Attraction Enricher] AI enhancement failed:', aiError)
          errors.push(`AI enhancement failed: ${(aiError as Error).message}`)
        }
      }

      const duration = Date.now() - startTime
      console.log(`[Attraction Enricher] Completed in ${duration}ms`)
      console.log(`[Attraction Enricher] Enriched ${enrichedAttractions.length} attractions, total ticket cost: ¥${totalTicketCost}`)

      return {
        attractionEnrichment: {
          enrichedAttractions,
          totalAttractions: allAttractions.length,
          enrichedCount: enrichedAttractions.filter(a => a.poiId).length,
          totalTicketCost,
          errors: errors.length > 0 ? errors : undefined,
        },
      }
    } catch (error) {
      console.error('[Attraction Enricher] Error:', error)

      return {
        attractionEnrichment: {
          enrichedAttractions: [],
          totalAttractions: 0,
          enrichedCount: 0,
          totalTicketCost: 0,
          errors: [(error as Error).message],
        },
      }
    }
  }
}

/**
 * 默认导出
 */
export default createAttractionEnricherAgent
