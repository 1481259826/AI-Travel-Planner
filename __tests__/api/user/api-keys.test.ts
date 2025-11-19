/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/user/api-keys/route'
import { PUT, DELETE } from '@/app/api/user/api-keys/[id]/route'
import { mockUser, mockApiKey } from '@/__tests__/mocks/supabase'

// Mock 依赖
const mockRequireAuth = vi.fn()
const mockEncrypt = vi.fn()
const mockGetKeyPrefix = vi.fn()

vi.mock('@/app/api/_middleware/auth', () => ({
  requireAuth: (req: any) => mockRequireAuth(req),
}))

vi.mock('@/app/api/_middleware/error-handler', () => ({
  handleApiError: vi.fn().mockImplementation((error: any) => {
    // 处理 Zod 验证错误
    if (error.name === 'ZodError' && error.issues) {
      return Response.json({
        success: false,
        error: error.issues[0].message,
      }, { status: 400 })
    }

    const status = error.message?.includes('不存在')
      ? 404
      : error.message?.includes('必填字段') || error.message?.includes('无效') || error.message?.includes('必须')
      ? 400
      : error.message?.includes('未提供认证令牌')
      ? 401
      : 500

    return Response.json({
      success: false,
      error: error.message,
    }, { status })
  }),
}))

vi.mock('@/app/api/_utils/response', () => ({
  successResponse: vi.fn().mockImplementation((data: any, message?: string) => {
    return Response.json({ success: true, data, message }, { status: 200 })
  }),
  noContentResponse: vi.fn().mockImplementation(() => {
    return new Response(null, { status: 204 })
  }),
}))

vi.mock('@/lib/encryption', () => ({
  encrypt: (key: string) => mockEncrypt(key),
  getKeyPrefix: (key: string, length: number) => mockGetKeyPrefix(key, length),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('用户 API Keys 管理测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认加密函数
    mockEncrypt.mockReturnValue('encrypted-key-12345')
    mockGetKeyPrefix.mockReturnValue('sk-12345')

    // 默认认证成功
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [mockApiKey],
                error: null,
              }),
            }),
          }),
        }),
      },
      token: 'mock-token',
    })
  })

  // ==================== GET /api/user/api-keys ====================

  describe('GET /api/user/api-keys - 获取 API Keys 列表', () => {
    it('应该成功获取 API Keys 列表', async () => {
      const request = new NextRequest('http://localhost/api/user/api-keys', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.apiKeys).toHaveLength(1)
      expect(data.data.apiKeys[0].service).toBe('deepseek')
    })

    it('应该返回空数组当没有 API Keys', async () => {
      // Mock 空列表
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/api-keys', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.apiKeys).toHaveLength(0)
    })
  })

  // ==================== POST /api/user/api-keys ====================

  describe('POST /api/user/api-keys - 创建 API Key', () => {
    it('应该成功创建 API Key', async () => {
      const newKeyData = {
        service: 'deepseek',
        key_name: 'My DeepSeek Key',
        api_key: 'sk-test1234567890',
        base_url: 'https://api.deepseek.com',
        extra_config: '{"model":"deepseek-chat"}',
      }

      const createdKey = {
        id: 'api-key-123',
        user_id: mockUser.id,
        service: newKeyData.service,
        key_name: newKeyData.key_name,
        encrypted_key: 'encrypted-key-12345',
        key_prefix: 'sk-12345',
        base_url: newKeyData.base_url,
        extra_config: newKeyData.extra_config,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      // Mock 插入操作
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createdKey,
                  error: null,
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.apiKey.service).toBe('deepseek')
      expect(data.data.apiKey.key_name).toBe('My DeepSeek Key')
      expect(data.message).toBe('API Key 添加成功')
      expect(mockEncrypt).toHaveBeenCalledWith('sk-test1234567890')
      expect(mockGetKeyPrefix).toHaveBeenCalledWith('sk-test1234567890', 8)
    })

    it('应该在缺少必填字段时返回 400', async () => {
      const invalidData = {
        service: 'deepseek',
        // 缺少 key_name 和 api_key
      }

      const request = new NextRequest('http://localhost/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('必填字段')
    })

    it('应该在服务类型无效时返回 400', async () => {
      const invalidData = {
        service: 'invalid-service',
        key_name: 'Test Key',
        api_key: 'sk-test1234567890',
      }

      const request = new NextRequest('http://localhost/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('无效的服务类型')
    })

    it('应该在 extra_config 格式无效时返回 400', async () => {
      const invalidData = {
        service: 'deepseek',
        key_name: 'Test Key',
        api_key: 'sk-test1234567890',
        extra_config: 'invalid-json', // 无效的 JSON
      }

      const request = new NextRequest('http://localhost/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('JSON')
    })
  })

  // ==================== PUT /api/user/api-keys/[id] ====================

  describe('PUT /api/user/api-keys/[id] - 更新 API Key', () => {
    const mockParams = Promise.resolve({ id: 'api-key-123' })

    it('应该成功更新 API Key 状态', async () => {
      const updateData = {
        is_active: false,
      }

      const updatedKey = {
        ...mockApiKey,
        is_active: false,
      }

      // Mock 更新操作
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: updatedKey,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/api-keys/api-key-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.apiKey.is_active).toBe(false)
      expect(data.message).toBe('更新成功')
    })

    it('应该在 is_active 不是布尔值时返回 400', async () => {
      const invalidData = {
        is_active: 'not-a-boolean',
      }

      const request = new NextRequest('http://localhost/api/user/api-keys/api-key-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('布尔值')
    })

    it('应该在 API Key 不存在时返回 404', async () => {
      const updateData = {
        is_active: false,
      }

      // Mock 更新失败（Key 不存在）
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/api-keys/api-key-999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request, {
        params: Promise.resolve({ id: 'api-key-999' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('API Key 不存在')
    })
  })

  // ==================== DELETE /api/user/api-keys/[id] ====================

  describe('DELETE /api/user/api-keys/[id] - 删除 API Key', () => {
    const mockParams = Promise.resolve({ id: 'api-key-123' })

    it('应该成功删除 API Key', async () => {
      // Mock 删除操作
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/api-keys/api-key-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(204)
    })

    it('应该在删除失败时返回错误', async () => {
      // Mock 删除失败
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: new Error('Delete failed'),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/api-keys/api-key-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
