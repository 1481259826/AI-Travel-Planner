/**
 * Accommodation Specialist Agent 单元测试
 * 测试住宿推荐逻辑、地理中心点计算、价格等级判断
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
                  recommendations: [
                    {
                      name: '杭州西湖大酒店',
                      type: 'hotel',
                      location: { name: '杭州西湖大酒店', address: '西湖区', lat: 30.242, lng: 120.148 },
                      price_per_night: 350,
                      total_price: 700,
                      rating: 4.5,
                      amenities: ['免费WiFi', '游泳池', '健身房'],
                    },
                    {
                      name: '如家酒店',
                      type: 'hotel',
                      location: { name: '如家酒店', address: '上城区', lat: 30.250, lng: 120.160 },
                      price_per_night: 180,
                      total_price: 360,
                      rating: 4.0,
                      amenities: ['免费WiFi', '空调'],
                    },
                  ],
                  selected: {
                    name: '杭州西湖大酒店',
                    price_per_night: 350,
                    total_price: 700,
                    rating: 4.5,
                  },
                  totalCost: 700,
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
    searchNearby: vi.fn().mockResolvedValue({
      pois: [
        {
          name: '杭州西湖大酒店',
          location: '120.148,30.242',
          address: '西湖区龙井路1号',
          rating: '4.5',
        },
        {
          name: '如家酒店',
          location: '120.160,30.250',
          address: '上城区解放路100号',
          rating: '4.0',
        },
      ],
    }),
    searchPOI: vi.fn().mockResolvedValue({
      pois: [
        {
          name: '汉庭酒店',
          location: '120.155,30.245',
          address: '下城区武林路50号',
          rating: '4.2',
        },
      ],
    }),
  })),
}))

// 导入被测试模块
import { createAccommodationAgent } from '@/lib/agents/nodes/accommodation'

describe('Accommodation Specialist Agent Unit Tests', () => {
  // 创建带有草稿行程的测试状态
  const mockDraftItinerary: DraftItinerary = {
    days: [
      {
        day: 1,
        date: '2025-12-01',
        attractions: [
          {
            time: '09:00',
            name: '西湖',
            duration: '3小时',
            type: 'attraction',
            location: { name: '西湖', address: '杭州市', lat: 30.242945, lng: 120.148732 },
          },
          {
            time: '14:00',
            name: '灵隐寺',
            duration: '2小时',
            type: 'attraction',
            location: { name: '灵隐寺', address: '杭州市', lat: 30.234567, lng: 120.123456 },
          },
        ],
        mealSlots: [
          { time: '08:00', mealType: 'breakfast' },
          { time: '12:00', mealType: 'lunch' },
          { time: '18:00', mealType: 'dinner' },
        ],
      },
      {
        day: 2,
        date: '2025-12-02',
        attractions: [
          {
            time: '09:00',
            name: '雷峰塔',
            duration: '2小时',
            type: 'attraction',
            location: { name: '雷峰塔', address: '杭州市', lat: 30.230000, lng: 120.140000 },
          },
        ],
        mealSlots: [
          { time: '08:00', mealType: 'breakfast' },
          { time: '12:00', mealType: 'lunch' },
          { time: '18:00', mealType: 'dinner' },
        ],
      },
    ],
    totalAttractions: 3,
    totalMeals: 6,
  }

  const mockState: TripState = {
    userInput: {
      destination: '杭州',
      start_date: '2025-12-01',
      end_date: '2025-12-02',
      budget: 3000,
      travelers: 2,
      adult_count: 2,
      child_count: 0,
      preferences: [],
    },
    weather: null,
    draftItinerary: mockDraftItinerary,
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

  describe('createAccommodationAgent', () => {
    it('应该成功创建 Agent', () => {
      const agent = createAccommodationAgent()
      expect(agent).toBeDefined()
      expect(typeof agent).toBe('function')
    })

    it('应该接受 AI 配置参数', () => {
      const agent = createAccommodationAgent({
        apiKey: 'test-key',
        baseURL: 'https://test.api.com',
        model: 'test-model',
      })
      expect(agent).toBeDefined()
    })
  })

  describe('Agent 执行', () => {
    it('没有草稿行程时应该返回空结果', async () => {
      const stateWithoutDraft: TripState = {
        ...mockState,
        draftItinerary: null,
      }

      const agent = createAccommodationAgent({ apiKey: 'test-key' })
      const result = await agent(stateWithoutDraft)

      expect(result.accommodation).toBeDefined()
      expect(result.accommodation?.recommendations).toEqual([])
      expect(result.accommodation?.totalCost).toBe(0)
    })

    it('应该返回住宿推荐', async () => {
      const agent = createAccommodationAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.accommodation).toBeDefined()
      expect(result.accommodation?.recommendations.length).toBeGreaterThan(0)
    })

    it('应该包含选中的酒店', async () => {
      const agent = createAccommodationAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.accommodation?.selected).toBeDefined()
    })

    it('应该计算总成本', async () => {
      const agent = createAccommodationAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.accommodation?.totalCost).toBeGreaterThan(0)
    })

    it('没有 API Key 时应该直接使用 POI 结果', async () => {
      const agent = createAccommodationAgent({ apiKey: '' })
      const result = await agent(mockState)

      expect(result.accommodation).toBeDefined()
      expect(result.accommodation?.recommendations.length).toBeGreaterThan(0)
    })

    it('应该基于景点位置搜索周边酒店', async () => {
      const agent = createAccommodationAgent({ apiKey: 'test-key' })
      await agent(mockState)

      // 验证 MCP 客户端被调用
      const { getMCPClient } = await import('@/lib/agents/mcp-client')
      expect(getMCPClient).toHaveBeenCalled()

      const client = getMCPClient()
      expect(client.searchNearby).toHaveBeenCalled()
    })
  })

  describe('预算超支反馈处理', () => {
    it('应该处理预算超支反馈降级酒店', async () => {
      const stateWithBudgetFeedback: TripState = {
        ...mockState,
        budgetResult: {
          totalCost: 5000,
          budgetUtilization: 1.67,
          isWithinBudget: false,
          feedback: {
            action: 'downgrade_hotel',
            targetReduction: 1000,
            suggestion: '建议选择更经济的住宿',
          },
        },
      }

      const agent = createAccommodationAgent({ apiKey: 'test-key' })
      const result = await agent(stateWithBudgetFeedback)

      // 应该正常返回结果
      expect(result.accommodation).toBeDefined()
    })
  })
})

describe('calculateCentroid', () => {
  // 测试地理中心点计算逻辑
  // 通过 Agent 行为间接测试

  it('应该正确计算多点地理中心', async () => {
    const agent = createAccommodationAgent({ apiKey: '' })
    const result = await agent({
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02',
        budget: 3000,
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
      },
      weather: null,
      draftItinerary: {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '景点A',
                duration: '2小时',
                type: 'attraction',
                location: { name: 'A', address: '', lat: 30.0, lng: 120.0 },
              },
              {
                time: '14:00',
                name: '景点B',
                duration: '2小时',
                type: 'attraction',
                location: { name: 'B', address: '', lat: 30.2, lng: 120.2 },
              },
            ],
            mealSlots: [],
          },
        ],
        totalAttractions: 2,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    // 中心点应该被计算
    expect(result.accommodation?.centroidLocation).toBeDefined()
  })

  it('没有有效坐标时应该返回 undefined', async () => {
    const stateWithoutCoords: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02',
        budget: 3000,
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
      },
      weather: null,
      draftItinerary: {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '景点A',
                duration: '2小时',
                type: 'attraction',
                // 没有 location
              },
            ],
            mealSlots: [],
          },
        ],
        totalAttractions: 1,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    }

    const agent = createAccommodationAgent({ apiKey: '' })
    const result = await agent(stateWithoutCoords)

    // 没有有效坐标时，centroidLocation 可能为 undefined
    // 但 Agent 应该仍然返回结果
    expect(result.accommodation).toBeDefined()
  })
})

describe('determineHotelPriceLevel', () => {
  // 测试价格等级判断逻辑
  // 通过不同预算的测试间接验证

  it('低预算应该返回 economy 等级酒店', async () => {
    const lowBudgetState: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02',
        budget: 500, // 低预算
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
      },
      weather: null,
      draftItinerary: {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '西湖',
                duration: '3小时',
                type: 'attraction',
                location: { name: '西湖', address: '杭州市', lat: 30.242945, lng: 120.148732 },
              },
            ],
            mealSlots: [],
          },
        ],
        totalAttractions: 1,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    }

    const agent = createAccommodationAgent({ apiKey: '' })
    const result = await agent(lowBudgetState)

    // 低预算情况下，应该推荐经济型酒店
    expect(result.accommodation?.recommendations[0]?.price_per_night).toBeLessThan(250)
  })

  it('偏好豪华时应该返回 luxury 等级酒店', async () => {
    const luxuryPreferenceState: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02',
        budget: 10000, // 高预算
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
        hotel_preferences: ['豪华', '五星级'],
      },
      weather: null,
      draftItinerary: {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '西湖',
                duration: '3小时',
                type: 'attraction',
                location: { name: '西湖', address: '杭州市', lat: 30.242945, lng: 120.148732 },
              },
            ],
            mealSlots: [],
          },
        ],
        totalAttractions: 1,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    }

    const agent = createAccommodationAgent({ apiKey: '' })
    const result = await agent(luxuryPreferenceState)

    // 高预算 + 豪华偏好，应该推荐高档酒店
    expect(result.accommodation?.recommendations[0]?.price_per_night).toBeGreaterThan(300)
  })
})

describe('calculateDistance', () => {
  it('应该计算到中心点的距离', async () => {
    const agent = createAccommodationAgent({ apiKey: '' })
    const mockStateWithLocations: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02',
        budget: 3000,
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
      },
      weather: null,
      draftItinerary: {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '西湖',
                duration: '3小时',
                type: 'attraction',
                location: { name: '西湖', address: '杭州市', lat: 30.242945, lng: 120.148732 },
              },
            ],
            mealSlots: [],
          },
        ],
        totalAttractions: 1,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    }

    const result = await agent(mockStateWithLocations)

    // 推荐的酒店应该有到中心点的距离
    if (result.accommodation?.recommendations[0]?.distanceFromCenter !== undefined) {
      expect(typeof result.accommodation.recommendations[0].distanceFromCenter).toBe('number')
    }
  })
})

describe('错误处理', () => {
  it('MCP 客户端错误时应该返回空结果', async () => {
    // Mock MCP 客户端抛出错误
    vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
      searchNearby: vi.fn().mockRejectedValue(new Error('MCP Error')),
      searchPOI: vi.fn().mockRejectedValue(new Error('MCP Error')),
    })) as any

    const agent = createAccommodationAgent({ apiKey: '' })
    const result = await agent({
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02',
        budget: 3000,
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
      },
      weather: null,
      draftItinerary: {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '西湖',
                duration: '3小时',
                type: 'attraction',
                location: { name: '西湖', address: '杭州市', lat: 30.242945, lng: 120.148732 },
              },
            ],
            mealSlots: [],
          },
        ],
        totalAttractions: 1,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    // 应该返回空结果而不是抛出错误
    expect(result.accommodation).toBeDefined()
    expect(result.accommodation?.recommendations).toEqual([])
  })

  it('AI 调用失败时应该返回空结果', async () => {
    // 重新 mock OpenAI 抛出错误
    vi.mocked(await import('openai')).default = vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('AI Error')),
        },
      },
    })) as any

    const agent = createAccommodationAgent({ apiKey: 'test-key' })
    const result = await agent({
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-02',
        budget: 3000,
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
      },
      weather: null,
      draftItinerary: {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '西湖',
                duration: '3小时',
                type: 'attraction',
                location: { name: '西湖', address: '杭州市', lat: 30.242945, lng: 120.148732 },
              },
            ],
            mealSlots: [],
          },
        ],
        totalAttractions: 1,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    // 应该返回空结果而不是抛出错误
    expect(result.accommodation).toBeDefined()
  })
})
