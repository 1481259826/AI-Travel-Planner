/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/user/password/route'
import { mockUser } from '@/__tests__/mocks/supabase'

// Mock 依赖
const mockRequireAuth = vi.fn()
const mockCreateServiceClient = vi.fn()
const mockIsPasswordValid = vi.fn()

vi.mock('@/app/api/_middleware/auth', () => ({
  requireAuth: (req: any) => mockRequireAuth(req),
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/app/api/_middleware/error-handler', () => ({
  handleApiError: vi.fn().mockImplementation((error: any) => {
    // 处理 Zod 验证错误
    if (error.name === 'ZodError' && error.issues) {
      return Response.json({
        success: false,
        error: error.issues[0].message, // 返回第一个错误消息
      }, { status: 400 })
    }

    const status = error.message?.includes('不正确') || error.message?.includes('不一致') || error.message?.includes('强度不足')
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
}))

vi.mock('@/lib/utils/password', () => ({
  isPasswordValid: (password: string) => mockIsPasswordValid(password),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('用户密码管理 API 测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认密码验证通过
    mockIsPasswordValid.mockReturnValue(true)

    // 默认认证成功
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            error: null,
          }),
        },
      },
      token: 'mock-token',
    })

    // 默认 admin client
    mockCreateServiceClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            error: null,
          }),
        },
      },
    })
  })

  // ==================== POST /api/user/password ====================

  describe('POST /api/user/password - 修改密码', () => {
    it('应该成功修改密码', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }

      const request = new NextRequest('http://localhost/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('密码修改成功')
      expect(mockIsPasswordValid).toHaveBeenCalledWith('NewPass123!')
    })

    it('应该在当前密码错误时返回 400', async () => {
      const passwordData = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }

      // Mock 当前密码验证失败
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          auth: {
            signInWithPassword: vi.fn().mockResolvedValue({
              error: new Error('Invalid credentials'),
            }),
          },
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('当前密码不正确')
    })

    it('应该在新密码和确认密码不一致时返回 400', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass123!',
      }

      const request = new NextRequest('http://localhost/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('两次输入的密码不一致')
    })

    it('应该在新密码强度不足时返回 400', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'Weakpass1', // 符合格式但被 isPasswordValid 判定为弱密码
        confirmPassword: 'Weakpass1',
      }

      // Mock 密码强度验证失败
      mockIsPasswordValid.mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('密码强度不足，请满足所有要求')
    })

    it('应该在数据验证失败时返回 400', async () => {
      const invalidData = {
        currentPassword: 'OldPass123!',
        newPassword: 'short', // 太短
        confirmPassword: 'short',
      }

      const request = new NextRequest('http://localhost/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('应该在更新密码失败时返回错误', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }

      // Mock admin updateUserById 失败
      mockCreateServiceClient.mockReturnValue({
        auth: {
          admin: {
            updateUserById: vi.fn().mockResolvedValue({
              error: new Error('Update failed'),
            }),
          },
        },
      })

      const request = new NextRequest('http://localhost/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
