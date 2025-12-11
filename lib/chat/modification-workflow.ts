/**
 * 智能重规划工作流
 * 实现 Phase 3 智能优化功能
 * - optimizeRoute: 路线优化算法
 * - replanDay: AI 驱动的重新规划
 * - adjustForWeather: 天气适应调整
 */

import OpenAI from 'openai'
import type { Itinerary, DayPlan, Activity, Location } from '@/types'
import { getMCPClient, type MCPClient } from '../agents/mcp-client'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * AI 配置
 */
interface AIConfig {
  apiKey: string
  baseURL: string
  model?: string
}

/**
 * 路线优化结果
 */
export interface RouteOptimizationResult {
  optimizedDay: DayPlan
  totalDistanceSaved: number // 节省的距离（米）
  totalTimeSaved: number // 节省的时间（分钟）
  reorderedActivities: string[] // 重排序后的活动名称
}

/**
 * 重规划结果
 */
export interface ReplanDayResult {
  replannedDay: DayPlan
  newActivities: Activity[]
  removedActivities: string[]
  reason: string
}

/**
 * 天气适应结果
 */
export interface WeatherAdjustmentResult {
  adjustedDay: DayPlan
  replacements: Array<{
    original: string
    replacement: string
    reason: string
  }>
  weatherContext: {
    condition: string
    temperature: string
    strategy: 'indoor' | 'outdoor' | 'mixed'
  }
}

/**
 * 重规划约束条件
 */
export interface ReplanConstraints {
  keepAttractions?: string[] // 保留的景点
  excludeAttractions?: string[] // 排除的景点
  preferences?: string[] // 新增偏好
  budgetAdjustment?: number // 预算调整
  reason?: string // 重规划原因
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: 'deepseek-chat',
}

// ============================================================================
// 路线优化算法
// ============================================================================

/**
 * 优化某天的路线顺序
 * 使用贪心算法最小化总交通时间
 */
export async function optimizeRoute(
  day: DayPlan,
  city: string,
  options?: {
    mcpClient?: MCPClient
    startLocation?: Location // 起点位置（如酒店）
  }
): Promise<RouteOptimizationResult> {
  const mcpClient = options?.mcpClient || getMCPClient()

  // 提取有坐标的活动
  const activitiesWithLocation = day.activities.filter(
    (a) => a.location?.lat && a.location?.lng
  )

  if (activitiesWithLocation.length < 2) {
    // 不需要优化
    return {
      optimizedDay: day,
      totalDistanceSaved: 0,
      totalTimeSaved: 0,
      reorderedActivities: day.activities.map((a) => a.name),
    }
  }

  // 计算当前路线的总距离和时间
  const originalMetrics = await calculateRouteMetrics(
    activitiesWithLocation,
    mcpClient
  )

  // 使用最近邻算法优化顺序
  const optimizedActivities = await nearestNeighborOptimization(
    activitiesWithLocation,
    mcpClient,
    options?.startLocation
  )

  // 计算优化后的指标
  const optimizedMetrics = await calculateRouteMetrics(
    optimizedActivities,
    mcpClient
  )

  // 重新分配时间
  const retimedActivities = redistributeTime(optimizedActivities, day.activities[0]?.time || '09:00')

  // 合并没有坐标的活动（保持原位置）
  const activitiesWithoutLocation = day.activities.filter(
    (a) => !a.location?.lat || !a.location?.lng
  )

  // 构建优化后的 DayPlan
  const optimizedDay: DayPlan = {
    ...day,
    activities: mergeActivities(retimedActivities, activitiesWithoutLocation),
  }

  return {
    optimizedDay,
    totalDistanceSaved: Math.max(0, originalMetrics.distance - optimizedMetrics.distance),
    totalTimeSaved: Math.max(0, originalMetrics.time - optimizedMetrics.time),
    reorderedActivities: optimizedDay.activities.map((a) => a.name),
  }
}

/**
 * 计算路线总距离和时间
 */
async function calculateRouteMetrics(
  activities: Activity[],
  mcpClient: MCPClient
): Promise<{ distance: number; time: number }> {
  let totalDistance = 0
  let totalTime = 0

  for (let i = 0; i < activities.length - 1; i++) {
    const from = activities[i]
    const to = activities[i + 1]

    if (!from.location || !to.location) continue

    try {
      const route = await mcpClient.getDrivingRoute(
        `${from.location.lng},${from.location.lat}`,
        `${to.location.lng},${to.location.lat}`
      )

      if (route) {
        totalDistance += route.distance
        totalTime += route.duration / 60 // 转换为分钟
      }
    } catch {
      // 忽略路线计算错误
    }
  }

  return { distance: totalDistance, time: totalTime }
}

/**
 * 最近邻优化算法
 */
async function nearestNeighborOptimization(
  activities: Activity[],
  mcpClient: MCPClient,
  startLocation?: Location
): Promise<Activity[]> {
  if (activities.length < 2) return activities

  const remaining = [...activities]
  const optimized: Activity[] = []

  // 确定起点
  let currentLocation: Location
  if (startLocation) {
    currentLocation = startLocation
  } else {
    // 使用第一个活动作为起点
    const first = remaining.shift()!
    optimized.push(first)
    currentLocation = first.location!
  }

  // 贪心选择最近的下一个点
  while (remaining.length > 0) {
    let nearestIdx = 0
    let nearestDistance = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const activity = remaining[i]
      if (!activity.location) continue

      // 计算直线距离（简化计算）
      const distance = haversineDistance(
        currentLocation.lat,
        currentLocation.lng,
        activity.location.lat,
        activity.location.lng
      )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIdx = i
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0]
    optimized.push(nearest)
    currentLocation = nearest.location!
  }

  return optimized
}

/**
 * Haversine 公式计算两点间直线距离（米）
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // 地球半径（米）
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * 重新分配活动时间
 */
function redistributeTime(activities: Activity[], startTime: string): Activity[] {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  let currentMinutes = startHour * 60 + startMinute

  return activities.map((activity) => {
    const hours = Math.floor(currentMinutes / 60)
    const minutes = currentMinutes % 60
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    // 解析持续时间
    const durationMatch = activity.duration?.match(/(\d+)/)
    const durationHours = durationMatch ? parseInt(durationMatch[1]) : 2

    // 加上活动时间和交通时间（估计30分钟）
    currentMinutes += durationHours * 60 + 30

    return {
      ...activity,
      time,
    }
  })
}

/**
 * 合并有坐标和无坐标的活动
 */
function mergeActivities(
  optimized: Activity[],
  withoutLocation: Activity[]
): Activity[] {
  // 将无坐标的活动按原时间插入
  const all = [...optimized, ...withoutLocation]
  return all.sort((a, b) => {
    const timeA = a.time.replace(':', '')
    const timeB = b.time.replace(':', '')
    return timeA.localeCompare(timeB)
  })
}

// ============================================================================
// AI 重新规划
// ============================================================================

/**
 * 使用 AI 重新规划某天的行程
 */
export async function replanDay(
  day: DayPlan,
  itinerary: Itinerary,
  constraints: ReplanConstraints,
  destination: string,
  aiConfig?: Partial<AIConfig>
): Promise<ReplanDayResult> {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  if (!config.apiKey) {
    throw new Error('AI API Key 未配置')
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  // 构建系统提示词
  const systemPrompt = buildReplanSystemPrompt()

  // 构建用户消息
  const userMessage = buildReplanUserMessage(day, constraints, destination)

  console.log('[ReplanDay] Calling AI for day replanning...')

  const completion = await client.chat.completions.create({
    model: config.model || 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  })

  const responseText = completion.choices[0]?.message?.content || ''

  // 解析 AI 响应
  const result = parseReplanResponse(responseText, day)

  // 使用 MCP 补充坐标
  const mcpClient = getMCPClient()
  const enrichedActivities = await enrichActivitiesWithCoordinates(
    result.replannedDay.activities,
    destination
  )

  return {
    ...result,
    replannedDay: {
      ...result.replannedDay,
      activities: enrichedActivities,
    },
  }
}

/**
 * 构建重规划系统提示词
 */
function buildReplanSystemPrompt(): string {
  return `你是一个专业的旅行规划师。用户需要重新规划某天的行程。

你需要根据用户的约束条件，生成新的一天行程安排。

输出格式（JSON）：
\`\`\`json
{
  "activities": [
    {
      "time": "09:00",
      "name": "景点名称",
      "type": "attraction",
      "duration": "2小时",
      "description": "简短描述"
    }
  ],
  "reason": "重规划原因说明"
}
\`\`\`

注意事项：
1. 保留用户指定要保留的景点
2. 排除用户指定要排除的景点
3. 根据用户偏好推荐新景点
4. 合理安排时间，考虑交通和休息
5. 早上一般从 9:00 开始，晚上不超过 21:00
6. 每个景点预留合理的游玩时间`
}

/**
 * 构建重规划用户消息
 */
function buildReplanUserMessage(
  day: DayPlan,
  constraints: ReplanConstraints,
  destination: string
): string {
  let message = `请重新规划以下行程的第 ${day.day} 天（${day.date}）：

**目的地**: ${destination || '未知'}

**当前行程**:
${day.activities.map((a) => `- ${a.time} ${a.name} (${a.duration || '2小时'})`).join('\n')}
`

  if (constraints.reason) {
    message += `\n**重规划原因**: ${constraints.reason}`
  }

  if (constraints.keepAttractions?.length) {
    message += `\n**必须保留的景点**: ${constraints.keepAttractions.join('、')}`
  }

  if (constraints.excludeAttractions?.length) {
    message += `\n**需要排除的景点**: ${constraints.excludeAttractions.join('、')}`
  }

  if (constraints.preferences?.length) {
    message += `\n**偏好**: ${constraints.preferences.join('、')}`
  }

  message += '\n\n请生成新的一天行程安排。'

  return message
}

/**
 * 解析 AI 重规划响应
 */
function parseReplanResponse(
  responseText: string,
  originalDay: DayPlan
): ReplanDayResult {
  try {
    // 提取 JSON
    const jsonMatch =
      responseText.match(/```json\n([\s\S]*?)\n```/) ||
      responseText.match(/```\n([\s\S]*?)\n```/) ||
      responseText.match(/\{[\s\S]*\}/)

    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText
    const parsed = JSON.parse(jsonString)

    // 转换活动格式
    const newActivities: Activity[] = (parsed.activities || []).map((a: any) => ({
      time: a.time || '09:00',
      name: a.name || '未知景点',
      type: a.type || 'attraction',
      duration: a.duration || '2小时',
      description: a.description || '',
      location: {
        name: a.name || '未知景点',
        address: '',
        lat: 0,
        lng: 0,
      },
    }))

    // 找出被删除的活动
    const removedActivities = originalDay.activities
      .filter((orig) => !newActivities.some((n) => n.name === orig.name))
      .map((a) => a.name)

    return {
      replannedDay: {
        ...originalDay,
        activities: newActivities,
      },
      newActivities: newActivities.filter(
        (n) => !originalDay.activities.some((orig) => orig.name === n.name)
      ),
      removedActivities,
      reason: parsed.reason || '根据约束条件重新规划',
    }
  } catch (error) {
    console.warn('[ReplanDay] Failed to parse AI response:', error)
    // 返回原始行程
    return {
      replannedDay: originalDay,
      newActivities: [],
      removedActivities: [],
      reason: '解析失败，保持原行程',
    }
  }
}

// ============================================================================
// 天气适应调整
// ============================================================================

/**
 * 根据天气调整行程
 */
export async function adjustForWeather(
  day: DayPlan,
  destination: string,
  aiConfig?: Partial<AIConfig>
): Promise<WeatherAdjustmentResult> {
  const mcpClient = getMCPClient()

  // 获取天气预报
  const weather = await mcpClient.getWeatherForecast(destination || '')

  if (!weather || !weather.forecasts.length) {
    return {
      adjustedDay: day,
      replacements: [],
      weatherContext: {
        condition: '未知',
        temperature: '未知',
        strategy: 'mixed',
      },
    }
  }

  // 找到对应日期的天气
  const dayWeather = weather.forecasts.find((f) => f.date === day.date) || weather.forecasts[0]

  // 判断天气策略
  const strategy = determineWeatherStrategy(dayWeather.dayweather, dayWeather.daytemp)

  // 如果天气适合户外，不需要调整
  if (strategy === 'outdoor') {
    return {
      adjustedDay: day,
      replacements: [],
      weatherContext: {
        condition: dayWeather.dayweather,
        temperature: `${dayWeather.daytemp}°C`,
        strategy: 'outdoor',
      },
    }
  }

  // 需要调整：使用 AI 替换户外景点为室内景点
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  if (!config.apiKey) {
    // 没有 AI 配置，返回原行程
    return {
      adjustedDay: day,
      replacements: [],
      weatherContext: {
        condition: dayWeather.dayweather,
        temperature: `${dayWeather.daytemp}°C`,
        strategy,
      },
    }
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  // 识别户外景点并替换
  const outdoorActivities = identifyOutdoorActivities(day.activities)

  if (outdoorActivities.length === 0) {
    return {
      adjustedDay: day,
      replacements: [],
      weatherContext: {
        condition: dayWeather.dayweather,
        temperature: `${dayWeather.daytemp}°C`,
        strategy,
      },
    }
  }

  // 调用 AI 获取替换建议
  const systemPrompt = `你是一个旅行规划师。由于天气原因（${dayWeather.dayweather}），需要将户外景点替换为室内景点。

输出格式（JSON）：
\`\`\`json
{
  "replacements": [
    {
      "original": "原景点名称",
      "replacement": "替换景点名称",
      "reason": "替换原因"
    }
  ]
}
\`\`\``

  const userMessage = `目的地：${destination}
天气：${dayWeather.dayweather}，${dayWeather.daytemp}°C

需要替换的户外景点：
${outdoorActivities.map((a) => `- ${a.name}`).join('\n')}

请推荐合适的室内替代景点。`

  try {
    const completion = await client.chat.completions.create({
      model: config.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const parsed = parseWeatherAdjustmentResponse(responseText)

    // 应用替换
    const adjustedActivities = applyReplacements(day.activities, parsed.replacements)

    // 补充坐标
    const enrichedActivities = await enrichActivitiesWithCoordinates(
      adjustedActivities,
      destination || ''
    )

    return {
      adjustedDay: {
        ...day,
        activities: enrichedActivities,
      },
      replacements: parsed.replacements,
      weatherContext: {
        condition: dayWeather.dayweather,
        temperature: `${dayWeather.daytemp}°C`,
        strategy,
      },
    }
  } catch (error) {
    console.error('[AdjustForWeather] AI call failed:', error)
    return {
      adjustedDay: day,
      replacements: [],
      weatherContext: {
        condition: dayWeather.dayweather,
        temperature: `${dayWeather.daytemp}°C`,
        strategy,
      },
    }
  }
}

/**
 * 判断天气策略
 */
function determineWeatherStrategy(
  weather: string,
  temp: string
): 'indoor' | 'outdoor' | 'mixed' {
  const badWeatherKeywords = ['雨', '雪', '暴', '雷', '冰']
  const temperature = parseInt(temp) || 20

  // 恶劣天气 -> 室内
  if (badWeatherKeywords.some((k) => weather.includes(k))) {
    return 'indoor'
  }

  // 极端温度 -> 室内
  if (temperature < 5 || temperature > 35) {
    return 'indoor'
  }

  // 温和温度 -> 户外
  if (temperature >= 15 && temperature <= 28) {
    return 'outdoor'
  }

  return 'mixed'
}

/**
 * 识别户外景点
 */
function identifyOutdoorActivities(activities: Activity[]): Activity[] {
  const outdoorKeywords = [
    '公园', '湖', '山', '海', '沙滩', '广场', '步行街',
    '古镇', '古城', '景区', '森林', '草原', '峡谷', '瀑布',
  ]

  return activities.filter((a) =>
    outdoorKeywords.some((k) => a.name.includes(k) || a.description?.includes(k))
  )
}

/**
 * 解析天气调整响应
 */
function parseWeatherAdjustmentResponse(responseText: string): {
  replacements: Array<{ original: string; replacement: string; reason: string }>
} {
  try {
    const jsonMatch =
      responseText.match(/```json\n([\s\S]*?)\n```/) ||
      responseText.match(/```\n([\s\S]*?)\n```/) ||
      responseText.match(/\{[\s\S]*\}/)

    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText
    const parsed = JSON.parse(jsonString)

    return {
      replacements: parsed.replacements || [],
    }
  } catch {
    return { replacements: [] }
  }
}

/**
 * 应用景点替换
 */
function applyReplacements(
  activities: Activity[],
  replacements: Array<{ original: string; replacement: string; reason: string }>
): Activity[] {
  return activities.map((activity) => {
    const replacement = replacements.find((r) => r.original === activity.name)

    if (replacement) {
      return {
        ...activity,
        name: replacement.replacement,
        description: `${replacement.reason}（原计划：${activity.name}）`,
        location: {
          name: replacement.replacement,
          address: '',
          lat: 0,
          lng: 0,
        },
      }
    }

    return activity
  })
}

// ============================================================================
// 共享辅助函数
// ============================================================================

/**
 * 使用 MCP 补充活动坐标
 */
async function enrichActivitiesWithCoordinates(
  activities: Activity[],
  city: string
): Promise<Activity[]> {
  const mcpClient = getMCPClient()
  const enriched: Activity[] = []

  for (const activity of activities) {
    // 如果已有坐标，跳过
    if (activity.location?.lat && activity.location?.lng) {
      enriched.push(activity)
      continue
    }

    try {
      const poiResult = await mcpClient.searchPOI({
        keywords: activity.name,
        city,
        cityLimit: true,
        pageSize: 1,
      })

      if (poiResult && poiResult.pois.length > 0) {
        const poi = poiResult.pois[0]
        const [lng, lat] = poi.location.split(',').map(Number)

        enriched.push({
          ...activity,
          location: {
            name: poi.name,
            address: poi.address || city,
            lat,
            lng,
          },
        })
      } else {
        enriched.push(activity)
      }

      // 添加延迟避免 API 限流
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch {
      enriched.push(activity)
    }
  }

  return enriched
}

// ============================================================================
// 导出
// ============================================================================

export default {
  optimizeRoute,
  replanDay,
  adjustForWeather,
}
