/**
 * ApiKeyClient 模块测试
 *
 * 测试范围：
 * - 获取用户 API Key
 * - 获取用户完整配置
 * - 获取系统默认 Key
 * - 回退逻辑
 * - 错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiKeyClient } from '@/lib/api-keys/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  default: {
    deepseek: {
      apiKey: 'system-deepseek-key',
      baseURL: 'https://api.deepseek.com',
    },
    modelscope: {
      apiKey: 'system-modelscope-key',
      baseURL: 'https://api-inference.modelscope.cn/v1',
    },
    map: {
      webServiceKey: 'system-map-key',
    },
    voice: {
      apiKey: 'system-voice-key',
    },
  },
}))

// Mock encryption
vi.mock('@/lib/encryption', () => ({
  decrypt: vi.fn((encryptedKey: string) => {
    if (encryptedKey === 'invalid-encrypted') {
      throw new Error('解密失败')
    }
    return `decrypted-${encryptedKey}`
  }),
}))

describe('ApiKeyClient', () => {
  let mockSupabase: any

  beforeEach(() => {
    // 创建 mock Supabase 客户端
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      limit: vi.fn(() => mockSupabase),
      maybeSingle: vi.fn(),
    }

    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserKey', () => {
    it('应该成功获取并解密用户 API Key', async () => {
      // 设置 mock 返回
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { encrypted_key: 'encrypted-user-key' },
        error: null,
      })

      const result = await ApiKeyClient.getUserKey('user-123', 'deepseek', mockSupabase)

      expect(result).toBe('decrypted-encrypted-user-key')
      expect(mockSupabase.from).toHaveBeenCalledWith('api_keys')
      expect(mockSupabase.select).toHaveBeenCalledWith('encrypted_key')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('service', 'deepseek')
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('应该在没有找到 API Key 时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getUserKey('user-123', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })

    it('应该在数据库查询出错时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      })

      const result = await ApiKeyClient.getUserKey('user-123', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })

    it('应该在解密失败时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { encrypted_key: 'invalid-encrypted' },
        error: null,
      })

      const result = await ApiKeyClient.getUserKey('user-123', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })
  })

  describe('getUserConfig', () => {
    it('应该成功获取用户完整配置', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          encrypted_key: 'encrypted-user-key',
          base_url: 'https://custom.api.com',
          extra_config: '{"model":"custom-model"}',
        },
        error: null,
      })

      const result = await ApiKeyClient.getUserConfig('user-123', 'deepseek', mockSupabase)

      expect(result).toEqual({
        apiKey: 'decrypted-encrypted-user-key',
        baseUrl: 'https://custom.api.com',
        extraConfig: { model: 'custom-model' },
      })
    })

    it('应该处理没有 base_url 的情况', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          encrypted_key: 'encrypted-user-key',
          base_url: null,
          extra_config: null,
        },
        error: null,
      })

      const result = await ApiKeyClient.getUserConfig('user-123', 'deepseek', mockSupabase)

      expect(result).toEqual({
        apiKey: 'decrypted-encrypted-user-key',
        baseUrl: undefined,
        extraConfig: null,
      })
    })

    it('应该处理 extra_config 解析失败的情况', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          encrypted_key: 'encrypted-user-key',
          base_url: null,
          extra_config: 'invalid-json',
        },
        error: null,
      })

      const result = await ApiKeyClient.getUserConfig('user-123', 'deepseek', mockSupabase)

      expect(result).toEqual({
        apiKey: 'decrypted-encrypted-user-key',
        baseUrl: undefined,
        extraConfig: null,
      })
    })

    it('应该在解密失败时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          encrypted_key: 'invalid-encrypted',
          base_url: null,
          extra_config: null,
        },
        error: null,
      })

      const result = await ApiKeyClient.getUserConfig('user-123', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })

    it('应该在查询失败时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: new Error('Query failed'),
      })

      const result = await ApiKeyClient.getUserConfig('user-123', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })

    it('应该在未找到数据时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getUserConfig('user-123', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })
  })

  describe('getSystemKey', () => {
    it('应该返回 DeepSeek 系统 Key', () => {
      const result = ApiKeyClient.getSystemKey('deepseek')
      expect(result).toBe('system-deepseek-key')
    })

    it('应该返回 ModelScope 系统 Key', () => {
      const result = ApiKeyClient.getSystemKey('modelscope')
      expect(result).toBe('system-modelscope-key')
    })

    it('应该返回地图系统 Key', () => {
      const result = ApiKeyClient.getSystemKey('map')
      expect(result).toBe('system-map-key')
    })

    it('应该返回语音系统 Key', () => {
      const result = ApiKeyClient.getSystemKey('voice')
      expect(result).toBe('system-voice-key')
    })

    it('应该对未知服务返回 null', () => {
      const result = ApiKeyClient.getSystemKey('unknown' as any)
      expect(result).toBeNull()
    })
  })

  describe('getKeyWithFallback', () => {
    it('应该优先返回用户 Key', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { encrypted_key: 'user-key' },
        error: null,
      })

      const result = await ApiKeyClient.getKeyWithFallback(
        'user-123',
        'deepseek',
        mockSupabase
      )

      expect(result).toBe('decrypted-user-key')
    })

    it('应该在没有用户 Key 时回退到系统 Key', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getKeyWithFallback(
        'user-123',
        'deepseek',
        mockSupabase
      )

      expect(result).toBe('system-deepseek-key')
    })

    it('应该在都没有时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      // 测试一个没有系统 Key 的服务
      const result = await ApiKeyClient.getKeyWithFallback(
        'user-123',
        'unknown' as any,
        mockSupabase
      )

      expect(result).toBeNull()
    })
  })

  describe('getConfigWithFallback', () => {
    it('应该优先返回用户配置', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          encrypted_key: 'user-key',
          base_url: 'https://custom.api.com',
          extra_config: null,
        },
        error: null,
      })

      const result = await ApiKeyClient.getConfigWithFallback(
        'user-123',
        'deepseek',
        mockSupabase
      )

      expect(result).toEqual({
        apiKey: 'decrypted-user-key',
        baseUrl: 'https://custom.api.com',
        extraConfig: null,
      })
    })

    it('应该在没有用户配置时回退到系统配置', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getConfigWithFallback(
        'user-123',
        'deepseek',
        mockSupabase
      )

      expect(result).toEqual({
        apiKey: 'system-deepseek-key',
        baseUrl: 'https://api.deepseek.com',
        extraConfig: null,
      })
    })

    it('应该为 ModelScope 返回正确的系统配置', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getConfigWithFallback(
        'user-123',
        'modelscope',
        mockSupabase
      )

      expect(result).toEqual({
        apiKey: 'system-modelscope-key',
        baseUrl: 'https://api-inference.modelscope.cn/v1',
        extraConfig: null,
      })
    })

    it('应该为地图服务返回正确的配置（无 baseUrl）', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getConfigWithFallback(
        'user-123',
        'map',
        mockSupabase
      )

      expect(result).toEqual({
        apiKey: 'system-map-key',
        baseUrl: undefined,
        extraConfig: null,
      })
    })

    it('应该在都没有时返回 null', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getConfigWithFallback(
        'user-123',
        'unknown' as any,
        mockSupabase
      )

      expect(result).toBeNull()
    })
  })

  describe('边界情况测试', () => {
    it('应该处理 Supabase 客户端抛出异常的情况', async () => {
      mockSupabase.maybeSingle.mockRejectedValue(new Error('Network error'))

      const result = await ApiKeyClient.getUserKey('user-123', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })

    it('应该处理空字符串用户 ID', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await ApiKeyClient.getUserKey('', 'deepseek', mockSupabase)

      expect(result).toBeNull()
    })

    it('应该正确处理所有支持的服务类型', async () => {
      const services: Array<'deepseek' | 'modelscope' | 'map' | 'voice'> = [
        'deepseek',
        'modelscope',
        'map',
        'voice',
      ]

      for (const service of services) {
        const result = ApiKeyClient.getSystemKey(service)
        expect(result).toBeTruthy()
        expect(typeof result).toBe('string')
      }
    })
  })
})
