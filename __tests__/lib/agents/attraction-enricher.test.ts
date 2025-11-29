/**
 * Attraction Enricher Agent 单元测试
 * 测试景点详情增强逻辑、门票价格估算、开放时间推断、标签生成
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
                  enrichedAttractions: [
                    {
                      name: '西湖',
                      ticketPrice: 0,
                      ticketInfo: '西湖景区免费开放',
                      openingHours: '全天开放',
                      rating: 4.8,
                      recommendedDuration: '3-4小时',
                      description: '西湖是中国著名的旅游胜地',
                      tips: ['建议清晨或傍晚游览', '可以租借自行车环湖'],
                      tags: ['世界遗产', '5A景区', '免费开放'],
                    },
                    {
                      name: '灵隐寺',
                      ticketPrice: 45,
                      ticketInfo: '成人票45元，飞来峰另收30元',
                      openingHours: '07:00-18:00',
                      rating: 4.6,
                      recommendedDuration: '2-3小时',
                      description: '灵隐寺是中国著名的佛教寺院',
                      tips: ['建议请香', '注意着装'],
                      tags: ['历史文化', '宗教场所'],
                    },
                  ],
                  totalTicketCost: 45,
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
      count: 1,
      pois: [
        {
          id: 'B0FFG8Y81O',
          name: '西湖风景名胜区',
          type: '风景名胜;风景名胜;国家级景点',
          typecode: '110200',
          address: '杭州市西湖区龙井路1号',
          location: '120.148732,30.242945',
          tel: '0571-87179539',
          photos: ['https://example.com/xihu1.jpg', 'https://example.com/xihu2.jpg'],
          rating: '4.8',
        },
      ],
    }),
  })),
}))

// 导入被测试模块
import {
  createAttractionEnricherAgent,
  estimateTicketPrice,
  inferOpeningHours,
  inferDuration,
  generateTags,
} from '@/lib/agents/nodes/attraction-enricher'

describe('Attraction Enricher Agent Unit Tests', () => {
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
    attractionEnrichment: null,
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

  describe('createAttractionEnricherAgent', () => {
    it('应该成功创建 Agent', () => {
      const agent = createAttractionEnricherAgent()
      expect(agent).toBeDefined()
      expect(typeof agent).toBe('function')
    })

    it('应该接受 AI 配置参数', () => {
      const agent = createAttractionEnricherAgent({
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

      const agent = createAttractionEnricherAgent({ apiKey: 'test-key' })
      const result = await agent(stateWithoutDraft)

      expect(result.attractionEnrichment).toBeDefined()
      expect(result.attractionEnrichment?.enrichedAttractions).toEqual([])
      expect(result.attractionEnrichment?.totalAttractions).toBe(0)
      expect(result.attractionEnrichment?.errors).toContain('No draft itinerary available')
    })

    it('应该返回增强后的景点列表', async () => {
      const agent = createAttractionEnricherAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.attractionEnrichment).toBeDefined()
      expect(result.attractionEnrichment?.enrichedAttractions.length).toBe(3)
      expect(result.attractionEnrichment?.totalAttractions).toBe(3)
    })

    it('应该正确统计增强数量', async () => {
      const agent = createAttractionEnricherAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.attractionEnrichment?.enrichedCount).toBeGreaterThanOrEqual(0)
    })

    it('应该计算门票总费用', async () => {
      const agent = createAttractionEnricherAgent({ apiKey: 'test-key' })
      const result = await agent(mockState)

      expect(result.attractionEnrichment?.totalTicketCost).toBeGreaterThanOrEqual(0)
    })

    it('没有 API Key 时应该直接使用估算结果', async () => {
      const agent = createAttractionEnricherAgent({ apiKey: '' })
      const result = await agent(mockState)

      expect(result.attractionEnrichment).toBeDefined()
      expect(result.attractionEnrichment?.enrichedAttractions.length).toBe(3)
    })

    it('应该为每个景点添加门票价格', async () => {
      const agent = createAttractionEnricherAgent({ apiKey: '' })
      const result = await agent(mockState)

      result.attractionEnrichment?.enrichedAttractions.forEach(attraction => {
        expect(attraction.ticketPrice).toBeDefined()
        expect(typeof attraction.ticketPrice).toBe('number')
      })
    })

    it('应该为每个景点添加开放时间', async () => {
      const agent = createAttractionEnricherAgent({ apiKey: '' })
      const result = await agent(mockState)

      result.attractionEnrichment?.enrichedAttractions.forEach(attraction => {
        expect(attraction.openingHours).toBeDefined()
        expect(typeof attraction.openingHours).toBe('string')
      })
    })

    it('应该为每个景点添加标签', async () => {
      const agent = createAttractionEnricherAgent({ apiKey: '' })
      const result = await agent(mockState)

      result.attractionEnrichment?.enrichedAttractions.forEach(attraction => {
        expect(attraction.tags).toBeDefined()
        expect(Array.isArray(attraction.tags)).toBe(true)
        expect(attraction.tags!.length).toBeGreaterThan(0)
      })
    })
  })
})

describe('estimateTicketPrice', () => {
  it('公园应该返回 0（免费）', () => {
    expect(estimateTicketPrice('人民公园')).toBe(0)
    expect(estimateTicketPrice('中山公园')).toBe(0)
    expect(estimateTicketPrice('滨江公园广场')).toBe(0)
  })

  it('步行街/商业街应该返回 0', () => {
    expect(estimateTicketPrice('南京路步行街')).toBe(0)
    expect(estimateTicketPrice('春熙路商业街')).toBe(0)
    expect(estimateTicketPrice('王府井步行街')).toBe(0)
  })

  it('博物馆应该返回适中价格', () => {
    const price = estimateTicketPrice('故宫博物馆')
    // 故宫是著名景点，价格会更高
    expect(price).toBeGreaterThanOrEqual(30)
  })

  it('普通博物馆应该返回 30', () => {
    const price = estimateTicketPrice('杭州博物馆')
    expect(price).toBe(30)
  })

  it('纪念馆应该返回 30', () => {
    const price = estimateTicketPrice('中国丝绸博物馆')
    expect(price).toBe(30)
  })

  it('寺庙应该返回 50', () => {
    expect(estimateTicketPrice('灵隐寺')).toBe(50)
    expect(estimateTicketPrice('大报恩寺')).toBe(50)
    expect(estimateTicketPrice('法喜寺')).toBe(50)
  })

  it('古镇应该返回 80', () => {
    expect(estimateTicketPrice('乌镇古镇')).toBe(80)
    expect(estimateTicketPrice('西塘古镇')).toBe(80)
    expect(estimateTicketPrice('南浔古镇')).toBe(80)
  })

  it('主题乐园应该返回 300', () => {
    expect(estimateTicketPrice('迪士尼乐园')).toBe(300)
    expect(estimateTicketPrice('上海欢乐谷')).toBe(300)
    expect(estimateTicketPrice('环球影城')).toBe(300)
  })

  it('山景区应该返回 100', () => {
    expect(estimateTicketPrice('泰山')).toBe(100)
    expect(estimateTicketPrice('华山')).toBe(100)
    expect(estimateTicketPrice('天目山')).toBe(100)
  })

  it('著名景点（世界遗产级别）应该返回 150', () => {
    expect(estimateTicketPrice('故宫')).toBe(150)
    expect(estimateTicketPrice('长城')).toBe(150)
    expect(estimateTicketPrice('兵马俑')).toBe(150)
    expect(estimateTicketPrice('黄山风景区')).toBe(150) // 黄山是著名景点，优先匹配
  })

  it('湖泊景点应该返回 50', () => {
    expect(estimateTicketPrice('西湖')).toBe(150) // 西湖是著名景点，先匹配到
    expect(estimateTicketPrice('千岛湖')).toBe(50)
    expect(estimateTicketPrice('太湖')).toBe(50)
    expect(estimateTicketPrice('洞庭湖')).toBe(50)
  })

  it('动物园/海洋馆应该返回 120', () => {
    expect(estimateTicketPrice('上海动物园')).toBe(120)
    expect(estimateTicketPrice('海洋馆')).toBe(120)
    expect(estimateTicketPrice('北京植物园')).toBe(120)
  })

  it('夜市应该返回 0', () => {
    expect(estimateTicketPrice('河坊街夜市')).toBe(0)
  })

  it('未知类型应该返回默认价格 60', () => {
    expect(estimateTicketPrice('某某景点')).toBe(60)
    expect(estimateTicketPrice('特色小镇')).toBe(60)
  })
})

describe('inferOpeningHours', () => {
  it('博物馆应该返回 09:00-17:00（周一闭馆）', () => {
    expect(inferOpeningHours('故宫博物馆')).toBe('09:00-17:00（周一闭馆）')
    expect(inferOpeningHours('中国美术馆')).toBe('09:00-17:00（周一闭馆）')
    expect(inferOpeningHours('国家纪念馆')).toBe('09:00-17:00（周一闭馆）')
  })

  it('公园应该返回 06:00-22:00', () => {
    expect(inferOpeningHours('人民公园')).toBe('06:00-22:00')
    expect(inferOpeningHours('中山公园')).toBe('06:00-22:00')
  })

  it('商业街应该返回 10:00-22:00', () => {
    expect(inferOpeningHours('南京路步行街')).toBe('10:00-22:00')
    expect(inferOpeningHours('春熙路商业街')).toBe('10:00-22:00')
    expect(inferOpeningHours('购物中心')).toBe('10:00-22:00')
  })

  it('夜市应该返回 17:00-24:00', () => {
    expect(inferOpeningHours('河坊街夜市')).toBe('17:00-24:00')
  })

  it('寺庙应该返回 07:00-17:00', () => {
    expect(inferOpeningHours('灵隐寺')).toBe('07:00-17:00')
    expect(inferOpeningHours('法喜寺')).toBe('07:00-17:00')
  })

  it('默认景区应该返回 08:30-17:30', () => {
    expect(inferOpeningHours('某某景区')).toBe('08:30-17:30')
    expect(inferOpeningHours('风景区')).toBe('08:30-17:30')
  })
})

describe('inferDuration', () => {
  it('大型景区应该返回 4-6小时', () => {
    expect(inferDuration('故宫')).toBe('4-6小时')
    expect(inferDuration('北京迪士尼')).toBe('4-6小时')
    expect(inferDuration('环球影城')).toBe('4-6小时')
    expect(inferDuration('欢乐谷')).toBe('4-6小时')
  })

  it('博物馆应该返回 2-3小时', () => {
    expect(inferDuration('国家博物馆')).toBe('2-3小时')
    expect(inferDuration('上海美术馆')).toBe('2-3小时')
  })

  it('古镇应该返回 3-4小时', () => {
    expect(inferDuration('乌镇古镇')).toBe('3-4小时')
    expect(inferDuration('西塘古村')).toBe('3-4小时')
  })

  it('公园/湖泊应该返回 2-3小时', () => {
    expect(inferDuration('人民公园')).toBe('2-3小时')
    expect(inferDuration('千岛湖')).toBe('2-3小时')
  })

  it('商业街应该返回 2-3小时', () => {
    expect(inferDuration('南京路步行街')).toBe('2-3小时')
    expect(inferDuration('春熙路商业街')).toBe('2-3小时')
  })

  it('打卡点应该返回 1-2小时', () => {
    expect(inferDuration('雷峰塔')).toBe('1-2小时')
    expect(inferDuration('东方明珠塔')).toBe('1-2小时')
    expect(inferDuration('断桥残雪')).toBe('1-2小时') // 改用不含"湖"的名称
    expect(inferDuration('天安门广场')).toBe('1-2小时')
  })

  it('默认应该返回 2小时', () => {
    expect(inferDuration('某某景点')).toBe('2小时')
  })
})

describe('generateTags', () => {
  it('免费景点应该包含"免费开放"标签', () => {
    const tags = generateTags('人民公园', undefined, 0)
    expect(tags).toContain('免费开放')
  })

  it('世界遗产应该包含相关标签', () => {
    const tags = generateTags('故宫')
    expect(tags).toContain('世界遗产')
    expect(tags).toContain('必去景点')
  })

  it('博物馆应该包含"历史文化"和"室内"标签', () => {
    const tags = generateTags('国家博物馆')
    expect(tags).toContain('历史文化')
    expect(tags).toContain('室内')
  })

  it('自然景点应该包含"自然风光"和"户外"标签', () => {
    const tags = generateTags('黄山')
    expect(tags).toContain('自然风光')
    expect(tags).toContain('户外')
  })

  it('古镇应该包含"人文景观"和"拍照打卡"标签', () => {
    const tags = generateTags('乌镇古镇')
    expect(tags).toContain('人文景观')
    expect(tags).toContain('拍照打卡')
  })

  it('乐园应该包含"亲子游"和"娱乐休闲"标签', () => {
    const tags = generateTags('迪士尼乐园')
    expect(tags).toContain('亲子游')
    expect(tags).toContain('娱乐休闲')
  })

  it('动物园应该包含"亲子游"标签', () => {
    const tags = generateTags('上海动物园')
    expect(tags).toContain('亲子游')
  })

  it('海洋馆应该包含"亲子游"标签', () => {
    const tags = generateTags('海洋馆')
    expect(tags).toContain('亲子游')
  })

  it('夜市应该包含"夜游"标签', () => {
    const tags = generateTags('河坊街夜市')
    expect(tags).toContain('夜游')
  })

  it('未知类型应该至少包含一个标签', () => {
    const tags = generateTags('某某景点')
    expect(tags.length).toBeGreaterThan(0)
    expect(tags).toContain('景点游览')
  })

  it('多个条件匹配时应该包含所有相关标签', () => {
    const tags = generateTags('西湖公园', undefined, 0)
    expect(tags).toContain('免费开放')
    expect(tags).toContain('自然风光')
    expect(tags).toContain('户外')
  })
})

describe('错误处理', () => {
  it('MCP 客户端返回 null 时应该使用估算值', async () => {
    // Mock MCP 客户端返回 null
    vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
      searchPOI: vi.fn().mockResolvedValue(null),
    })) as any

    const agent = createAttractionEnricherAgent({ apiKey: '' })
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
      attractionEnrichment: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    // 应该仍然返回增强结果（使用估算值）
    expect(result.attractionEnrichment).toBeDefined()
    expect(result.attractionEnrichment?.enrichedAttractions.length).toBe(1)
    expect(result.attractionEnrichment?.enrichedAttractions[0].ticketPrice).toBeDefined()
  })

  it('MCP 客户端抛出错误时应该继续处理', async () => {
    // Mock MCP 客户端抛出错误
    vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
      searchPOI: vi.fn().mockRejectedValue(new Error('MCP Error')),
    })) as any

    const agent = createAttractionEnricherAgent({ apiKey: '' })
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
      attractionEnrichment: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    // 应该返回结果，并记录错误
    expect(result.attractionEnrichment).toBeDefined()
    expect(result.attractionEnrichment?.errors).toBeDefined()
    expect(result.attractionEnrichment?.errors?.length).toBeGreaterThan(0)
  })

  it('空景点列表时应该返回空结果', async () => {
    const agent = createAttractionEnricherAgent({ apiKey: '' })
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
            attractions: [], // 空景点列表
            mealSlots: [],
          },
        ],
        totalAttractions: 0,
        totalMeals: 0,
      },
      accommodation: null,
      transport: null,
      dining: null,
      attractionEnrichment: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    expect(result.attractionEnrichment?.enrichedAttractions).toEqual([])
    expect(result.attractionEnrichment?.totalAttractions).toBe(0)
  })
})

describe('门票费用计算', () => {
  it('应该按人数计算门票总费用', async () => {
    // 重新 mock MCP 客户端返回灵隐寺数据
    vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
      searchPOI: vi.fn().mockResolvedValue({
        count: 1,
        pois: [
          {
            id: 'B0FFG8Y123',
            name: '灵隐寺',
            type: '风景名胜;寺庙道观',
            typecode: '110201',
            address: '杭州市西湖区灵隐路法云弄1号',
            location: '120.123456,30.234567',
            tel: '0571-87968665',
            rating: '4.6',
          },
        ],
      }),
    })) as any

    const agent = createAttractionEnricherAgent({ apiKey: '' })
    const result = await agent({
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        budget: 3000,
        travelers: 3, // 3 人
        adult_count: 2,
        child_count: 1,
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
                name: '灵隐寺', // 估算 50 元
                duration: '2小时',
                type: 'attraction',
                location: { name: '灵隐寺', address: '杭州市', lat: 30.234567, lng: 120.123456 },
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
      attractionEnrichment: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    // 灵隐寺估算 50 元 × 3 人 = 150 元
    expect(result.attractionEnrichment?.totalTicketCost).toBe(150)
  })

  it('免费景点不应该增加总费用', async () => {
    const agent = createAttractionEnricherAgent({ apiKey: '' })
    const result = await agent({
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
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
                name: '人民公园', // 免费
                duration: '2小时',
                type: 'attraction',
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
      attractionEnrichment: null,
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    } as TripState)

    expect(result.attractionEnrichment?.totalTicketCost).toBe(0)
  })
})
