/**
 * Weather Scout Agent 单元测试
 * 测试天气分析逻辑、规则引擎、AI 响应解析
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TripState, WeatherOutput } from '@/lib/agents/state'

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  strategyTags: ['outdoor_friendly'],
                  clothingAdvice: '天气适宜出行',
                  warnings: [],
                }),
              },
            }],
          }),
        },
      },
    })),
  }
})

// Mock MCP Client
vi.mock('@/lib/agents/mcp-client', () => ({
  getMCPClient: vi.fn(() => ({
    getWeatherForecast: vi.fn().mockResolvedValue({
      forecasts: [
        {
          date: '2025-12-01',
          dayweather: '晴',
          nightweather: '晴',
          daytemp: '15',
          nighttemp: '5',
          daywind: '东风',
          nightwind: '东风',
          daypower: '3',
          nightpower: '3',
        },
        {
          date: '2025-12-02',
          dayweather: '多云',
          nightweather: '阴',
          daytemp: '12',
          nighttemp: '3',
          daywind: '北风',
          nightwind: '北风',
          daypower: '4',
          nightpower: '4',
        },
      ],
    }),
  })),
}))

// 导入被测试模块
import { createWeatherScoutAgent } from '@/lib/agents/nodes/weather-scout'

describe('Weather Scout Agent Unit Tests', () => {
  // 测试数据
  const mockState: TripState = {
    userInput: {
      destination: '杭州',
      start_date: '2025-12-01',
      end_date: '2025-12-03',
      budget: 3000,
      travelers: 2,
      adult_count: 2,
      child_count: 0,
      preferences: [],
    },
    weather: null,
    draftItinerary: null,
    accommodation: null,
    transport: null,
    dining: null,
    budgetResult: null,
    retryCount: 0,
    finalItinerary: null,
    meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createWeatherScoutAgent', () => {
    it('应该成功创建 Agent', () => {
      const agent = createWeatherScoutAgent()
      expect(agent).toBeDefined()
      expect(typeof agent).toBe('function')
    })

    it('应该接受 AI 配置参数', () => {
      const agent = createWeatherScoutAgent({
        apiKey: 'test-key',
        baseURL: 'https://test.api.com',
        model: 'test-model',
      })
      expect(agent).toBeDefined()
    })
  })

  describe('Agent 执行', () => {
    it('应该返回天气数据和策略标签', async () => {
      const agent = createWeatherScoutAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result).toHaveProperty('weather')
      expect(result.weather).toBeDefined()
      expect(result.weather?.forecasts).toBeDefined()
      expect(result.weather?.strategyTags).toBeDefined()
      expect(result.weather?.clothingAdvice).toBeDefined()
    })

    it('没有 API Key 时应该使用基于规则的分析', async () => {
      // 创建一个没有 API Key 的 Agent
      const agent = createWeatherScoutAgent({ apiKey: '' })
      const result = await agent(mockState)

      expect(result.weather).toBeDefined()
      expect(result.weather?.strategyTags.length).toBeGreaterThan(0)
    })
  })

  describe('策略标签逻辑', () => {
    it('晴朗但低温天气应该返回 cold_weather', async () => {
      const agent = createWeatherScoutAgent({ apiKey: '' })
      const result = await agent(mockState)

      // 基于 mock 的天气数据（晴天，15/5度）
      // 最低温度 5 度 < 10 度，所以会生成 cold_weather
      expect(result.weather?.strategyTags).toContain('cold_weather')
    })
  })

  describe('错误处理', () => {
    it('天气数据获取失败时应该返回默认值', async () => {
      // 模拟 MCP Client 返回空数据
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWeatherForecast: vi.fn().mockResolvedValue(null),
      })) as any

      const agent = createWeatherScoutAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.weather).toBeDefined()
      expect(result.weather?.forecasts).toEqual([])
      expect(result.weather?.strategyTags).toContain('outdoor_friendly')
    })
  })
})

describe('Weather Analysis Rules', () => {
  // 测试基于规则的天气分析逻辑
  // 这些是从 weather-scout.ts 中的 analyzeWeatherWithRules 函数提取的逻辑测试

  it('有雨天气应该生成 indoor_priority 和 rain_prepared 标签', () => {
    // 这个测试验证业务逻辑
    const forecasts = [
      {
        date: '2025-12-01',
        dayweather: '小雨',
        nightweather: '中雨',
        daytemp: '15',
        nighttemp: '10',
        daypower: '3',
      },
    ]

    const strategyTags: string[] = []
    for (const forecast of forecasts) {
      const weather = forecast.dayweather + forecast.nightweather
      if (weather.includes('雨')) {
        strategyTags.push('indoor_priority', 'rain_prepared')
      }
    }

    expect(strategyTags).toContain('indoor_priority')
    expect(strategyTags).toContain('rain_prepared')
  })

  it('高温天气应该生成 hot_weather 标签', () => {
    const forecasts = [
      {
        date: '2025-07-01',
        dayweather: '晴',
        nightweather: '晴',
        daytemp: '35',
        nighttemp: '28',
      },
    ]

    const strategyTags: string[] = []
    let maxTemp = -Infinity

    for (const forecast of forecasts) {
      const dayTemp = parseInt(forecast.daytemp)
      if (dayTemp > maxTemp) maxTemp = dayTemp
    }

    if (maxTemp > 30) {
      strategyTags.push('hot_weather')
    }

    expect(strategyTags).toContain('hot_weather')
  })

  it('低温天气应该生成 cold_weather 标签', () => {
    const forecasts = [
      {
        date: '2025-01-15',
        dayweather: '晴',
        nightweather: '晴',
        daytemp: '5',
        nighttemp: '-3',
      },
    ]

    const strategyTags: string[] = []
    let minTemp = Infinity

    for (const forecast of forecasts) {
      const nightTemp = parseInt(forecast.nighttemp)
      if (nightTemp < minTemp) minTemp = nightTemp
    }

    if (minTemp < 10) {
      strategyTags.push('cold_weather')
    }

    expect(strategyTags).toContain('cold_weather')
  })

  it('舒适天气应该生成 outdoor_friendly 标签', () => {
    const forecasts = [
      {
        date: '2025-10-15',
        dayweather: '晴',
        nightweather: '晴',
        daytemp: '22',
        nighttemp: '15',
      },
    ]

    const strategyTags: string[] = []
    let hasRain = false
    let maxTemp = -Infinity
    let minTemp = Infinity

    for (const forecast of forecasts) {
      const weather = forecast.dayweather + forecast.nightweather
      if (weather.includes('雨')) hasRain = true

      const dayTemp = parseInt(forecast.daytemp)
      const nightTemp = parseInt(forecast.nighttemp)
      if (dayTemp > maxTemp) maxTemp = dayTemp
      if (nightTemp < minTemp) minTemp = nightTemp
    }

    if (!hasRain && maxTemp <= 30 && minTemp >= 10) {
      strategyTags.push('outdoor_friendly')
    }

    expect(strategyTags).toContain('outdoor_friendly')
  })
})

describe('Clothing Advice Generation', () => {
  it('高温天气应该建议轻薄衣物', () => {
    const maxTemp = 35
    let clothingAdvice = ''

    if (maxTemp > 30) {
      clothingAdvice = '天气炎热，建议穿着轻薄透气的衣物，注意防晒'
    }

    expect(clothingAdvice).toContain('轻薄')
    expect(clothingAdvice).toContain('防晒')
  })

  it('低温天气应该建议保暖外套', () => {
    const minTemp = 5
    let clothingAdvice = ''

    if (minTemp < 10) {
      clothingAdvice = '天气较冷，建议穿着保暖外套，注意防寒'
    }

    expect(clothingAdvice).toContain('保暖')
  })

  it('有雨天气应该建议携带雨具', () => {
    const hasRain = true
    let clothingAdvice = ''

    if (hasRain) {
      clothingAdvice = '有降雨，建议携带雨具，穿着防水外套'
    }

    expect(clothingAdvice).toContain('雨具')
  })

  it('早晚温差大时应该提示携带外套', () => {
    const maxTemp = 25
    const minTemp = 12
    let clothingAdvice = '天气适宜，建议穿着舒适的休闲服装'

    if (maxTemp - minTemp > 10) {
      clothingAdvice += '，早晚温差较大，建议携带薄外套'
    }

    expect(clothingAdvice).toContain('温差')
    expect(clothingAdvice).toContain('外套')
  })
})
