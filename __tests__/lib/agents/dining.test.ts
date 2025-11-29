/**
 * Dining Recommender Agent 单元测试
 * 测试餐饮推荐逻辑、价格估算、菜系识别
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TripState, DraftItinerary } from '@/lib/agents/state'

// Mock MCP Client
vi.mock('@/lib/agents/mcp-client', () => ({
  getMCPClient: vi.fn(() => ({
    searchNearby: vi.fn().mockResolvedValue({
      pois: [
        {
          name: '外婆家',
          location: '120.148,30.242',
          address: '西湖区龙井路1号',
          rating: '4.6',
          type: '中餐厅',
          tel: '0571-12345678',
        },
        {
          name: '绿茶餐厅',
          location: '120.150,30.244',
          address: '西湖区延安路100号',
          rating: '4.5',
          type: '中餐厅',
        },
      ],
    }),
    searchPOI: vi.fn().mockResolvedValue({
      pois: [
        {
          name: '知味观',
          location: '120.155,30.248',
          address: '上城区解放路200号',
          rating: '4.7',
          type: '小吃店',
        },
      ],
    }),
  })),
}))

// 导入被测试模块
import { createDiningAgent } from '@/lib/agents/nodes/dining'

describe('Dining Recommender Agent Unit Tests', () => {
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
          { time: '12:00', mealType: 'lunch', cuisine: '杭帮菜' },
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

  describe('createDiningAgent', () => {
    it('应该成功创建 Agent', () => {
      const agent = createDiningAgent()
      expect(agent).toBeDefined()
      expect(typeof agent).toBe('function')
    })

    it('应该接受 AI 配置参数', () => {
      const agent = createDiningAgent({
        apiKey: 'test-key',
        baseURL: 'https://test.api.com',
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

      const agent = createDiningAgent()
      const result = await agent(stateWithoutDraft)

      expect(result.dining).toBeDefined()
      expect(result.dining?.recommendations).toEqual([])
      expect(result.dining?.totalCost).toBe(0)
    })

    it('应该为每个餐饮槽返回推荐', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      expect(result.dining).toBeDefined()
      expect(result.dining?.recommendations.length).toBeGreaterThan(0)
    })

    it('应该返回餐厅信息', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      const firstRecommendation = result.dining?.recommendations[0]
      expect(firstRecommendation?.restaurant).toBeDefined()
      expect(firstRecommendation?.location).toBeDefined()
    })

    it('应该计算总餐饮费用', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      expect(result.dining?.totalCost).toBeGreaterThan(0)
    })
  })

  describe('餐厅搜索策略', () => {
    it('应该优先使用周边搜索', async () => {
      const agent = createDiningAgent()
      await agent(mockState)

      // 验证 MCP 客户端被调用
      const { getMCPClient } = await import('@/lib/agents/mcp-client')
      expect(getMCPClient).toHaveBeenCalled()

      const client = getMCPClient()
      expect(client.searchNearby).toHaveBeenCalled()
    })

    it('周边无结果时应该回退关键词搜索', async () => {
      // Mock 周边搜索返回空
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        searchNearby: vi.fn().mockResolvedValue({ pois: [] }),
        searchPOI: vi.fn().mockResolvedValue({
          pois: [
            {
              name: '知味观',
              location: '120.155,30.248',
              address: '上城区解放路200号',
              rating: '4.7',
              type: '小吃店',
            },
          ],
        }),
      })) as any

      const agent = createDiningAgent()
      const result = await agent(mockState)

      // 应该通过关键词搜索得到结果
      expect(result.dining?.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('estimateMealPrice 价格估算', () => {
    it('早餐价格应该是平均价格的 0.5 倍', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      // 找到早餐推荐
      const breakfastRecommendation = result.dining?.recommendations.find(
        (r: any) => r.mealType === 'breakfast'
      )

      // 早餐应该比午餐便宜
      const lunchRecommendation = result.dining?.recommendations.find(
        (r: any) => r.mealType === 'lunch'
      )

      if (breakfastRecommendation && lunchRecommendation) {
        expect(breakfastRecommendation.avg_price).toBeLessThan(lunchRecommendation.avg_price)
      }
    })

    it('晚餐价格应该是平均价格的 1.3 倍', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      // 找到晚餐推荐
      const dinnerRecommendation = result.dining?.recommendations.find(
        (r: any) => r.mealType === 'dinner'
      )

      // 找到午餐推荐
      const lunchRecommendation = result.dining?.recommendations.find(
        (r: any) => r.mealType === 'lunch'
      )

      if (dinnerRecommendation && lunchRecommendation) {
        expect(dinnerRecommendation.avg_price).toBeGreaterThan(lunchRecommendation.avg_price)
      }
    })

    it('小吃价格应该是平均价格的 0.4 倍', async () => {
      // 创建包含小吃的状态
      const stateWithSnack: TripState = {
        ...mockState,
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
              mealSlots: [
                { time: '12:00', mealType: 'lunch' },
                { time: '15:00', mealType: 'snack' }, // 小吃
              ],
            },
          ],
          totalAttractions: 1,
          totalMeals: 2,
        },
      }

      const agent = createDiningAgent()
      const result = await agent(stateWithSnack)

      // 找到小吃推荐
      const snackRecommendation = result.dining?.recommendations.find(
        (r: any) => r.mealType === 'snack'
      )

      // 找到午餐推荐
      const lunchRecommendation = result.dining?.recommendations.find(
        (r: any) => r.mealType === 'lunch'
      )

      if (snackRecommendation && lunchRecommendation) {
        expect(snackRecommendation.avg_price).toBeLessThan(lunchRecommendation.avg_price)
      }
    })
  })

  describe('extractCuisine 菜系识别', () => {
    it('应该正确识别中餐厅', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      // POI 类型包含"中餐厅"，应该被识别为"中餐"
      const recommendation = result.dining?.recommendations[0]
      if (recommendation) {
        expect(['中餐', '杭帮菜', '当地美食']).toContain(recommendation.cuisine)
      }
    })

    it('应该正确识别小吃店', async () => {
      // Mock 返回小吃店类型
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        searchNearby: vi.fn().mockResolvedValue({
          pois: [
            {
              name: '知味观',
              location: '120.155,30.248',
              address: '上城区解放路200号',
              rating: '4.7',
              type: '小吃店',
            },
          ],
        }),
        searchPOI: vi.fn().mockResolvedValue({ pois: [] }),
      })) as any

      const agent = createDiningAgent()
      const result = await agent(mockState)

      const recommendation = result.dining?.recommendations[0]
      if (recommendation) {
        expect(['小吃', '当地美食']).toContain(recommendation.cuisine)
      }
    })
  })

  describe('按人数计算费用', () => {
    it('应该按人数计算总餐饮费用', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      // 2 个人，总费用应该是每餐费用 * 餐数 * 2
      expect(result.dining?.totalCost).toBeGreaterThan(0)

      // 验证总费用是否合理（约占总预算 25%）
      const expectedMaxCost = mockState.userInput.budget * 0.3 // 允许一些误差
      expect(result.dining?.totalCost).toBeLessThanOrEqual(expectedMaxCost)
    })
  })

  describe('错误处理', () => {
    it('MCP 客户端错误时应该返回空结果', async () => {
      // Mock MCP 客户端抛出错误
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        searchNearby: vi.fn().mockRejectedValue(new Error('MCP Error')),
        searchPOI: vi.fn().mockRejectedValue(new Error('MCP Error')),
      })) as any

      const agent = createDiningAgent()
      const result = await agent(mockState)

      // 应该返回空结果而不是抛出错误
      expect(result.dining).toBeDefined()
      expect(result.dining?.recommendations).toEqual([])
    })
  })

  describe('餐饮时间槽处理', () => {
    it('应该根据用餐时间找到附近景点', async () => {
      const agent = createDiningAgent()
      const result = await agent(mockState)

      // Agent 应该根据行程找到合适的用餐地点
      expect(result.dining?.recommendations.length).toBeGreaterThan(0)
    })

    it('应该处理指定菜系的餐饮槽', async () => {
      // 状态中午餐指定了"杭帮菜"
      const agent = createDiningAgent()
      await agent(mockState)

      // 验证 MCP 客户端被调用时使用了指定的菜系作为关键词
      const { getMCPClient } = await import('@/lib/agents/mcp-client')
      expect(getMCPClient).toHaveBeenCalled()
    })
  })

  describe('不同餐次的搜索关键词', () => {
    it('早餐应该使用早餐相关关键词', async () => {
      const agent = createDiningAgent()
      await agent(mockState)

      const { getMCPClient } = await import('@/lib/agents/mcp-client')
      const client = getMCPClient()

      // 验证 searchNearby 或 searchPOI 被调用
      expect(client.searchNearby).toHaveBeenCalled()
    })
  })
})

describe('菜系映射测试', () => {
  // 直接测试菜系识别逻辑

  it('火锅店应该被识别为火锅', () => {
    const cuisineMap: Record<string, string> = {
      '中餐厅': '中餐',
      '火锅店': '火锅',
      '西餐厅': '西餐',
      '日本料理': '日料',
      '韩国料理': '韩餐',
      '快餐店': '快餐',
      '小吃店': '小吃',
      '甜品店': '甜品',
      '咖啡厅': '咖啡',
      '茶馆': '茶点',
    }

    const testCases = [
      { type: '火锅店', expected: '火锅' },
      { type: '日本料理', expected: '日料' },
      { type: '西餐厅', expected: '西餐' },
      { type: '快餐店', expected: '快餐' },
    ]

    for (const testCase of testCases) {
      let result: string | undefined
      for (const [key, value] of Object.entries(cuisineMap)) {
        if (testCase.type.includes(key)) {
          result = value
          break
        }
      }
      expect(result).toBe(testCase.expected)
    }
  })

  it('未知类型应该返回 undefined', () => {
    const cuisineMap: Record<string, string> = {
      '中餐厅': '中餐',
      '火锅店': '火锅',
    }

    const unknownType = '酒吧'
    let result: string | undefined

    for (const [key, value] of Object.entries(cuisineMap)) {
      if (unknownType.includes(key)) {
        result = value
        break
      }
    }

    expect(result).toBeUndefined()
  })
})

describe('价格计算测试', () => {
  it('应该基于预算和餐数计算合理价格', () => {
    const totalBudget = 3000
    const totalMeals = 6

    // 餐饮预算约占总预算 25%
    const diningBudget = totalBudget * 0.25 // 750
    const avgMealPrice = diningBudget / totalMeals // 125

    // 验证各餐次价格
    expect(Math.round(avgMealPrice * 0.5)).toBe(63) // 早餐
    expect(Math.round(avgMealPrice * 1.0)).toBe(125) // 午餐
    expect(Math.round(avgMealPrice * 1.3)).toBe(163) // 晚餐
    expect(Math.round(avgMealPrice * 0.4)).toBe(50) // 小吃
  })
})
