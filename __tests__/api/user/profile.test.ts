/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/user/profile/route'
import { mockUser, mockProfile } from '@/__tests__/mocks/supabase'

// Mock 依赖
const mockRequireAuth = vi.fn()

vi.mock('@/app/api/_middleware', () => ({
  requireAuth: (req: any) => mockRequireAuth(req),
}))

vi.mock('@/app/api/_middleware/error-handler', () => ({
  handleApiError: vi.fn().mockImplementation((error: Error) => {
    const status = error.message.includes('未提供认证令牌') ? 401 : 500

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
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('用户配置 API 测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认认证成功
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      },
      token: 'mock-token',
    })
  })

  // ==================== GET /api/user/profile ====================

  describe('GET /api/user/profile - 获取用户配置', () => {
    it('应该成功获取已存在的 profile', async () => {
      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.profile).toEqual(mockProfile)
      expect(data.data.profile.email).toBe(mockUser.email)
    })

    it('应该在 profile 不存在时自动创建', async () => {
      const newProfile = {
        id: mockUser.id,
        email: mockUser.email,
        name: 'Test User',
        avatar_url: null,
        theme: 'system',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      // Mock profile 不存在
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }, // PostgreSQL 行不存在错误码
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newProfile,
                  error: null,
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.profile).toEqual(newProfile)
      expect(data.data.profile.theme).toBe('system')
    })

    it('应该在创建 profile 失败时返回错误', async () => {
      // Mock profile 不存在且创建失败
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Insert failed'),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // ==================== PUT /api/user/profile ====================

  describe('PUT /api/user/profile - 更新用户配置', () => {
    it('应该成功更新 profile', async () => {
      const updateData = {
        name: '新用户名',
        theme: 'dark' as const,
        default_budget: 10000,
        default_origin: '上海',
      }

      const updatedProfile = {
        ...mockProfile,
        ...updateData,
        updated_at: new Date().toISOString(),
      }

      // Mock 更新操作
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedProfile,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.profile.name).toBe('新用户名')
      expect(data.data.profile.theme).toBe('dark')
      expect(data.data.profile.default_budget).toBe(10000)
      expect(data.message).toBe('配置更新成功')
    })

    it('应该支持部分字段更新', async () => {
      const updateData = {
        name: '只更新名字',
      }

      const updatedProfile = {
        ...mockProfile,
        name: '只更新名字',
        updated_at: new Date().toISOString(),
      }

      // Mock 更新操作
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedProfile,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.profile.name).toBe('只更新名字')
      // 其他字段应该保持不变
      expect(data.data.profile.theme).toBe(mockProfile.theme)
    })

    it('应该在更新失败时返回错误', async () => {
      const updateData = {
        name: '新用户名',
      }

      // Mock 更新失败
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Update failed'),
                  }),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
