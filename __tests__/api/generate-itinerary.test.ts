/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/generate-itinerary/route'
import { mockUser, createMockSupabaseClient } from '@/__tests__/mocks/supabase'
import type { TripFormData } from '@/types'

// Mock Itinerary 数据
const mockItinerary = {
  destination: '上海',
  startDate: '2025-02-01',
  endDate: '2025-02-03',
  totalDays: 3,
  budget: 3000,
  days: [
    {
      day: 1,
      date: '2025-02-01',
      theme: '抵达和城市探索',
      activities: [
        {
          time: '09:00',
          type: 'attraction',
          name: '外滩',
          description: '上海标志性景点',
          duration: 2,
          cost: 0,
          location: {
            address: '上海市黄浦区中山东一路',
            lat: 31.239,
            lng: 121.485,
          },
          rating: 4.8,
        },
      ],
    },
  ],
  estimatedCost: {
    accommodation: 1500,
    food: 600,
    transportation: 200,
    attractions: 400,
    total: 2700,
  },
  notes: ['建议提前预订'],
}

// Mock requireAuth
const mockRequireAuth = vi.fn()

// Mock API 工具函数
const mockCreateAIClient = vi.fn()
const mockBuildItineraryPrompt = vi.fn()
const mockGenerateItinerary = vi.fn()
const mockCorrectItineraryCoordinates = vi.fn()

// Mock 其他依赖
const mockGetUserConfig = vi.fn()
const mockGetModelById = vi.fn()
const mockGetWeatherByCityName = vi.fn()
const mockOptimizeItineraryByClustering = vi.fn()

vi.mock('@/app/api/_middleware', () => ({
  requireAuth: (req: any) => mockRequireAuth(req),
}))

vi.mock('@/app/api/_middleware/error-handler', () => ({
  handleApiError: vi.fn().mockImplementation((error: Error) => {
    const status = error.message.includes('缺少必填字段') || error.message.includes('无效的模型')
      ? 400
      : error.message.includes('未配置') || error.message.includes('无法创建用户配置')
      ? 500
      : error.message.includes('未提供认证令牌')
      ? 401
      : 500

    return Response.json({ error: error.message }, { status })
  }),
}))

vi.mock('@/app/api/_utils/response', () => ({
  successResponse: vi.fn().mockImplementation((data: any, message?: string) => {
    return Response.json({ data, message }, { status: 200 })
  }),
}))

vi.mock('@/app/api/_utils', () => ({
  createAIClient: (...args: any[]) => mockCreateAIClient(...args),
  buildItineraryPrompt: (...args: any[]) => mockBuildItineraryPrompt(...args),
  generateItinerary: (...args: any[]) => mockGenerateItinerary(...args),
  correctItineraryCoordinates: (...args: any[]) => mockCorrectItineraryCoordinates(...args),
}))

vi.mock('@/lib/api-keys', () => ({
  ApiKeyClient: {
    getUserConfig: (...args: any[]) => mockGetUserConfig(...args),
  },
}))

vi.mock('@/lib/config', () => ({
  getModelById: (...args: any[]) => mockGetModelById(...args),
  appConfig: {
    deepseek: {
      apiKey: 'system-deepseek-key',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-chat',
    },
    modelscope: {
      apiKey: 'system-modelscope-key',
      baseURL: 'https://api.modelscope.cn',
    },
  },
}))

vi.mock('@/lib/amap-weather', () => ({
  getWeatherByCityName: (...args: any[]) => mockGetWeatherByCityName(...args),
}))

vi.mock('@/lib/geo-clustering', () => ({
  optimizeItineraryByClustering: (...args: any[]) => mockOptimizeItineraryByClustering(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('POST /api/generate-itinerary', () => {
  const validFormData: TripFormData = {
    destination: '上海',
    start_date: '2025-02-01',
    end_date: '2025-02-03',
    budget: 3000,
    travelers: 2,
    adult_count: 2,
    child_count: 0,
    preferences: '喜欢历史文化和美食',
    model: 'claude-haiku-4-5',
  }

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()

    // 设置默认 mock 行为
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: createMockSupabaseClient(),
      token: 'mock-token',
    })

    mockGetModelById.mockReturnValue({
      id: 'claude-haiku-4-5',
      name: 'Claude Haiku 4.5',
      provider: 'deepseek',
      maxTokens: 4000,
    })

    mockGetUserConfig.mockResolvedValue(null)

    mockCreateAIClient.mockReturnValue({})
    mockBuildItineraryPrompt.mockReturnValue('Mock prompt')
    mockGenerateItinerary.mockResolvedValue(mockItinerary)
    mockCorrectItineraryCoordinates.mockResolvedValue(mockItinerary)

    mockGetWeatherByCityName.mockResolvedValue({
      forecasts: [{ casts: [{ date: '2025-02-01', dayweather: '晴' }] }],
    })

    mockOptimizeItineraryByClustering.mockReturnValue(mockItinerary)
  })

  describe('成功场景', () => {
    it('应该使用系统 API Key 成功生成行程', async () => {
      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(validFormData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('trip_id')
      expect(data.data).toHaveProperty('itinerary')
      expect(mockGenerateItinerary).toHaveBeenCalled()
      expect(mockCorrectItineraryCoordinates).toHaveBeenCalled()
      expect(mockOptimizeItineraryByClustering).toHaveBeenCalled()
    })

    it('应该使用用户自定义 API Key 成功生成行程', async () => {
      mockGetUserConfig.mockResolvedValue({
        apiKey: 'user-custom-key',
        baseUrl: 'https://custom.api.com',
      })

      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(validFormData),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockGetUserConfig).toHaveBeenCalledWith(
        mockUser.id,
        'deepseek',
        expect.anything()
      )
    })

    it('应该自动创建不存在的用户 profile', async () => {
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: createMockSupabaseClient({ profileExists: false }),
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(validFormData),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('验证场景', () => {
    it('应该拒绝缺少目的地的请求', async () => {
      const invalidData = { ...validFormData, destination: '' }
      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('缺少必填字段')
    })

    it('应该拒绝缺少开始日期的请求', async () => {
      const invalidData = { ...validFormData, start_date: '' }
      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('缺少必填字段')
    })

    it('应该拒绝缺少结束日期的请求', async () => {
      const invalidData = { ...validFormData, end_date: '' }
      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('缺少必填字段')
    })

    it('应该拒绝无效的模型选择', async () => {
      mockGetModelById.mockReturnValue(null)

      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ ...validFormData, model: 'invalid-model' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('无效的模型选择')
    })
  })

  // 注意：数据库错误场景（如 profile 创建失败）更适合集成测试

  describe('认证场景', () => {
    it('应该在未认证时返回错误', async () => {
      mockRequireAuth.mockRejectedValue(new Error('未提供认证令牌，请先登录'))

      const request = new NextRequest('http://localhost/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validFormData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('未提供认证令牌')
    })
  })
})
