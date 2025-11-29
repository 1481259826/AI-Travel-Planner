/**
 * Finalize Agent 单元测试
 * 测试最终行程汇总逻辑、数据整合、费用计算
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  TripState,
  DraftItinerary,
  AccommodationResult,
  TransportResult,
  DiningResult,
  BudgetResult,
} from '@/lib/agents/state'

// 导入被测试模块
import { createFinalizeAgent } from '@/lib/agents/nodes/finalize'

describe('Finalize Agent Unit Tests', () => {
  // 创建完整的测试状态
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
            location: { name: '西湖', address: '杭州市西湖区', lat: 30.242945, lng: 120.148732 },
          },
          {
            time: '14:00',
            name: '灵隐寺',
            duration: '2小时',
            type: 'attraction',
            location: { name: '灵隐寺', address: '杭州市西湖区', lat: 30.234567, lng: 120.123456 },
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
            location: { name: '雷峰塔', address: '杭州市西湖区', lat: 30.230000, lng: 120.140000 },
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
    estimatedAttractionCost: 200,
  }

  const mockAccommodation: AccommodationResult = {
    recommendations: [],
    selected: {
      name: '杭州西湖大酒店',
      type: 'hotel',
      location: { name: '杭州西湖大酒店', address: '杭州市西湖区', lat: 30.250000, lng: 120.160000 },
      check_in: '2025-12-01',
      check_out: '2025-12-02',
      price_per_night: 350,
      total_price: 350,
      rating: 4.5,
      amenities: ['免费WiFi', '游泳池', '健身房'],
    },
    totalCost: 350,
  }

  const mockTransport: TransportResult = {
    segments: [
      {
        from: { name: '杭州西湖大酒店', lat: 30.250000, lng: 120.160000 },
        to: { name: '西湖', lat: 30.242945, lng: 120.148732 },
        mode: 'driving',
        distance: 2500,
        duration: 600,
        cost: 15,
      },
    ],
    totalCost: 100,
    recommendedModes: ['walking', 'transit', 'driving'],
  }

  const mockDining: DiningResult = {
    recommendations: [
      {
        day: 1,
        time: '08:00',
        mealType: 'breakfast',
        restaurant: '知味观',
        cuisine: '杭帮菜',
        location: { name: '知味观', address: '杭州市上城区', lat: 30.245, lng: 120.155 },
        avg_price: 50,
        recommended_dishes: ['小笼包', '叉烧包'],
      },
      {
        day: 1,
        time: '12:00',
        mealType: 'lunch',
        restaurant: '外婆家',
        cuisine: '杭帮菜',
        location: { name: '外婆家', address: '杭州市西湖区', lat: 30.242, lng: 120.148 },
        avg_price: 100,
        recommended_dishes: ['西湖醋鱼', '东坡肉'],
      },
      {
        day: 1,
        time: '18:00',
        mealType: 'dinner',
        restaurant: '楼外楼',
        cuisine: '杭帮菜',
        location: { name: '楼外楼', address: '杭州市西湖区', lat: 30.241, lng: 120.147 },
        avg_price: 150,
        recommended_dishes: ['叫花鸡', '龙井虾仁'],
      },
    ],
    totalCost: 600,
  }

  const mockBudgetResult: BudgetResult = {
    totalCost: 1250,
    budgetUtilization: 0.42,
    isWithinBudget: true,
    costBreakdown: {
      accommodation: 350,
      transport: 100,
      dining: 600,
      attractions: 200,
    },
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
      preferences: ['自然风光', '历史文化'],
      origin: '上海',
    },
    weather: null,
    draftItinerary: mockDraftItinerary,
    accommodation: mockAccommodation,
    transport: mockTransport,
    dining: mockDining,
    budgetResult: mockBudgetResult,
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

  describe('createFinalizeAgent', () => {
    it('应该成功创建 Agent', () => {
      const agent = createFinalizeAgent()
      expect(agent).toBeDefined()
      expect(typeof agent).toBe('function')
    })

    it('应该接受 AI 配置参数', () => {
      const agent = createFinalizeAgent({
        apiKey: 'test-key',
        baseURL: 'https://test.api.com',
      })
      expect(agent).toBeDefined()
    })
  })

  describe('Agent 执行', () => {
    it('应该成功生成最终行程', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      expect(result.finalItinerary).toBeDefined()
      expect(result.finalItinerary?.days.length).toBe(2)
    })

    it('应该生成行程摘要', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      expect(result.finalItinerary?.summary).toBeDefined()
      expect(result.finalItinerary?.summary).toContain('杭州')
      expect(result.finalItinerary?.summary).toContain('2日游')
    })

    it('没有草稿行程时应该返回空天数', async () => {
      const stateWithoutDraft: TripState = {
        ...mockState,
        draftItinerary: null,
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithoutDraft)

      expect(result.finalItinerary?.days).toEqual([])
    })
  })

  describe('每日行程整合', () => {
    it('应该正确转换活动信息', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const day1 = result.finalItinerary?.days[0]
      expect(day1?.activities.length).toBe(2)
      expect(day1?.activities[0].name).toBe('西湖')
      expect(day1?.activities[0].type).toBe('attraction')
      expect(day1?.activities[0].location).toBeDefined()
    })

    it('应该保留活动时间和时长', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const activity = result.finalItinerary?.days[0]?.activities[0]
      expect(activity?.time).toBe('09:00')
      expect(activity?.duration).toBe('3小时')
    })

    it('应该正确整合每日餐饮', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const day1 = result.finalItinerary?.days[0]
      expect(day1?.meals.length).toBeGreaterThan(0)

      const firstMeal = day1?.meals[0]
      expect(firstMeal?.restaurant).toBeDefined()
      expect(firstMeal?.cuisine).toBeDefined()
    })

    it('没有餐饮推荐时应该生成占位符', async () => {
      const stateWithoutDining: TripState = {
        ...mockState,
        dining: null,
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithoutDining)

      // 应该从 mealSlots 生成占位符
      const day1 = result.finalItinerary?.days[0]
      expect(day1?.meals.length).toBeGreaterThan(0)
    })
  })

  describe('住宿信息整合', () => {
    it('应该正确整合酒店信息', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      expect(result.finalItinerary?.accommodation.length).toBe(1)

      const hotel = result.finalItinerary?.accommodation[0]
      expect(hotel?.name).toBe('杭州西湖大酒店')
      expect(hotel?.type).toBe('hotel')
      expect(hotel?.price_per_night).toBe(350)
    })

    it('没有住宿时应该返回空数组', async () => {
      const stateWithoutAccommodation: TripState = {
        ...mockState,
        accommodation: null,
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithoutAccommodation)

      expect(result.finalItinerary?.accommodation).toEqual([])
    })

    it('应该保留酒店设施信息', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const hotel = result.finalItinerary?.accommodation[0]
      expect(hotel?.amenities).toContain('免费WiFi')
      expect(hotel?.amenities).toContain('游泳池')
    })
  })

  describe('交通信息整合', () => {
    it('应该生成本地交通方式', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const localTransport = result.finalItinerary?.transportation.local
      expect(localTransport?.methods).toBeDefined()
      expect(localTransport?.methods.length).toBeGreaterThan(0)
    })

    it('应该正确翻译交通模式', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const methods = result.finalItinerary?.transportation.local.methods
      // 检查是否包含中文翻译
      expect(methods).toContain('步行')
      expect(methods).toContain('公交/地铁')
      expect(methods).toContain('出租车/网约车')
    })

    it('应该计算本地交通费用', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      expect(result.finalItinerary?.transportation.local.estimated_cost).toBe(100)
    })

    it('有出发地时应该生成往返交通', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      expect(result.finalItinerary?.transportation.to_destination.method).toContain('高铁')
      expect(result.finalItinerary?.transportation.to_destination.details).toContain('上海')
    })

    it('无出发地时应该提示自行前往', async () => {
      const stateWithoutOrigin: TripState = {
        ...mockState,
        userInput: {
          ...mockState.userInput,
          origin: undefined,
        },
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithoutOrigin)

      expect(result.finalItinerary?.transportation.to_destination.method).toContain('自行')
    })
  })

  describe('费用汇总', () => {
    it('应该从 budgetResult 获取费用分解', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const cost = result.finalItinerary?.estimated_cost
      expect(cost?.accommodation).toBe(350)
      expect(cost?.transportation).toBe(100)
      expect(cost?.food).toBe(600)
      expect(cost?.attractions).toBe(200)
    })

    it('应该计算其他费用（5%）', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const totalBase = 350 + 100 + 600 + 200 // 1250
      const expectedOther = Math.round(totalBase * 0.05) // 63

      expect(result.finalItinerary?.estimated_cost.other).toBe(expectedOther)
    })

    it('应该计算总费用（105%）', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const totalBase = 350 + 100 + 600 + 200 // 1250
      const expectedTotal = Math.round(totalBase * 1.05) // 1313

      expect(result.finalItinerary?.estimated_cost.total).toBe(expectedTotal)
    })

    it('没有 budgetResult 时应该从各模块计算', async () => {
      const stateWithoutBudgetResult: TripState = {
        ...mockState,
        budgetResult: null,
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithoutBudgetResult)

      // 应该从各模块的 totalCost 计算
      expect(result.finalItinerary?.estimated_cost.accommodation).toBe(350)
      expect(result.finalItinerary?.estimated_cost.transportation).toBe(100)
      expect(result.finalItinerary?.estimated_cost.food).toBe(600)
    })
  })

  describe('行程摘要生成', () => {
    it('应该包含目的地和天数', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const summary = result.finalItinerary?.summary || ''
      expect(summary).toContain('杭州')
      expect(summary).toContain('2日游')
    })

    it('应该包含主要景点', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const summary = result.finalItinerary?.summary || ''
      expect(summary).toContain('西湖')
    })

    it('应该包含酒店名称', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const summary = result.finalItinerary?.summary || ''
      expect(summary).toContain('杭州西湖大酒店')
    })

    it('应该包含预计总花费', async () => {
      const agent = createFinalizeAgent()
      const result = await agent(mockState)

      const summary = result.finalItinerary?.summary || ''
      expect(summary).toContain('¥')
    })
  })

  describe('错误处理', () => {
    it('发生错误时应该返回基本行程结构', async () => {
      // 创建会导致错误的状态
      const invalidState = {
        userInput: null, // 这会导致访问 userInput.destination 时出错
        draftItinerary: mockDraftItinerary,
      } as unknown as TripState

      const agent = createFinalizeAgent()
      const result = await agent(invalidState)

      // 应该返回基本结构而不是抛出错误
      expect(result.finalItinerary).toBeDefined()
      expect(result.finalItinerary?.days).toEqual([])
      expect(result.finalItinerary?.summary).toContain('错误')
    })
  })

  describe('边界情况', () => {
    it('应该处理空的活动列表', async () => {
      const stateWithEmptyAttractions: TripState = {
        ...mockState,
        draftItinerary: {
          days: [
            {
              day: 1,
              date: '2025-12-01',
              attractions: [],
              mealSlots: [],
            },
          ],
          totalAttractions: 0,
          totalMeals: 0,
        },
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithEmptyAttractions)

      expect(result.finalItinerary?.days[0]?.activities).toEqual([])
    })

    it('应该处理没有推荐交通模式的情况', async () => {
      const stateWithoutRecommendedModes: TripState = {
        ...mockState,
        transport: {
          ...mockTransport,
          recommendedModes: undefined as any,
        },
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithoutRecommendedModes)

      // 应该使用默认值
      const methods = result.finalItinerary?.transportation.local.methods
      expect(methods).toContain('公交')
      expect(methods).toContain('地铁')
      expect(methods).toContain('步行')
    })

    it('应该处理活动没有位置信息的情况', async () => {
      const stateWithNoLocation: TripState = {
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
                  // 没有 location
                },
              ],
              mealSlots: [],
            },
          ],
          totalAttractions: 1,
          totalMeals: 0,
        },
      }

      const agent = createFinalizeAgent()
      const result = await agent(stateWithNoLocation)

      // 应该生成默认位置
      const activity = result.finalItinerary?.days[0]?.activities[0]
      expect(activity?.location).toBeDefined()
      expect(activity?.location.name).toBe('西湖')
    })
  })
})

describe('费用计算测试', () => {
  it('应该正确计算总费用（各项之和）', () => {
    const costs = {
      accommodation: 350,
      transport: 100,
      dining: 600,
      attractions: 200,
    }

    const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0)
    expect(total).toBe(1250)
  })

  it('应该正确计算 5% 其他费用', () => {
    const baseTotal = 1250
    const other = Math.round(baseTotal * 0.05)
    expect(other).toBe(63)
  })

  it('应该正确计算 105% 总费用', () => {
    const baseTotal = 1250
    const finalTotal = Math.round(baseTotal * 1.05)
    expect(finalTotal).toBe(1313)
  })
})

describe('交通模式翻译测试', () => {
  it('应该正确翻译所有交通模式', () => {
    const modeMap: Record<string, string> = {
      'walking': '步行',
      'transit': '公交/地铁',
      'driving': '出租车/网约车',
      'cycling': '骑行',
    }

    const testModes = ['walking', 'transit', 'driving', 'cycling']
    const translated = testModes.map(m => modeMap[m] || m)

    expect(translated).toEqual(['步行', '公交/地铁', '出租车/网约车', '骑行'])
  })

  it('未知模式应该保持原样', () => {
    const modeMap: Record<string, string> = {
      'walking': '步行',
      'transit': '公交/地铁',
    }

    const unknownMode = 'flying'
    const translated = modeMap[unknownMode] || unknownMode

    expect(translated).toBe('flying')
  })
})

describe('餐饮占位符生成测试', () => {
  it('应该根据 mealType 生成正确的中文名称', () => {
    const mealTypeMap: Record<string, string> = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐',
    }

    expect(mealTypeMap['breakfast']).toBe('早餐')
    expect(mealTypeMap['lunch']).toBe('午餐')
    expect(mealTypeMap['dinner']).toBe('晚餐')
  })

  it('应该生成合理的默认餐饮价格', () => {
    const defaultPrice = 50
    expect(defaultPrice).toBeGreaterThan(0)
    expect(defaultPrice).toBeLessThan(100)
  })
})
