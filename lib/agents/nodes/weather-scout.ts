/**
 * Weather Scout Agent 节点
 * 天气感知 Agent - 获取天气预报并生成策略标签
 */

import OpenAI from 'openai'
import type { TripState, TripStateUpdate, WeatherOutput, StrategyTag } from '../state'
import { getMCPClient } from '../mcp-client'
import {
  WEATHER_SCOUT_SYSTEM_PROMPT,
  buildWeatherScoutUserMessage,
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
 * 创建 Weather Scout Agent
 * @param aiConfig 可选的 AI 配置
 */
export function createWeatherScoutAgent(aiConfig?: Partial<AIClientConfig>) {
  const config = { ...DEFAULT_AI_CONFIG, ...aiConfig }

  /**
   * Weather Scout Agent 节点函数
   */
  return async function weatherScoutAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Weather Scout] Starting weather analysis...')
    const startTime = Date.now()

    try {
      const { userInput } = state
      const { destination, start_date, end_date } = userInput

      // 1. 获取天气数据
      console.log(`[Weather Scout] Fetching weather for ${destination}...`)
      const mcpClient = getMCPClient()
      const weatherData = await mcpClient.getWeatherForecast(destination)

      if (!weatherData || !weatherData.forecasts) {
        console.warn('[Weather Scout] No weather data available, using defaults')
        return {
          weather: {
            forecasts: [],
            strategyTags: ['outdoor_friendly'],
            clothingAdvice: '请根据当地实际天气情况穿着',
            warnings: [],
          },
        }
      }

      console.log(`[Weather Scout] Got ${weatherData.forecasts.length} days of forecasts`)

      // 2. 调用 AI 分析天气
      if (!config.apiKey) {
        console.warn('[Weather Scout] No API key configured, using rule-based analysis')
        return {
          weather: analyzeWeatherWithRules(weatherData.forecasts),
        }
      }

      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })

      const userMessage = buildWeatherScoutUserMessage(
        destination,
        start_date,
        end_date,
        weatherData.forecasts
      )

      console.log('[Weather Scout] Calling AI for analysis...')
      const completion = await client.chat.completions.create({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: WEATHER_SCOUT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      })

      const responseText = completion.choices[0]?.message?.content || ''

      // 3. 解析 AI 响应
      const analysis = parseWeatherAnalysis(responseText)

      const weather: WeatherOutput = {
        forecasts: weatherData.forecasts.map(f => ({
          date: f.date,
          dayweather: f.dayweather,
          nightweather: f.nightweather,
          daytemp: f.daytemp,
          nighttemp: f.nighttemp,
          daywind: f.daywind,
          nightwind: f.nightwind,
          daypower: f.daypower,
          nightpower: f.nightpower,
        })),
        strategyTags: analysis.strategyTags,
        clothingAdvice: analysis.clothingAdvice,
        warnings: analysis.warnings,
      }

      const duration = Date.now() - startTime
      console.log(`[Weather Scout] Completed in ${duration}ms`)
      console.log(`[Weather Scout] Strategy tags: ${weather.strategyTags.join(', ')}`)

      return { weather }
    } catch (error) {
      console.error('[Weather Scout] Error:', error)

      // 返回安全的默认值
      return {
        weather: {
          forecasts: [],
          strategyTags: ['outdoor_friendly'],
          clothingAdvice: '请根据当地实际天气情况穿着',
          warnings: [],
        },
      }
    }
  }
}

/**
 * 解析 AI 返回的天气分析结果
 */
function parseWeatherAnalysis(responseText: string): {
  strategyTags: StrategyTag[]
  clothingAdvice: string
  warnings: string[]
} {
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

    // 验证策略标签
    const validTags: StrategyTag[] = [
      'indoor_priority',
      'outdoor_friendly',
      'rain_prepared',
      'cold_weather',
      'hot_weather',
    ]

    const strategyTags = (parsed.strategyTags || []).filter(
      (tag: string) => validTags.includes(tag as StrategyTag)
    ) as StrategyTag[]

    return {
      strategyTags: strategyTags.length > 0 ? strategyTags : ['outdoor_friendly'],
      clothingAdvice: parsed.clothingAdvice || '请根据当地实际天气情况穿着',
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    }
  } catch (error) {
    console.warn('[Weather Scout] Failed to parse AI response, using defaults')
    return {
      strategyTags: ['outdoor_friendly'],
      clothingAdvice: '请根据当地实际天气情况穿着',
      warnings: [],
    }
  }
}

/**
 * 基于规则的天气分析（备用方案）
 */
function analyzeWeatherWithRules(forecasts: Array<{
  date: string
  dayweather: string
  nightweather: string
  daytemp: string
  nighttemp: string
  daypower: string
}>): WeatherOutput {
  const strategyTags: StrategyTag[] = []
  const warnings: string[] = []

  let hasRain = false
  let maxTemp = -Infinity
  let minTemp = Infinity

  for (const forecast of forecasts) {
    const weather = forecast.dayweather + forecast.nightweather
    const dayTemp = parseInt(forecast.daytemp)
    const nightTemp = parseInt(forecast.nighttemp)

    // 检查降雨
    if (weather.includes('雨')) {
      hasRain = true
      if (weather.includes('暴雨') || weather.includes('大雨')) {
        warnings.push(`${forecast.date} 有${weather.includes('暴雨') ? '暴雨' : '大雨'}预警`)
      }
    }

    // 记录温度范围
    if (dayTemp > maxTemp) maxTemp = dayTemp
    if (nightTemp < minTemp) minTemp = nightTemp
  }

  // 生成策略标签
  if (hasRain) {
    strategyTags.push('indoor_priority', 'rain_prepared')
  }
  if (maxTemp > 30) {
    strategyTags.push('hot_weather')
  }
  if (minTemp < 10) {
    strategyTags.push('cold_weather')
  }
  if (!hasRain && maxTemp <= 30 && minTemp >= 10) {
    strategyTags.push('outdoor_friendly')
  }

  // 生成穿衣建议
  let clothingAdvice = ''
  if (maxTemp > 30) {
    clothingAdvice = '天气炎热，建议穿着轻薄透气的衣物，注意防晒'
  } else if (minTemp < 10) {
    clothingAdvice = '天气较冷，建议穿着保暖外套，注意防寒'
  } else if (hasRain) {
    clothingAdvice = '有降雨，建议携带雨具，穿着防水外套'
  } else {
    clothingAdvice = '天气适宜，建议穿着舒适的休闲服装'
  }

  // 添加温差建议
  if (maxTemp - minTemp > 10) {
    clothingAdvice += '，早晚温差较大，建议携带薄外套'
  }

  return {
    forecasts: forecasts.map(f => ({
      date: f.date,
      dayweather: f.dayweather,
      nightweather: f.nightweather,
      daytemp: f.daytemp,
      nighttemp: f.nighttemp,
      daywind: '',
      nightwind: '',
      daypower: f.daypower,
      nightpower: '',
    })),
    strategyTags: strategyTags.length > 0 ? strategyTags : ['outdoor_friendly'],
    clothingAdvice,
    warnings,
  }
}

/**
 * 默认导出
 */
export default createWeatherScoutAgent
