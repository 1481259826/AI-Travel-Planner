/**
 * Supabase 客户端模块测试
 *
 * 测试覆盖：
 * - 默认客户端实例创建
 * - 客户端工厂函数
 * - 服务端客户端创建（带 token）
 * - 管理员客户端创建
 * - 错误处理和边界情况
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Mock Supabase 客户端
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: vi.fn(),
  })),
}))

// Mock config 模块 - 使用 factory 函数让它可以被修改
const mockConfig = {
  supabase: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
    serviceRoleKey: 'test-service-role-key',
  },
}

vi.mock('@/lib/config', () => ({
  appConfig: mockConfig,
}))

describe('database/client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置 mock config 到默认值
    mockConfig.supabase.url = 'https://test.supabase.co'
    mockConfig.supabase.anonKey = 'test-anon-key'
    mockConfig.supabase.serviceRoleKey = 'test-service-role-key'
  })

  describe('supabase 默认客户端', () => {
    it('应该使用配置的环境变量创建默认客户端', async () => {
      // 重新导入模块以触发客户端创建
      await import('@/lib/database/client')

      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      )
    })

    it('应该在环境变量未配置时使用占位符', async () => {
      // 临时修改 mock
      mockConfig.supabase.url = ''
      mockConfig.supabase.anonKey = ''
      mockConfig.supabase.serviceRoleKey = ''

      // 重新导入
      vi.resetModules()
      await import('@/lib/database/client')

      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://placeholder.supabase.co',
        'placeholder-anon-key'
      )
    })
  })

  describe('createClient', () => {
    it('应该创建新的客户端实例', async () => {
      const { createClient } = await import('@/lib/database/client')

      const client = createClient()

      expect(client).toBeDefined()
      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      )
    })

    it('应该每次调用都创建新实例', async () => {
      const { createClient } = await import('@/lib/database/client')

      const client1 = createClient()
      const client2 = createClient()

      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
      // 验证调用次数增加
      expect(createSupabaseClient).toHaveBeenCalled()
    })

    it('应该在环境变量缺失时使用占位符', async () => {
      mockConfig.supabase.url = undefined as any
      mockConfig.supabase.anonKey = undefined as any
      mockConfig.supabase.serviceRoleKey = undefined as any

      vi.resetModules()
      const { createClient } = await import('@/lib/database/client')

      createClient()

      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://placeholder.supabase.co',
        'placeholder-anon-key'
      )
    })
  })

  describe('createServerSupabaseClient', () => {
    it('应该创建带认证 token 的服务端客户端', async () => {
      const { createServerSupabaseClient } = await import('@/lib/database/client')

      const token = 'test-user-token'
      const client = createServerSupabaseClient(token)

      expect(client).toBeDefined()
      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      )
    })

    it('应该支持不同的 token', async () => {
      const { createServerSupabaseClient } = await import('@/lib/database/client')

      const token1 = 'token-user-1'
      const token2 = 'token-user-2'

      createServerSupabaseClient(token1)
      createServerSupabaseClient(token2)

      expect(createSupabaseClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        {
          global: {
            headers: {
              Authorization: `Bearer ${token1}`,
            },
          },
        }
      )

      expect(createSupabaseClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        {
          global: {
            headers: {
              Authorization: `Bearer ${token2}`,
            },
          },
        }
      )
    })

    it('应该处理空 token', async () => {
      const { createServerSupabaseClient } = await import('@/lib/database/client')

      const client = createServerSupabaseClient('')

      expect(client).toBeDefined()
      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        {
          global: {
            headers: {
              Authorization: 'Bearer ',
            },
          },
        }
      )
    })
  })

  describe('createAdminClient', () => {
    it('应该使用 Service Role Key 创建管理员客户端', async () => {
      vi.resetModules()
      const { createAdminClient } = await import('@/lib/database/client')

      const client = createAdminClient()

      expect(client).toBeDefined()
      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-role-key'
      )
    })

    it('应该在 Service Role Key 未配置时抛出错误', async () => {
      mockConfig.supabase.serviceRoleKey = ''

      vi.resetModules()
      const { createAdminClient } = await import('@/lib/database/client')

      expect(() => createAdminClient()).toThrow(
        'Service Role Key 未配置，无法创建管理员客户端'
      )
    })

    it('应该在 Service Role Key 为 undefined 时抛出错误', async () => {
      mockConfig.supabase.serviceRoleKey = undefined as any

      vi.resetModules()
      const { createAdminClient } = await import('@/lib/database/client')

      expect(() => createAdminClient()).toThrow()
    })
  })

  describe('客户端配置', () => {
    it('应该正确处理完整的配置', async () => {
      mockConfig.supabase.url = 'https://production.supabase.co'
      mockConfig.supabase.anonKey = 'production-anon-key'
      mockConfig.supabase.serviceRoleKey = 'production-service-role-key'

      vi.resetModules()
      const { createClient } = await import('@/lib/database/client')

      createClient()

      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://production.supabase.co',
        'production-anon-key'
      )
    })

    it('应该正确处理部分缺失的配置', async () => {
      mockConfig.supabase.url = 'https://test.supabase.co'
      mockConfig.supabase.anonKey = ''
      mockConfig.supabase.serviceRoleKey = ''

      vi.resetModules()
      const { createClient } = await import('@/lib/database/client')

      createClient()

      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'placeholder-anon-key'
      )
    })
  })

  describe('类型安全', () => {
    it('createClient 应该返回 SupabaseClient 类型', async () => {
      const { createClient } = await import('@/lib/database/client')

      const client = createClient()

      // 验证返回的客户端具有预期的方法
      expect(client).toHaveProperty('from')
      expect(client).toHaveProperty('auth')
    })

    it('createServerSupabaseClient 应该返回 SupabaseClient 类型', async () => {
      const { createServerSupabaseClient } = await import('@/lib/database/client')

      const client = createServerSupabaseClient('token')

      expect(client).toHaveProperty('from')
      expect(client).toHaveProperty('auth')
    })

    it('createAdminClient 应该返回 SupabaseClient 类型', async () => {
      vi.resetModules()
      const { createAdminClient } = await import('@/lib/database/client')

      const client = createAdminClient()

      expect(client).toHaveProperty('from')
      expect(client).toHaveProperty('auth')
    })
  })
})
