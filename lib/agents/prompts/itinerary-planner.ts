/**
 * 核心规划 Agent System Prompt
 * Itinerary Planner Agent - 生成行程骨架
 */

import type { StrategyTag } from '../state'

export const ITINERARY_PLANNER_SYSTEM_PROMPT = `你是一位专业的旅行规划师，负责根据用户需求和天气策略生成行程框架。

## 你的任务

生成一个详细的行程框架（草稿），包含：
1. 每天的景点安排
2. 餐饮时间槽
3. 景点门票估算

## 规划原则

### 1. 天气策略应用
根据提供的天气策略标签调整行程：
- **indoor_priority**: 每天至少安排 1 个室内景点
- **hot_weather**: 避免中午 12:00-14:00 安排户外活动
- **cold_weather**: 减少早晚户外活动
- **rain_prepared**: 备选室内方案
- **outdoor_friendly**: 可以安排更多户外活动

### 2. 时间安排
- 上午：09:00-12:00（2-3 个活动）
- 中午：12:00-14:00（午餐 + 休息）
- 下午：14:00-18:00（2-3 个活动）
- 晚上：18:00-21:00（晚餐 + 夜景/夜市）

### 3. 地理优化
- 同一天的景点应在地理位置上相近
- 考虑景点之间的合理交通时间
- 避免大量往返奔波

### 4. 活动类型
- attraction: 景点游览
- shopping: 购物
- entertainment: 娱乐活动
- relaxation: 休闲放松

### 5. 餐饮安排
- breakfast: 早餐（08:00-09:00）
- lunch: 午餐（12:00-13:30）
- dinner: 晚餐（18:00-20:00）
- snack: 小吃/下午茶（可选）

## 输出格式

请以 JSON 格式返回，结构如下：

\`\`\`json
{
  "days": [
    {
      "day": 1,
      "date": "2025-01-01",
      "attractions": [
        {
          "time": "09:00",
          "name": "景点名称",
          "duration": "2小时",
          "type": "attraction"
        }
      ],
      "mealSlots": [
        {
          "time": "12:00",
          "mealType": "lunch",
          "cuisine": "当地特色"
        }
      ]
    }
  ],
  "totalAttractions": 8,
  "totalMeals": 6,
  "estimatedAttractionCost": 500
}
\`\`\`

## 注意事项

1. 每天安排 4-6 个活动（包含景点和购物等）
2. 每天安排 2-3 顿正餐
3. 活动时间要合理，留足交通和休息时间
4. 门票估算使用当地实际价格
5. 第一天考虑到达时间，最后一天考虑离开时间
6. 直接返回 JSON，不要包含其他说明文字`

/**
 * 构建行程规划用户消息
 */
export function buildItineraryPlannerUserMessage(params: {
  destination: string
  origin?: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  budget: number
  travelers: number
  adultCount: number
  childCount: number
  preferences: string[]
  hotelPreferences?: string[]
  additionalNotes?: string
  strategyTags: StrategyTag[]
  clothingAdvice?: string
  weatherWarnings?: string[]
}): string {
  const {
    destination,
    origin,
    startDate,
    endDate,
    startTime,
    endTime,
    budget,
    travelers,
    adultCount,
    childCount,
    preferences,
    hotelPreferences,
    additionalNotes,
    strategyTags,
    clothingAdvice,
    weatherWarnings,
  } = params

  // 计算天数
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  let message = `请为以下旅行生成行程框架：

**基本信息**
- 目的地：${destination}
${origin ? `- 出发地：${origin}` : ''}
- 日期：${startDate} 至 ${endDate}（共 ${days} 天）
${startTime ? `- 到达时间：${startTime}` : ''}
${endTime ? `- 离开时间：${endTime}` : ''}
- 预算：¥${budget}
- 人数：${travelers} 人（成人 ${adultCount} 人，儿童 ${childCount} 人）

**偏好**
- 旅行偏好：${preferences.length > 0 ? preferences.join('、') : '无特殊偏好'}
${hotelPreferences && hotelPreferences.length > 0 ? `- 酒店偏好：${hotelPreferences.join('、')}` : ''}
${additionalNotes ? `- 补充说明：${additionalNotes}` : ''}

**天气策略**
- 策略标签：${strategyTags.length > 0 ? strategyTags.join('、') : '无特殊策略'}
${clothingAdvice ? `- 穿衣建议：${clothingAdvice}` : ''}
${weatherWarnings && weatherWarnings.length > 0 ? `- 天气警告：${weatherWarnings.join('；')}` : ''}`

  if (startTime) {
    message += `\n\n**特别注意**：第一天需要考虑到达时间 ${startTime}，请合理安排首日活动。`
  }
  if (endTime) {
    message += `\n**特别注意**：最后一天需要考虑离开时间 ${endTime}，请确保在此之前完成所有活动。`
  }

  message += `\n\n请生成详细的行程框架。`

  return message
}
