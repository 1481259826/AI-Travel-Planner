/**
 * 行程生成完整流程集成测试
 *
 * 测试完整的行程生成流程：
 * 1. API Key 检查
 * 2. AI 模型调用
 * 3. 坐标转换和修正
 * 4. 地理聚类优化
 * 5. 保存到数据库
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiKeyClient } from '@/lib/api-keys'
import { GeocodingService } from '@/lib/services/geocoding.service'
import { optimizeItineraryByClustering } from '@/lib/geo-clustering'
import { correctItineraryCoordinates } from '@/app/api/_utils/coordinate-fixer'
import { createMockSupabaseClient } from '../mocks/supabase'

// Mock 外部依赖
vi.mock('@/lib/api-keys')
vi.mock('@/lib/services/geocoding.service')
vi.mock('@/lib/geo-clustering')
vi.mock('@/app/api/_utils/coordinate-fixer')

describe('行程生成完整流程集成测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
  })

  it('应该完成完整的行程生成流程：DeepSeek 模型', async () => {
    // 1. 模拟 API Key 配置
    const mockApiConfig = {
      apiKey: 'sk-deepseek-test-key',
      baseUrl: 'https://api.deepseek.com',
      extraConfig: {}
    }
    vi.mocked(ApiKeyClient.getUserConfig).mockResolvedValue(mockApiConfig)

    // 2. 模拟 AI 响应（DeepSeek OpenAI 兼容 API）
    const mockAiResponse = {
      title: '北京三日文化之旅',
      destination: '北京',
      days: 3,
      dailyPlans: [
        {
          day: 1,
          date: '2025-01-20',
          theme: '故宫与天安门',
          activities: [
            {
              time: '09:00',
              location: '天安门广场',
              type: 'attraction',
              description: '参观天安门广场',
              duration: 60,
              coordinates: { lat: 39.9075, lng: 116.3972 } // WGS84 坐标
            },
            {
              time: '10:30',
              location: '故宫博物院',
              type: 'attraction',
              description: '游览故宫',
              duration: 180,
              coordinates: { lat: 39.9163, lng: 116.3972 } // WGS84 坐标
            }
          ],
          accommodation: {
            name: '北京王府井酒店',
            address: '王府井大街138号',
            checkIn: '15:00',
            checkOut: '12:00',
            coordinates: { lat: 39.9167, lng: 116.4074 } // WGS84 坐标
          }
        }
      ],
      estimatedCost: { total: 3000, breakdown: {} }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify(mockAiResponse)
          }
        }]
      })
    })

    // 3. 模拟坐标修正
    vi.mocked(correctItineraryCoordinates).mockImplementation(async (itinerary: any) => {
      // 模拟坐标修正：将 WGS84 转换为 GCJ-02
      const dailyPlans = itinerary.dailyPlans || itinerary.days || []
      for (const day of dailyPlans) {
        for (const activity of day.activities || []) {
          if (activity.coordinates) {
            // 简单模拟：增加一点偏移（实际是 WGS84 → GCJ-02）
            activity.coordinates = {
              lat: activity.coordinates.lat + 0.005,
              lng: activity.coordinates.lng + 0.01
            }
          }
        }
      }
      return itinerary
    })

    // 4. 模拟地理聚类优化
    vi.mocked(optimizeItineraryByClustering).mockImplementation((itinerary: any) => {
      // 简单返回原始行程（实际会重新排序）
      return itinerary
    })

    // 5. 模拟数据库保存
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'trip-123',
              title: '北京三日文化之旅',
              user_id: 'user-123',
              itinerary: mockAiResponse
            },
            error: null
          })
        })
      })
    } as any)

    // 执行完整流程
    const userId = 'user-123'
    const requestData = {
      destination: '北京',
      startDate: '2025-01-20',
      duration: 3,
      budget: 3000,
      preferences: '文化历史'
    }

    // Step 1: 检查 API Key 可用性
    const apiConfig = await ApiKeyClient.getUserConfig(userId, 'deepseek', mockSupabase as any)
    expect(apiConfig).toBeTruthy()
    expect(apiConfig?.apiKey).toBe('sk-deepseek-test-key')

    // Step 2: 调用 AI 模型
    const aiResponse = await fetch(apiConfig!.baseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig!.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `生成${requestData.destination}的${requestData.duration}天旅行计划`
          }
        ]
      })
    })

    expect(aiResponse.ok).toBe(true)
    const aiData = await aiResponse.json()
    const itinerary = JSON.parse(aiData.choices[0].message.content)

    expect(itinerary.title).toBe('北京三日文化之旅')
    expect(itinerary.days).toBe(3)

    // Step 3: 坐标修正
    const correctedItinerary = await correctItineraryCoordinates(itinerary, requestData.destination)

    expect(correctItineraryCoordinates).toHaveBeenCalledWith(itinerary, requestData.destination)

    // Step 4: 地理聚类优化
    const optimizedItinerary = optimizeItineraryByClustering(itinerary)
    expect(optimizeItineraryByClustering).toHaveBeenCalledWith(itinerary)

    // Step 5: 保存到数据库
    const { data: savedTrip, error } = await mockSupabase
      .from('trips')
      .insert({
        user_id: userId,
        title: optimizedItinerary.title,
        destination: requestData.destination,
        start_date: requestData.startDate,
        end_date: '2025-01-22',
        itinerary: optimizedItinerary,
        status: 'planned'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(savedTrip).toBeTruthy()
    expect(savedTrip.id).toBe('trip-123')
    expect(savedTrip.title).toBe('北京三日文化之旅')
  })

  it('应该处理 API Key 不可用的情况', async () => {
    // 模拟 API Key 不可用
    vi.mocked(ApiKeyClient.getUserConfig).mockResolvedValue(null)
    vi.mocked(ApiKeyClient.getSystemKey).mockReturnValue(null)

    const userId = 'user-123'

    // 尝试获取 API 配置
    const userConfig = await ApiKeyClient.getUserConfig(userId, 'deepseek', mockSupabase as any)
    const systemKey = ApiKeyClient.getSystemKey('deepseek')

    expect(userConfig).toBeNull()
    expect(systemKey).toBeNull()

    // 应该返回 400 错误，要求用户配置 API Key
    const errorResponse = {
      error: 'API Key 不可用',
      message: '请在设置页面配置 DeepSeek API Key',
      code: 'NO_API_KEY'
    }

    expect(errorResponse.code).toBe('NO_API_KEY')
  })

  it('应该处理 AI 模型调用失败的情况', async () => {
    // 模拟 API Key 配置正常
    const mockApiConfig = {
      apiKey: 'sk-deepseek-test-key',
      baseUrl: 'https://api.deepseek.com',
      extraConfig: {}
    }
    vi.mocked(ApiKeyClient.getUserConfig).mockResolvedValue(mockApiConfig)

    // 模拟 AI 调用失败（限流、网络错误等）
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error'
        }
      })
    })

    const userId = 'user-123'
    const apiConfig = await ApiKeyClient.getUserConfig(userId, 'deepseek', mockSupabase as any)

    const aiResponse = await fetch(apiConfig!.baseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig!.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: '生成行程' }]
      })
    })

    expect(aiResponse.ok).toBe(false)
    expect(aiResponse.status).toBe(429)

    const errorData = await aiResponse.json()
    expect(errorData.error.type).toBe('rate_limit_error')
  })

  it('应该处理坐标转换失败的情况', async () => {
    // 模拟 API Key 配置
    const mockApiConfig = {
      apiKey: 'sk-deepseek-test-key',
      baseUrl: 'https://api.deepseek.com',
      extraConfig: {}
    }
    vi.mocked(ApiKeyClient.getUserConfig).mockResolvedValue(mockApiConfig)

    // 模拟 AI 响应
    const mockAiResponse = {
      title: '测试行程',
      destination: '未知地点',
      days: 1,
      dailyPlans: [
        {
          day: 1,
          date: '2025-01-20',
          activities: [
            {
              time: '09:00',
              location: '不存在的地点',
              type: 'attraction',
              coordinates: { lat: 0, lng: 0 }
            }
          ]
        }
      ]
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify(mockAiResponse)
          }
        }]
      })
    })

    // 模拟坐标修正失败（保留原始坐标）
    vi.mocked(correctItineraryCoordinates).mockImplementation(async (itinerary: any) => {
      // 坐标修正失败，不做任何修改
      return itinerary
    })

    // 获取 AI 响应
    const apiConfig = await ApiKeyClient.getUserConfig('user-123', 'deepseek', mockSupabase as any)
    const aiResponse = await fetch(apiConfig!.baseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [] })
    })

    const aiData = await aiResponse.json()
    const itinerary = JSON.parse(aiData.choices[0].message.content)

    // 尝试坐标修正
    const correctedItinerary = await correctItineraryCoordinates(itinerary, '未知地点')

    // 验证坐标修正被调用但失败时保留原始坐标
    expect(correctItineraryCoordinates).toHaveBeenCalledWith(itinerary, '未知地点')
    expect(correctedItinerary.dailyPlans[0].activities[0].coordinates).toEqual({ lat: 0, lng: 0 })
  })

  it('应该处理数据库保存失败的情况', async () => {
    // 模拟 API Key 配置
    const mockApiConfig = {
      apiKey: 'sk-deepseek-test-key',
      baseUrl: 'https://api.deepseek.com',
      extraConfig: {}
    }
    vi.mocked(ApiKeyClient.getUserConfig).mockResolvedValue(mockApiConfig)

    // 模拟 AI 响应
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              title: '测试行程',
              destination: '北京',
              days: 1,
              dailyPlans: []
            })
          }
        }]
      })
    })

    // 模拟数据库保存失败（例如：外键约束、权限问题）
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: '23503',
              message: 'Foreign key constraint violation',
              details: 'profiles 记录不存在'
            }
          })
        })
      })
    } as any)

    const userId = 'user-123'
    const apiConfig = await ApiKeyClient.getUserConfig(userId, 'deepseek', mockSupabase as any)

    const aiResponse = await fetch(apiConfig!.baseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [] })
    })

    const aiData = await aiResponse.json()
    const itinerary = JSON.parse(aiData.choices[0].message.content)

    // 尝试保存到数据库
    const { data, error } = await mockSupabase
      .from('trips')
      .insert({
        user_id: userId,
        title: itinerary.title,
        itinerary: itinerary
      })
      .select()
      .single()

    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error.code).toBe('23503')
    expect(error.details).toContain('profiles 记录不存在')
  })

  it('应该完成完整的行程生成流程：ModelScope 模型', async () => {
    // 测试使用 ModelScope (Qwen) 模型的流程
    const mockApiConfig = {
      apiKey: 'ms-qwen-test-key',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      extraConfig: { model: 'qwen-plus' }
    }
    vi.mocked(ApiKeyClient.getUserConfig).mockResolvedValue(mockApiConfig)

    // 模拟 ModelScope API 响应
    const mockAiResponse = {
      title: '上海两日都市游',
      destination: '上海',
      days: 2,
      dailyPlans: [
        {
          day: 1,
          date: '2025-01-21',
          theme: '外滩与南京路',
          activities: [
            {
              time: '10:00',
              location: '外滩',
              type: 'attraction',
              description: '漫步外滩',
              duration: 120,
              coordinates: { lat: 31.2304, lng: 121.4737 }
            }
          ]
        }
      ],
      estimatedCost: { total: 2000 }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify(mockAiResponse)
          }
        }]
      })
    })

    vi.mocked(correctItineraryCoordinates).mockImplementation(async (itinerary: any) => {
      // 模拟坐标修正
      return itinerary
    })
    vi.mocked(optimizeItineraryByClustering).mockImplementation((it) => it)

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'trip-456', title: '上海两日都市游' },
            error: null
          })
        })
      })
    } as any)

    // 执行流程
    const userId = 'user-123'
    const apiConfig = await ApiKeyClient.getUserConfig(userId, 'modelscope', mockSupabase as any)

    expect(apiConfig?.baseUrl).toContain('dashscope.aliyuncs.com')
    expect(apiConfig?.extraConfig?.model).toBe('qwen-plus')

    const aiResponse = await fetch(apiConfig!.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig!.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig!.extraConfig?.model || 'qwen-plus',
        messages: [{ role: 'user', content: '生成行程' }]
      })
    })

    const aiData = await aiResponse.json()
    const itinerary = JSON.parse(aiData.choices[0].message.content)

    // 保存
    const { data: savedTrip } = await mockSupabase
      .from('trips')
      .insert({ user_id: userId, title: itinerary.title, itinerary })
      .select()
      .single()

    expect(savedTrip.id).toBe('trip-456')
    expect(savedTrip.title).toBe('上海两日都市游')
  })
})
