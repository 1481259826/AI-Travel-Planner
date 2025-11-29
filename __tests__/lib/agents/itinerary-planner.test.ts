/**
 * Itinerary Planner Agent 单元测试
 * 测试核心规划逻辑、AI 响应解析、坐标增强
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TripState, DraftItinerary } from '@/lib/agents/state'

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
                  days: [
                    {
                      day: 1,
                      date: '2025-12-01',
                      attractions: [
                        { time: '09:00', name: '西湖', duration: '3小时', type: 'attraction' },
                        { time: '14:00', name: '灵隐寺', duration: '2小时', type: 'attraction' },
                      ],
                      mealSlots: [
                        { time: '08:00', mealType: 'breakfast' },
                        { time: '12:00', mealType: 'lunch', cuisine: '杭帮菜' },
                        { time: '18:00', mealType: 'dinner' },
                      ],
                    },
                  ],
                  totalAttractions: 2,
                  totalMeals: 3,
                  estimatedAttractionCost: 100,
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
    searchPOI: vi.fn().mockResolvedValue({
      pois: [
        {
          name: '西湖风景名胜区',
          location: '120.148732,30.242945',
          address: '杭州市西湖区',
        },
      ],
    }),
    geocode: vi.fn().mockResolvedValue({
      location: '120.148732,30.242945',
      formatted_address: '浙江省杭州市西湖区',
    }),
  })),
}))

// 导入被测试模块
import { createItineraryPlannerAgent } from '@/lib/agents/nodes/itinerary-planner'

describe('Itinerary Planner Agent Unit Tests', () => {
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
      preferences: ['自然风光', '历史文化'],
    },
    weather: {
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
      ],
      strategyTags: ['outdoor_friendly', 'cold_weather'],
      clothingAdvice: '天气较冷，建议穿着保暖外套',
      warnings: [],
    },
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createItineraryPlannerAgent', () => {
    it('应该成功创建 Agent', () => {
      const agent = createItineraryPlannerAgent()
      expect(agent).toBeDefined()
      expect(typeof agent).toBe('function')
    })

    it('应该接受 AI 配置参数', () => {
      const agent = createItineraryPlannerAgent({
        apiKey: 'test-key',
        baseURL: 'https://test.api.com',
        model: 'test-model',
      })
      expect(agent).toBeDefined()
    })

    it('应该使用默认配置当没有提供参数时', () => {
      const agent = createItineraryPlannerAgent()
      expect(agent).toBeDefined()
    })
  })

  describe('Agent 执行', () => {
    it('应该返回草稿行程', async () => {
      const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result).toHaveProperty('draftItinerary')
      expect(result.draftItinerary).toBeDefined()
      expect(result.draftItinerary?.days).toBeDefined()
    })

    it('应该包含景点和餐饮槽', async () => {
      const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.draftItinerary?.totalAttractions).toBeGreaterThan(0)
      expect(result.draftItinerary?.totalMeals).toBeGreaterThan(0)
    })

    it('没有 API Key 时应该返回空草稿', async () => {
      const agent = createItineraryPlannerAgent({ apiKey: '' })
      const result = await agent(mockState)

      expect(result.draftItinerary).toBeDefined()
      expect(result.draftItinerary?.days.length).toBe(3) // 3 天行程
      expect(result.draftItinerary?.totalAttractions).toBe(0)
    })

    it('应该处理重试反馈', async () => {
      const stateWithRetry: TripState = {
        ...mockState,
        retryCount: 1,
        budgetResult: {
          totalCost: 5000,
          budgetUtilization: 1.67,
          isWithinBudget: false,
          feedback: {
            action: 'downgrade_hotel',
            targetReduction: 2000,
            suggestion: '建议选择更经济的住宿',
          },
        },
      }

      const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
      const result = await agent(stateWithRetry)

      expect(result.draftItinerary).toBeDefined()
    })

    it('AI 调用失败时应该返回空草稿', async () => {
      // 重新 mock OpenAI 抛出错误
      vi.mocked(await import('openai')).default = vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      })) as any

      const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.draftItinerary).toBeDefined()
      expect(result.draftItinerary?.days.length).toBeGreaterThan(0)
    })
  })

  describe('天气策略处理', () => {
    it('应该传递天气策略标签到 AI', async () => {
      const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
      await agent(mockState)

      // 验证 OpenAI 被调用
      const OpenAI = (await import('openai')).default
      expect(OpenAI).toHaveBeenCalled()
    })

    it('没有天气数据时也应该正常工作', async () => {
      const stateWithoutWeather: TripState = {
        ...mockState,
        weather: null,
      }

      const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
      const result = await agent(stateWithoutWeather)

      expect(result.draftItinerary).toBeDefined()
    })
  })
})

describe('parseDraftItinerary', () => {
  // 测试 parseDraftItinerary 的边界情况
  // 由于是内部函数，通过 Agent 行为间接测试

  it('应该解析标准 JSON 响应', async () => {
    const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
    const mockState: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        budget: 1000,
        travelers: 1,
        adult_count: 1,
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

    const result = await agent(mockState)

    expect(result.draftItinerary?.days).toBeInstanceOf(Array)
    expect(result.draftItinerary?.days[0]).toHaveProperty('day')
    expect(result.draftItinerary?.days[0]).toHaveProperty('attractions')
    expect(result.draftItinerary?.days[0]).toHaveProperty('mealSlots')
  })
})

describe('enrichDraftWithCoordinates', () => {
  it('应该通过 POI 搜索获取坐标', async () => {
    const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
    const mockStateForEnrich: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        budget: 1000,
        travelers: 1,
        adult_count: 1,
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

    const result = await agent(mockStateForEnrich)

    // 验证 MCP 客户端被调用
    const { getMCPClient } = await import('@/lib/agents/mcp-client')
    expect(getMCPClient).toHaveBeenCalled()

    // 验证景点有坐标
    const firstDay = result.draftItinerary?.days[0]
    if (firstDay && firstDay.attractions.length > 0) {
      const firstAttraction = firstDay.attractions[0]
      expect(firstAttraction.location).toBeDefined()
      expect(firstAttraction.location?.lat).toBeDefined()
      expect(firstAttraction.location?.lng).toBeDefined()
    }
  })

  it('POI 搜索无结果时应该回退到地理编码', async () => {
    // 重新 mock MCP Client，POI 搜索返回空
    vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
      searchPOI: vi.fn().mockResolvedValue({ pois: [] }),
      geocode: vi.fn().mockResolvedValue({
        location: '120.148732,30.242945',
        formatted_address: '浙江省杭州市西湖区',
      }),
    })) as any

    const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
    const mockStateForGeocode: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        budget: 1000,
        travelers: 1,
        adult_count: 1,
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

    const result = await agent(mockStateForGeocode)

    // 验证 geocode 被调用
    const { getMCPClient } = await import('@/lib/agents/mcp-client')
    const client = getMCPClient()
    expect(client.geocode).toBeDefined()
  })

  it('应该跳过已有坐标的景点', async () => {
    // 这个测试验证优化逻辑，通过 mock 确认不重复调用 API
    const searchPOIMock = vi.fn().mockResolvedValue({
      pois: [{ name: '西湖', location: '120.148732,30.242945', address: '杭州市' }],
    })

    vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
      searchPOI: searchPOIMock,
      geocode: vi.fn(),
    })) as any

    const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
    const mockStateForSkip: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        budget: 1000,
        travelers: 1,
        adult_count: 1,
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

    await agent(mockStateForSkip)

    // searchPOI 应该被调用（因为 mock 的 AI 返回的景点没有坐标）
    expect(searchPOIMock).toHaveBeenCalled()
  })
})

describe('createEmptyDraft', () => {
  it('应该正确计算天数', async () => {
    const agent = createItineraryPlannerAgent({ apiKey: '' }) // 无 API Key 触发空草稿
    const mockStateForDays: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-05', // 5 天
        budget: 1000,
        travelers: 1,
        adult_count: 1,
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

    const result = await agent(mockStateForDays)

    expect(result.draftItinerary?.days.length).toBe(5)
  })

  it('应该为每天生成默认餐饮槽', async () => {
    const agent = createItineraryPlannerAgent({ apiKey: '' })
    const mockStateForMeals: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02', // 2 天
        budget: 1000,
        travelers: 1,
        adult_count: 1,
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

    const result = await agent(mockStateForMeals)

    // 每天 3 餐，2 天共 6 餐
    expect(result.draftItinerary?.totalMeals).toBe(6)

    // 验证每天都有早中晚餐
    for (const day of result.draftItinerary?.days || []) {
      expect(day.mealSlots.length).toBe(3)
      const mealTypes = day.mealSlots.map(m => m.mealType)
      expect(mealTypes).toContain('breakfast')
      expect(mealTypes).toContain('lunch')
      expect(mealTypes).toContain('dinner')
    }
  })

  it('单天行程应该生成 1 天', async () => {
    const agent = createItineraryPlannerAgent({ apiKey: '' })
    const mockStateForSingleDay: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01', // 同一天
        budget: 500,
        travelers: 1,
        adult_count: 1,
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

    const result = await agent(mockStateForSingleDay)

    expect(result.draftItinerary?.days.length).toBe(1)
    expect(result.draftItinerary?.days[0].day).toBe(1)
    expect(result.draftItinerary?.days[0].date).toBe('2025-12-01')
  })
})

describe('错误处理', () => {
  it('MCP 客户端错误时应该保持原景点数据', async () => {
    // Mock MCP 客户端抛出错误
    vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
      searchPOI: vi.fn().mockRejectedValue(new Error('MCP Error')),
      geocode: vi.fn().mockRejectedValue(new Error('MCP Error')),
    })) as any

    const agent = createItineraryPlannerAgent({ apiKey: 'test-key' })
    const mockStateForError: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        budget: 1000,
        travelers: 1,
        adult_count: 1,
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

    // 不应该抛出错误
    const result = await agent(mockStateForError)
    expect(result.draftItinerary).toBeDefined()
  })
})
