/**
 * ApiKeyChecker 模块测试
 *
 * 测试范围：
 * - 检查 API Key 可用性
 * - 检查必需服务（DeepSeek）
 * - 检查可选服务（ModelScope、地图、语音）
 * - 检查所有服务状态
 * - 用户和系统 Key 优先级
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiKeyChecker } from '@/lib/api-keys/checker'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

// Mock global fetch
global.fetch = vi.fn()

describe('ApiKeyChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkAvailability', () => {
    it('应该优先检查用户自定义 Key', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            apiKeys: [
              { service: 'deepseek', is_active: true },
            ],
          },
        }),
      })

      const result = await ApiKeyChecker.checkAvailability(
        'deepseek',
        'user-123',
        'user-token'
      )

      expect(result).toEqual({
        available: true,
        source: 'user',
        message: '使用您的自定义 DeepSeek Key',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/api-keys',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer user-token',
          },
        })
      )
    })

    it('应该在没有用户 Key 时回退到系统 Key', async () => {
      // 第一次调用：用户 Key 查询返回空
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            apiKeys: [],
          },
        }),
      })

      // 第二次调用：系统 Key 查询返回有
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            systemKeys: [
              { service: 'deepseek' },
            ],
          },
        }),
      })

      const result = await ApiKeyChecker.checkAvailability(
        'deepseek',
        'user-123',
        'user-token'
      )

      expect(result).toEqual({
        available: true,
        source: 'system',
        message: '使用系统默认 DeepSeek Key',
      })
    })

    it('应该在都没有配置时返回不可用', async () => {
      // 用户 Key 查询
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { apiKeys: [] },
        }),
      })

      // 系统 Key 查询
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [] },
        }),
      })

      const result = await ApiKeyChecker.checkAvailability(
        'deepseek',
        'user-123',
        'user-token'
      )

      expect(result).toEqual({
        available: false,
        source: 'none',
        message: '未配置 DeepSeek API Key',
      })
    })

    it('应该在没有传入 userId 和 token 时只检查系统 Key', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            systemKeys: [{ service: 'deepseek' }],
          },
        }),
      })

      const result = await ApiKeyChecker.checkAvailability('deepseek')

      expect(result).toEqual({
        available: true,
        source: 'system',
        message: '使用系统默认 DeepSeek Key',
      })

      // 只应该调用一次（系统 Key 检查）
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('应该处理用户 API 调用失败的情况', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      // 系统 Key 查询成功
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            systemKeys: [{ service: 'deepseek' }],
          },
        }),
      })

      const result = await ApiKeyChecker.checkAvailability(
        'deepseek',
        'user-123',
        'invalid-token'
      )

      expect(result).toEqual({
        available: true,
        source: 'system',
        message: '使用系统默认 DeepSeek Key',
      })
    })

    it('应该处理网络错误', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await ApiKeyChecker.checkAvailability('deepseek')

      expect(result).toEqual({
        available: false,
        source: 'none',
        message: '检查 DeepSeek API Key 失败',
      })
    })

    it('应该正确识别所有服务类型', async () => {
      const services: Array<'deepseek' | 'modelscope' | 'map' | 'voice'> = [
        'deepseek',
        'modelscope',
        'map',
        'voice',
      ]

      for (const service of services) {
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { systemKeys: [{ service }] },
          }),
        })

        const result = await ApiKeyChecker.checkAvailability(service)
        expect(result.available).toBe(true)
        expect(result.source).toBe('system')
      }
    })

    it('应该优先使用激活的用户 Key（忽略未激活的）', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            apiKeys: [
              { service: 'deepseek', is_active: false },
              { service: 'modelscope', is_active: true },
            ],
          },
        }),
      })

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [{ service: 'deepseek' }] },
        }),
      })

      const result = await ApiKeyChecker.checkAvailability('deepseek', 'user-123', 'token')

      // deepseek 的用户 Key 未激活，应该使用系统 Key
      expect(result.source).toBe('system')
    })
  })

  describe('checkDeepSeekRequired', () => {
    it('应该在 DeepSeek 可用时返回可用状态', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [{ service: 'deepseek' }] },
        }),
      })

      const result = await ApiKeyChecker.checkDeepSeekRequired()

      expect(result).toEqual({
        available: true,
        message: '使用系统默认 DeepSeek Key',
      })
    })

    it('应该在 DeepSeek 不可用时返回友好提示', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [] },
        }),
      })

      const result = await ApiKeyChecker.checkDeepSeekRequired()

      expect(result).toEqual({
        available: false,
        message:
          'DeepSeek API Key 未配置！这是系统必需的服务，请在设置页面添加 DeepSeek API Key 后再创建行程。',
      })
    })
  })

  describe('checkModelScopeOptional', () => {
    it('应该在 ModelScope 可用时返回可用状态', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [{ service: 'modelscope' }] },
        }),
      })

      const result = await ApiKeyChecker.checkModelScopeOptional()

      expect(result).toEqual({
        available: true,
        message: '使用系统默认 ModelScope Key',
      })
    })

    it('应该在 ModelScope 不可用时返回提示', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [] },
        }),
      })

      const result = await ApiKeyChecker.checkModelScopeOptional()

      expect(result).toEqual({
        available: false,
        message:
          '未配置 ModelScope API Key，将无法使用 Qwen 模型。您可以在设置页面添加 ModelScope API Key。',
      })
    })
  })

  describe('checkMapOptional', () => {
    it('应该在地图 Key 可用时返回可用状态', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [{ service: 'map' }] },
        }),
      })

      const result = await ApiKeyChecker.checkMapOptional()

      expect(result).toEqual({
        available: true,
        message: '使用系统默认 高德地图 Key',
      })
    })

    it('应该在地图 Key 不可用时返回提示', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [] },
        }),
      })

      const result = await ApiKeyChecker.checkMapOptional()

      expect(result).toEqual({
        available: false,
        message:
          '未配置地图 API Key，地图功能将不可用。您可以在设置页面添加高德地图 API Key 以使用地图功能。',
      })
    })
  })

  describe('checkVoiceOptional', () => {
    it('应该在语音 Key 可用时返回可用状态', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [{ service: 'voice' }] },
        }),
      })

      const result = await ApiKeyChecker.checkVoiceOptional()

      expect(result).toEqual({
        available: true,
        message: '使用系统默认 科大讯飞语音 Key',
      })
    })

    it('应该在语音 Key 不可用时返回提示', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { systemKeys: [] },
        }),
      })

      const result = await ApiKeyChecker.checkVoiceOptional()

      expect(result).toEqual({
        available: false,
        message:
          '未配置语音识别 API Key，将使用浏览器原生语音识别（仅支持部分浏览器）。您可以在设置页面添加科大讯飞 API Key 以获得更好的语音识别效果。',
      })
    })
  })

  describe('checkAllKeys', () => {
    it('应该检查所有服务的状态', async () => {
      // 使用 mockImplementation 来区分不同的 API 端点
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/user/api-keys') && !url.includes('system')) {
          // 用户 Key 查询
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                apiKeys: [
                  { service: 'deepseek', is_active: true },
                  { service: 'map', is_active: true },
                ],
              },
            }),
          })
        } else {
          // 系统 Key 查询
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                systemKeys: [
                  { service: 'deepseek' },
                  { service: 'modelscope' },
                  { service: 'map' },
                  { service: 'voice' },
                ],
              },
            }),
          })
        }
      })

      const result = await ApiKeyChecker.checkAllKeys('user-123', 'token')

      expect(result).toMatchObject({
        deepseek: {
          available: true,
          source: 'user',
        },
        map: {
          available: true,
          source: 'user',
        },
        modelscope: {
          available: true,
          source: 'system',
        },
        voice: {
          available: true,
          source: 'system',
        },
      })
    })

    it('应该标记不可用的服务', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            apiKeys: [],
            systemKeys: [],
          },
        }),
      })

      const result = await ApiKeyChecker.checkAllKeys()

      expect(result.deepseek.available).toBe(false)
      expect(result.modelscope.available).toBe(false)
      expect(result.map.available).toBe(false)
      expect(result.voice.available).toBe(false)

      expect(result.deepseek.source).toBe('none')
      expect(result.modelscope.source).toBe('none')
    })
  })

  describe('checkSystemKeys', () => {
    it('应该只检查系统默认 Key', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            systemKeys: [
              { service: 'deepseek' },
              { service: 'modelscope' },
            ],
          },
        }),
      })

      const result = await ApiKeyChecker.checkSystemKeys()

      expect(result.deepseek.source).toBe('system')
      expect(result.modelscope.source).toBe('system')

      // 应该调用 4 次（每个服务一次）
      expect(global.fetch).toHaveBeenCalledTimes(4)

      // 每次调用都不应该传递 Authorization header
      for (let i = 0; i < 4; i++) {
        const call = (global.fetch as any).mock.calls[i]
        expect(call[1].headers).toEqual({})
      }
    })
  })

  describe('边界情况测试', () => {
    it('应该处理 API 返回格式不正确的情况', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: 'format' }),
      })

      const result = await ApiKeyChecker.checkAvailability('deepseek')

      expect(result.available).toBe(false)
      expect(result.source).toBe('none')
    })

    it('应该处理 systemKeys 在不同位置的响应格式', async () => {
      // 测试 result.systemKeys 格式
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          systemKeys: [{ service: 'deepseek' }],
        }),
      })

      const result1 = await ApiKeyChecker.checkAvailability('deepseek')
      expect(result1.available).toBe(true)

      // 测试 result.data.systemKeys 格式
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            systemKeys: [{ service: 'deepseek' }],
          },
        }),
      })

      const result2 = await ApiKeyChecker.checkAvailability('deepseek')
      expect(result2.available).toBe(true)
    })

    it('应该处理空的 userId', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { systemKeys: [{ service: 'deepseek' }] },
        }),
      })

      const result = await ApiKeyChecker.checkAvailability('deepseek', '', 'token')

      // 空 userId 应该被视为没有传入，只检查系统 Key
      expect(result.source).toBe('system')
    })

    it('应该处理 JSON 解析失败', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('JSON parse error')
        },
      })

      const result = await ApiKeyChecker.checkAvailability('deepseek')

      expect(result.available).toBe(false)
      expect(result.source).toBe('none')
    })
  })

  describe('并发测试', () => {
    it('应该能同时检查多个服务', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            systemKeys: [
              { service: 'deepseek' },
              { service: 'modelscope' },
              { service: 'map' },
            ],
          },
        }),
      })

      const results = await Promise.all([
        ApiKeyChecker.checkAvailability('deepseek'),
        ApiKeyChecker.checkAvailability('modelscope'),
        ApiKeyChecker.checkAvailability('map'),
      ])

      expect(results.every((r) => r.available)).toBe(true)
    })
  })
})
