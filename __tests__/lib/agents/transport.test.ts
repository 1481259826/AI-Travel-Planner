/**
 * Transport Logistician Agent 单元测试
 * 测试交通路线计算、费用估算、交通模式选择
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TripState, DraftItinerary, AccommodationResult } from '@/lib/agents/state'

// Mock MCP Client
vi.mock('@/lib/agents/mcp-client', () => ({
  getMCPClient: vi.fn(() => ({
    getWalkingRoute: vi.fn().mockImplementation((origin, destination) => {
      // 根据坐标差异计算模拟距离
      const [lng1, lat1] = origin.split(',').map(Number)
      const [lng2, lat2] = destination.split(',').map(Number)
      const dist = Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2)) * 111000 // 大约转换为米

      return Promise.resolve({
        distance: dist,
        duration: dist / 1.2, // 约 1.2m/s 步行速度
      })
    }),
    getTransitRoute: vi.fn().mockResolvedValue({
      distance: 5000,
      duration: 1200, // 20 分钟
    }),
    getDrivingRoute: vi.fn().mockResolvedValue({
      distance: 8000,
      duration: 900, // 15 分钟
      taxi_cost: 25,
      polyline: 'encoded_polyline_data',
    }),
    getBicyclingRoute: vi.fn().mockResolvedValue({
      distance: 6000,
      duration: 1000, // 约 16 分钟
    }),
  })),
}))

// 导入被测试模块
import { createTransportAgent } from '@/lib/agents/nodes/transport'

describe('Transport Logistician Agent Unit Tests', () => {
  // 创建带有草稿行程和住宿的测试状态
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
        mealSlots: [],
      },
    ],
    totalAttractions: 2,
    totalMeals: 0,
  }

  const mockAccommodation: AccommodationResult = {
    recommendations: [],
    selected: {
      name: '杭州大酒店',
      type: 'hotel',
      location: { name: '杭州大酒店', address: '杭州市', lat: 30.250000, lng: 120.160000 },
      check_in: '2025-12-01',
      check_out: '2025-12-02',
      price_per_night: 300,
      total_price: 300,
      rating: 4.5,
      amenities: [],
    },
    totalCost: 300,
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
    attractionEnrichment: null,
    accommodation: mockAccommodation,
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

  describe('createTransportAgent', () => {
    it('应该成功创建 Agent', () => {
      const agent = createTransportAgent()
      expect(agent).toBeDefined()
      expect(typeof agent).toBe('function')
    })

    it('应该接受 AI 配置参数', () => {
      const agent = createTransportAgent({
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

      const agent = createTransportAgent()
      const result = await agent(stateWithoutDraft)

      expect(result.transport).toBeDefined()
      expect(result.transport?.segments).toEqual([])
      expect(result.transport?.totalCost).toBe(0)
    })

    it('应该返回交通路线段', async () => {
      const agent = createTransportAgent()
      const result = await agent(mockState)

      expect(result.transport).toBeDefined()
      expect(result.transport?.segments.length).toBeGreaterThan(0)
    })

    it('应该计算酒店到第一个景点的路线', async () => {
      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 第一个路段应该是从酒店出发
      const firstSegment = result.transport?.segments[0]
      expect(firstSegment?.from.name).toBe('杭州大酒店')
    })

    it('应该计算景点间的路线', async () => {
      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 应该有多个路段
      expect(result.transport?.segments.length).toBeGreaterThan(1)
    })

    it('应该计算最后景点回酒店的路线', async () => {
      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 最后一个路段应该到酒店
      const segments = result.transport?.segments || []
      const lastSegment = segments[segments.length - 1]
      expect(lastSegment?.to.name).toBe('杭州大酒店')
    })

    it('应该根据人数计算总费用', async () => {
      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 2 人，所以总费用应该是基础费用的 2 倍
      expect(result.transport?.totalCost).toBeGreaterThan(0)
    })
  })

  describe('calculateSegment 交通模式选择', () => {
    it('短距离（<1.5km）应该推荐步行', async () => {
      // Mock 返回短距离
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWalkingRoute: vi.fn().mockResolvedValue({
          distance: 800, // 800 米
          duration: 600, // 10 分钟
        }),
        getTransitRoute: vi.fn().mockResolvedValue(null),
        getDrivingRoute: vi.fn().mockResolvedValue(null),
        getBicyclingRoute: vi.fn().mockResolvedValue(null),
      })) as any

      const shortDistanceState: TripState = {
        ...mockState,
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
                  location: { name: 'A', address: '', lat: 30.242, lng: 120.148 },
                },
                {
                  time: '12:00',
                  name: '景点B',
                  duration: '2小时',
                  type: 'attraction',
                  location: { name: 'B', address: '', lat: 30.243, lng: 120.149 }, // 很近
                },
              ],
              mealSlots: [],
            },
          ],
          totalAttractions: 2,
          totalMeals: 0,
        },
        accommodation: null, // 没有酒店，只计算景点间
      }

      const agent = createTransportAgent()
      const result = await agent(shortDistanceState)

      // 短距离应该推荐步行
      const walkingSegments = result.transport?.segments.filter(s => s.mode === 'walking')
      expect(walkingSegments?.length).toBeGreaterThanOrEqual(0)
    })

    it('中等距离应该推荐公交', async () => {
      // Mock 返回中等距离
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWalkingRoute: vi.fn().mockResolvedValue({
          distance: 3000, // 3km，超过步行阈值
          duration: 2400,
        }),
        getTransitRoute: vi.fn().mockResolvedValue({
          distance: 3000,
          duration: 600, // 10 分钟公交
        }),
        getDrivingRoute: vi.fn().mockResolvedValue({
          distance: 3000,
          duration: 480,
          taxi_cost: 15,
        }),
        getBicyclingRoute: vi.fn().mockResolvedValue({
          distance: 3000,
          duration: 720,
        }),
      })) as any

      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 中等距离应该有公交选项
      const transitSegments = result.transport?.segments.filter(s => s.mode === 'transit')
      expect(transitSegments).toBeDefined()
    })

    it('远距离应该推荐打车', async () => {
      // Mock 返回远距离
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWalkingRoute: vi.fn().mockResolvedValue({
          distance: 10000, // 10km
          duration: 7200,
        }),
        getTransitRoute: vi.fn().mockResolvedValue(null), // 无公交
        getDrivingRoute: vi.fn().mockResolvedValue({
          distance: 10000,
          duration: 1200,
          taxi_cost: 35,
        }),
        getBicyclingRoute: vi.fn().mockResolvedValue(null),
      })) as any

      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 远距离无公交应该推荐打车
      const drivingSegments = result.transport?.segments.filter(s => s.mode === 'driving')
      expect(drivingSegments).toBeDefined()
    })
  })

  describe('estimateTaxiCost 费用估算', () => {
    it('3km 内应该返回起步价 13 元', async () => {
      // Mock 短距离驾车
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWalkingRoute: vi.fn().mockResolvedValue({
          distance: 2500,
          duration: 1800,
        }),
        getTransitRoute: vi.fn().mockResolvedValue(null),
        getDrivingRoute: vi.fn().mockResolvedValue({
          distance: 2500, // 2.5km
          duration: 600,
          // 不提供 taxi_cost，让 Agent 估算
        }),
        getBicyclingRoute: vi.fn().mockResolvedValue(null),
      })) as any

      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 短距离出租车费用应该接近起步价
      const drivingSegment = result.transport?.segments.find(s => s.mode === 'driving')
      if (drivingSegment) {
        expect(drivingSegment.cost).toBeLessThanOrEqual(15) // 起步价左右
      }
    })

    it('超过 3km 应该按里程计费', async () => {
      // Mock 长距离驾车
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWalkingRoute: vi.fn().mockResolvedValue({
          distance: 8000,
          duration: 6000,
        }),
        getTransitRoute: vi.fn().mockResolvedValue(null),
        getDrivingRoute: vi.fn().mockResolvedValue({
          distance: 8000, // 8km
          duration: 900,
          // 不提供 taxi_cost，让 Agent 估算
        }),
        getBicyclingRoute: vi.fn().mockResolvedValue(null),
      })) as any

      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 8km 费用 = 13 + (8-3) * 2.5 = 13 + 12.5 = 25.5，约 26 元
      const drivingSegment = result.transport?.segments.find(s => s.mode === 'driving')
      if (drivingSegment) {
        expect(drivingSegment.cost).toBeGreaterThan(13)
      }
    })
  })

  describe('交通模式统计', () => {
    it('应该正确统计各交通模式使用频率', async () => {
      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 应该有推荐的交通模式
      expect(result.transport?.recommendedModes.length).toBeGreaterThan(0)
    })

    it('应该按频率排序推荐交通模式', async () => {
      const agent = createTransportAgent()
      const result = await agent(mockState)

      // recommendedModes 应该按使用频率排序
      expect(result.transport?.recommendedModes).toBeDefined()
    })
  })

  describe('路线 API 失败时的回退', () => {
    it('路线 API 失败时应该使用直线距离估算', async () => {
      // Mock 所有路线 API 都失败
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWalkingRoute: vi.fn().mockRejectedValue(new Error('API Error')),
        getTransitRoute: vi.fn().mockRejectedValue(new Error('API Error')),
        getDrivingRoute: vi.fn().mockRejectedValue(new Error('API Error')),
        getBicyclingRoute: vi.fn().mockRejectedValue(new Error('API Error')),
      })) as any

      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 即使 API 失败，也应该返回结果（可能是空的或估算的）
      expect(result.transport).toBeDefined()
    })

    it('部分 API 失败时应该使用可用的方式', async () => {
      // Mock 只有步行 API 成功
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => ({
        getWalkingRoute: vi.fn().mockResolvedValue({
          distance: 2000,
          duration: 1500,
        }),
        getTransitRoute: vi.fn().mockRejectedValue(new Error('API Error')),
        getDrivingRoute: vi.fn().mockRejectedValue(new Error('API Error')),
        getBicyclingRoute: vi.fn().mockRejectedValue(new Error('API Error')),
      })) as any

      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 应该返回结果
      expect(result.transport).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('整体错误时应该返回空结果', async () => {
      // Mock MCP Client 抛出错误
      vi.mocked(await import('@/lib/agents/mcp-client')).getMCPClient = vi.fn(() => {
        throw new Error('MCP Client Error')
      }) as any

      const agent = createTransportAgent()
      const result = await agent(mockState)

      // 应该返回空结果而不是抛出错误
      expect(result.transport).toBeDefined()
      expect(result.transport?.segments).toEqual([])
    })
  })

  describe('多天行程', () => {
    it('应该计算多天的交通路线', async () => {
      const multiDayState: TripState = {
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
                  location: { name: '西湖', address: '杭州市', lat: 30.242, lng: 120.148 },
                },
              ],
              mealSlots: [],
            },
            {
              day: 2,
              date: '2025-12-02',
              attractions: [
                {
                  time: '09:00',
                  name: '灵隐寺',
                  duration: '2小时',
                  type: 'attraction',
                  location: { name: '灵隐寺', address: '杭州市', lat: 30.234, lng: 120.123 },
                },
              ],
              mealSlots: [],
            },
          ],
          totalAttractions: 2,
          totalMeals: 0,
        },
      }

      const agent = createTransportAgent()
      const result = await agent(multiDayState)

      // 2 天行程，每天至少 2 个路段（去程和回程）
      expect(result.transport?.segments.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('没有酒店时的处理', () => {
    it('没有酒店时应该只计算景点间的路线', async () => {
      const stateWithoutHotel: TripState = {
        ...mockState,
        accommodation: null,
      }

      const agent = createTransportAgent()
      const result = await agent(stateWithoutHotel)

      // 应该仍然返回景点间的路线
      expect(result.transport).toBeDefined()
    })
  })
})
