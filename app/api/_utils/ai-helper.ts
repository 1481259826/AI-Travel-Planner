/**
 * AI 生成行程辅助函数
 */

import OpenAI from 'openai'
import type { TripFormData, Itinerary, AIModel } from '@/types'
import { AIModelError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'

/**
 * AI 客户端配置
 */
export interface AIClientConfig {
  apiKey: string
  baseURL: string
}

/**
 * 创建 OpenAI 兼容客户端
 */
export function createAIClient(config: AIClientConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })
}

/**
 * 构建行程生成提示词
 */
export function buildItineraryPrompt(
  formData: TripFormData,
  weatherInfo?: string
): string {
  // 计算天数
  const startDate = new Date(formData.start_date)
  const endDate = new Date(formData.end_date)
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // 酒店偏好
  const hotelPreferencesText =
    formData.hotel_preferences && formData.hotel_preferences.length > 0
      ? `\n酒店偏好：${formData.hotel_preferences.join('、')}`
      : ''

  // 时间信息
  const timeInfo = []
  if (formData.start_time) {
    timeInfo.push(`到达时间：${formData.start_time}`)
  }
  if (formData.end_time) {
    timeInfo.push(`离开时间：${formData.end_time}`)
  }
  const timeInfoText = timeInfo.length > 0 ? `\n${timeInfo.join('，')}` : ''

  // 天气信息
  const weatherText = weatherInfo ? `\n${weatherInfo}` : ''

  return `你是一个专业的旅行规划师。根据以下信息生成详细的旅行计划：

出发地：${formData.origin || '未指定'}
目的地：${formData.destination}
日期：${formData.start_date} 至 ${formData.end_date}（共 ${days} 天）${timeInfoText}
预算：¥${formData.budget}
人数：${formData.travelers} 人（成人 ${formData.adult_count} 人，儿童 ${formData.child_count} 人）
偏好：${formData.preferences.join('、') || '无特殊偏好'}${hotelPreferencesText}
${formData.additional_notes ? `补充说明：${formData.additional_notes}` : ''}${weatherText}

${formData.start_time ? `注意：第一天的行程需要考虑到达时间${formData.start_time}，请合理安排首日活动的开始时间。` : ''}
${formData.end_time ? `注意：最后一天的行程需要考虑离开时间${formData.end_time}，请确保在此之前完成所有活动并留出前往机场/车站的时间。` : ''}

请生成一个详细的旅行计划，以 JSON 格式返回，包含以下内容：

{
  "summary": "行程总体概述（2-3句话）",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00",
          "name": "活动名称",
          "type": "attraction",
          "location": {
            "name": "地点名称",
            "address": "详细地址",
            "lat": 纬度,
            "lng": 经度
          },
          "duration": "2小时",
          "description": "活动描述",
          "ticket_price": 门票价格（数字）
        }
      ],
      "meals": [
        {
          "time": "12:00",
          "type": "lunch",
          "restaurant": "餐厅名称",
          "location": {
            "name": "餐厅位置",
            "address": "详细地址",
            "lat": 纬度,
            "lng": 经度
          },
          "cuisine": "菜系",
          "estimated_cost": 人均费用（数字）
        }
      ]
    }
  ],
  "accommodation": [
    {
      "name": "酒店名称",
      "type": "hotel",
      "location": {
        "name": "酒店位置",
        "address": "详细地址",
        "lat": 纬度,
        "lng": 经度
      },
      "check_in": "YYYY-MM-DD",
      "check_out": "YYYY-MM-DD",
      "price_per_night": 每晚价格（数字）,
      "rating": 评分（3.5-5.0）,
      "amenities": ["设施1", "设施2"]
    }
  ],
  "transportation": {
    "to_destination": {
      "mode": "交通方式",
      "details": "详细信息",
      "cost": 费用（数字）
    },
    "from_destination": {
      "mode": "交通方式",
      "details": "详细信息",
      "cost": 费用（数字）
    },
    "local": {
      "modes": ["当地交通方式"],
      "estimated_daily_cost": 每日预估费用（数字）
    }
  },
  "estimated_cost": {
    "accommodation": 住宿总费用,
    "transportation": 交通总费用,
    "food": 餐饮总费用,
    "attractions": 景点总费用,
    "other": 其他费用,
    "total": 总费用
  }
}

注意事项：
1. 确保每日行程安排合理，时间不要太紧张
2. 考虑景点之间的距离和交通时间
3. 推荐当地特色美食和知名餐厅
4. **费用估算要尽量准确**
5. **每个活动和餐厅的 location 必须包含真实准确的经纬度坐标（lat, lng）**
6. 经纬度必须是数字类型
7. 请使用真实存在的景点和餐厅
8. **地理位置优化**：同一天内相邻景点应该在地理位置上相对靠近
9. **酒店推荐**：根据行程天数和区域合理推荐酒店数量
10. 请直接返回 JSON，不要包含任何其他文字说明`
}

/**
 * 调用 AI 生成行程
 */
export async function generateItinerary(
  client: OpenAI,
  model: string,
  prompt: string,
  maxTokens: number
): Promise<Itinerary> {
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    })

    const responseText = completion.choices[0]?.message?.content || ''

    if (!responseText) {
      throw new AIModelError('AI 返回内容为空', model)
    }

    // 提取 JSON（移除可能的 markdown 代码块）
    const jsonMatch =
      responseText.match(/```json\n([\s\S]*?)\n```/) ||
      responseText.match(/```\n([\s\S]*?)\n```/)
    const jsonString = jsonMatch ? jsonMatch[1] : responseText

    const itinerary = JSON.parse(jsonString) as Itinerary

    logger.info('AI 行程生成成功', {
      model,
      days: itinerary.days?.length || 0,
    })

    return itinerary
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error('AI 响应 JSON 解析失败', { error })
      throw new AIModelError('AI 返回的数据格式无效', model)
    }

    logger.error('AI 行程生成失败', { error })
    throw new AIModelError(
      error instanceof Error ? error.message : 'AI 调用失败',
      model
    )
  }
}
