/**
 * ApiKeyValidator 模块测试
 *
 * 测试范围：
 * - 各种 AI 服务 API Key 验证
 * - 地图服务 API Key 验证
 * - 语音服务 API Key 验证
 * - 通用测试函数
 * - 错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiKeyValidator } from '@/lib/api-keys/validator'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock global fetch
global.fetch = vi.fn()

describe('ApiKeyValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('testDeepSeekKey', () => {
    it('应该在 API 返回成功时返回 true', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
      })

      const result = await ApiKeyValidator.testDeepSeekKey('valid-key')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-key',
          },
        })
      )
    })

    it('应该在 API 返回错误时返回 false', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
      })

      const result = await ApiKeyValidator.testDeepSeekKey('invalid-key')

      expect(result).toBe(false)
    })

    it('应该在网络错误时返回 false', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await ApiKeyValidator.testDeepSeekKey('valid-key')

      expect(result).toBe(false)
    })

    it('应该发送正确的请求体', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      await ApiKeyValidator.testDeepSeekKey('test-key')

      const call = (global.fetch as any).mock.calls[0]
      const requestBody = JSON.parse(call[1].body)

      expect(requestBody).toEqual({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      })
    })
  })

  describe('testModelScopeKey', () => {
    it('应该在 API 返回成功时返回 true', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await ApiKeyValidator.testModelScopeKey('valid-key')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api-inference.modelscope.cn/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-key',
          },
        })
      )
    })

    it('应该在 API 返回错误时返回 false', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await ApiKeyValidator.testModelScopeKey('invalid-key')

      expect(result).toBe(false)
    })

    it('应该发送正确的 Qwen 模型参数', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      await ApiKeyValidator.testModelScopeKey('test-key')

      const call = (global.fetch as any).mock.calls[0]
      const requestBody = JSON.parse(call[1].body)

      expect(requestBody.model).toBe('Qwen/Qwen2.5-72B-Instruct')
      expect(requestBody.max_tokens).toBe(10)
    })
  })

  describe('testAnthropicKey', () => {
    it('应该在 API 返回成功时返回 true', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await ApiKeyValidator.testAnthropicKey('sk-ant-valid')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'sk-ant-valid',
            'anthropic-version': '2023-06-01',
          },
        })
      )
    })

    it('应该使用正确的 Claude 模型', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      await ApiKeyValidator.testAnthropicKey('test-key')

      const call = (global.fetch as any).mock.calls[0]
      const requestBody = JSON.parse(call[1].body)

      expect(requestBody.model).toBe('claude-3-5-haiku-20241022')
    })
  })

  describe('testMapKey', () => {
    it('应该在高德 API 返回 status=1 时返回 true', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: '1', province: '浙江省' }),
      })

      const result = await ApiKeyValidator.testMapKey('valid-map-key')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://restapi.amap.com/v3/ip?key=valid-map-key&ip=114.247.50.2',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('应该在高德 API 返回 status=0 时返回 false', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: '0', info: 'INVALID_USER_KEY' }),
      })

      const result = await ApiKeyValidator.testMapKey('invalid-map-key')

      expect(result).toBe(false)
    })

    it('应该在 HTTP 请求失败时返回 false', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await ApiKeyValidator.testMapKey('test-key')

      expect(result).toBe(false)
    })

    it('应该在网络错误时返回 false', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await ApiKeyValidator.testMapKey('test-key')

      expect(result).toBe(false)
    })
  })

  describe('testVoiceKey', () => {
    it('应该在 Key 格式有效时返回 true', async () => {
      const result = await ApiKeyValidator.testVoiceKey('valid-voice-key-123456')

      expect(result).toBe(true)
    })

    it('应该在 Key 为空时返回 false', async () => {
      const result = await ApiKeyValidator.testVoiceKey('')

      expect(result).toBe(false)
    })

    it('应该在 Key 长度不足 16 时返回 false', async () => {
      const result = await ApiKeyValidator.testVoiceKey('short-key')

      expect(result).toBe(false)
    })

    it('应该在 Key 长度等于 16 时返回 true', async () => {
      const result = await ApiKeyValidator.testVoiceKey('1234567890123456')

      expect(result).toBe(true)
    })

    it('应该在抛出异常时返回 false', async () => {
      // 模拟意外错误
      const result = await ApiKeyValidator.testVoiceKey(null as any)

      expect(result).toBe(false)
    })
  })

  describe('testKey', () => {
    it('应该为 deepseek 服务调用 testDeepSeekKey', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await ApiKeyValidator.testKey('deepseek', 'test-key')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/chat/completions',
        expect.anything()
      )
    })

    it('应该为 modelscope 服务调用 testModelScopeKey', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await ApiKeyValidator.testKey('modelscope', 'test-key')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api-inference.modelscope.cn/v1/chat/completions',
        expect.anything()
      )
    })

    it('应该为 anthropic 服务调用 testAnthropicKey', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const result = await ApiKeyValidator.testKey('anthropic', 'test-key')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.anything()
      )
    })

    it('应该为 map 服务调用 testMapKey', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: '1' }),
      })

      const result = await ApiKeyValidator.testKey('map', 'test-key')

      expect(result).toBe(true)
    })

    it('应该为 voice 服务调用 testVoiceKey', async () => {
      const result = await ApiKeyValidator.testKey('voice', 'valid-voice-key-123456')

      expect(result).toBe(true)
    })

    it('应该为未知服务返回 false', async () => {
      const result = await ApiKeyValidator.testKey('unknown-service', 'test-key')

      expect(result).toBe(false)
    })
  })

  describe('边界情况测试', () => {
    it('应该处理 fetch 返回非 JSON 响应的情况', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => '<html>Error</html>',
      })

      const result = await ApiKeyValidator.testDeepSeekKey('test-key')

      expect(result).toBe(false)
    })

    it('应该处理 fetch 超时的情况', async () => {
      ;(global.fetch as any).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      )

      const result = await ApiKeyValidator.testDeepSeekKey('test-key')

      expect(result).toBe(false)
    })

    it('应该处理空字符串 API Key', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: false })

      const result = await ApiKeyValidator.testDeepSeekKey('')

      expect(result).toBe(false)
    })

    it('应该处理特殊字符的 API Key', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const specialKey = 'key-with-special-chars-!@#$%^&*()'
      const result = await ApiKeyValidator.testDeepSeekKey(specialKey)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${specialKey}`,
          }),
        })
      )
    })

    it('应该处理 JSON 解析错误', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const result = await ApiKeyValidator.testMapKey('test-key')

      expect(result).toBe(false)
    })
  })

  describe('自定义验证逻辑测试', () => {
    it('testMapKey 应该使用自定义 validateResponse 函数', async () => {
      // 测试正常返回但 status 不是 "1"
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: '0', info: 'DAILY_QUERY_OVER_LIMIT' }),
      })

      const result = await ApiKeyValidator.testMapKey('test-key')

      expect(result).toBe(false)
    })

    it('testMapKey 应该在响应体为空时返回 false', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => null,
      })

      const result = await ApiKeyValidator.testMapKey('test-key')

      expect(result).toBe(false)
    })

    it('testMapKey 应该在响应体缺少 status 字段时返回 false', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ province: '浙江省' }),
      })

      const result = await ApiKeyValidator.testMapKey('test-key')

      expect(result).toBe(false)
    })
  })

  describe('并发测试', () => {
    it('应该能同时测试多个 API Key', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true })

      const results = await Promise.all([
        ApiKeyValidator.testDeepSeekKey('key1'),
        ApiKeyValidator.testDeepSeekKey('key2'),
        ApiKeyValidator.testDeepSeekKey('key3'),
      ])

      expect(results).toEqual([true, true, true])
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('应该能同时测试不同服务的 API Key', async () => {
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('deepseek')) {
          return Promise.resolve({ ok: true })
        } else if (url.includes('modelscope')) {
          return Promise.resolve({ ok: true })
        } else if (url.includes('amap')) {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ status: '1' }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const results = await Promise.all([
        ApiKeyValidator.testDeepSeekKey('key1'),
        ApiKeyValidator.testModelScopeKey('key2'),
        ApiKeyValidator.testMapKey('key3'),
      ])

      expect(results).toEqual([true, true, true])
    })
  })
})
