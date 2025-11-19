/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getExpenses, POST as createExpense } from '@/app/api/expenses/route'
import { PUT as updateExpense, DELETE as deleteExpense } from '@/app/api/expenses/[id]/route'
import { mockUser, createMockSupabaseClient } from '@/__tests__/mocks/supabase'

// Mock 依赖
const mockRequireAuth = vi.fn()

vi.mock('@/app/api/_middleware', () => ({
  requireAuth: (req: any) => mockRequireAuth(req),
}))

vi.mock('@/app/api/_middleware/error-handler', () => ({
  handleApiError: vi.fn().mockImplementation((error: Error) => {
    const status = error.message.includes('不存在') || error.message.includes('缺少')
      ? error.message.includes('缺少') ? 400 : 404
      : error.message.includes('无权')
      ? 403
      : error.message.includes('未提供认证令牌')
      ? 401
      : 400

    return Response.json({
      success: false,
      error: error.message.includes('ValidationError') ? 'ValidationError' : error.message
    }, { status })
  }),
}))

vi.mock('@/app/api/_utils/response', () => ({
  successResponse: vi.fn().mockImplementation((data: any, message?: string) => {
    return Response.json({ success: true, data, message }, { status: 200 })
  }),
  createdResponse: vi.fn().mockImplementation((data: any, message?: string) => {
    return Response.json({ success: true, data, message }, { status: 201 })
  }),
  noContentResponse: vi.fn().mockImplementation(() => {
    return new Response(null, { status: 204 })
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

describe('费用管理 API 测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认认证成功
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: createMockSupabaseClient(),
      token: 'mock-token',
    })
  })

  // ==================== GET /api/expenses ====================

  describe('GET /api/expenses - 获取费用列表', () => {
    it('应该成功获取费用列表', async () => {
      const mockExpenses = [
        {
          id: 'expense-1',
          trip_id: 'trip-123',
          category: 'food',
          amount: 150,
          currency: 'CNY',
          description: '午餐',
          date: '2025-01-20',
        },
        {
          id: 'expense-2',
          trip_id: 'trip-123',
          category: 'transportation',
          amount: 80,
          currency: 'CNY',
          description: '出租车',
          date: '2025-01-19',
        },
      ]

      // Mock supabase 返回行程所有权验证成功和费用列表
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'trips') {
              // 行程所有权验证
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'trip-123' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }
            } else if (table === 'expenses') {
              // 费用列表查询
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: mockExpenses,
                      error: null,
                    }),
                  }),
                }),
              }
            }
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses?trip_id=trip-123')
      const response = await getExpenses(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.expenses).toHaveLength(2)
      expect(data.data.expenses[0].category).toBe('food')
    })

    it('应该在缺少 trip_id 参数时返回 400', async () => {
      const request = new NextRequest('http://localhost/api/expenses')
      const response = await getExpenses(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('缺少 trip_id 参数')
    })

    it('应该在行程不存在时返回 404', async () => {
      // Mock 行程不存在
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                  }),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses?trip_id=trip-999')
      const response = await getExpenses(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('行程不存在或无权访问')
    })
  })

  // ==================== POST /api/expenses ====================

  describe('POST /api/expenses - 创建费用记录', () => {
    it('应该成功创建费用记录', async () => {
      const tripId = '550e8400-e29b-41d4-a716-446655440000' // 有效的 UUID 格式
      const newExpense = {
        tripId,
        category: 'food' as const,
        amount: 200,
        currency: 'CNY',
        description: '晚餐',
        date: '2025-01-20',
      }

      const createdExpense = {
        id: 'expense-123',
        trip_id: tripId,
        ...newExpense,
      }

      // Mock supabase
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'trips') {
              // 行程所有权验证
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: tripId },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }
            } else if (table === 'expenses') {
              // 费用创建
              return {
                insert: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: createdExpense,
                      error: null,
                    }),
                  }),
                }),
              }
            }
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      })

      const response = await createExpense(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.category).toBe('food')
      expect(data.data.amount).toBe(200)
    })

    it('应该在验证失败时返回 400', async () => {
      const invalidExpense = {
        tripId: 'trip-123',
        category: 'invalid-category',
        amount: -100, // 负数金额
      }

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidExpense),
      })

      const response = await createExpense(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('应该在行程不存在时返回 404', async () => {
      const tripId = '550e8400-e29b-41d4-a716-446655441111' // 有效的 UUID 格式
      const newExpense = {
        tripId,
        category: 'food' as const,
        amount: 200,
        currency: 'CNY',
      }

      // Mock 行程不存在
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                  }),
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      })

      const response = await createExpense(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })
  })

  // ==================== PUT /api/expenses/[id] ====================

  describe('PUT /api/expenses/[id] - 更新费用记录', () => {
    const mockParams = Promise.resolve({ id: 'expense-123' })

    it('应该成功更新费用记录', async () => {
      const updateData = {
        amount: 250,
        description: '更新后的描述',
      }

      const updatedExpense = {
        id: 'expense-123',
        trip_id: 'trip-123',
        category: 'food',
        amount: 250,
        currency: 'CNY',
        description: '更新后的描述',
        date: '2025-01-20',
      }

      // Mock supabase
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'expenses') {
              // 第一次调用：费用记录查询（所有权验证）
              const selectCalled = { count: 0 }
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { trip_id: 'trip-123' },
                      error: null,
                    }),
                  }),
                }),
                update: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: updatedExpense,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }
            } else if (table === 'trips') {
              // 行程所有权验证
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'trip-123' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }
            }
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses/expense-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await updateExpense(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe(250)
      expect(data.data.description).toBe('更新后的描述')
    })

    it('应该在费用记录不存在时返回 404', async () => {
      // Mock 费用记录不存在
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses/expense-999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      })

      const response = await updateExpense(request, {
        params: Promise.resolve({ id: 'expense-999' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('费用记录不存在')
    })

    it('应该在无权操作时返回 403', async () => {
      // Mock 费用记录存在但行程不属于当前用户
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'expenses') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { trip_id: 'trip-123' },
                      error: null,
                    }),
                  }),
                }),
              }
            } else if (table === 'trips') {
              // 行程不属于当前用户
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Not found' },
                      }),
                    }),
                  }),
                }),
              }
            }
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses/expense-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      })

      const response = await updateExpense(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('无权操作此费用记录')
    })
  })

  // ==================== DELETE /api/expenses/[id] ====================

  describe('DELETE /api/expenses/[id] - 删除费用记录', () => {
    const mockParams = Promise.resolve({ id: 'expense-123' })

    it('应该成功删除费用记录', async () => {
      // Mock supabase
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'expenses') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { trip_id: 'trip-123' },
                      error: null,
                    }),
                  }),
                }),
                delete: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    error: null,
                  }),
                }),
              }
            } else if (table === 'trips') {
              // 行程所有权验证
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'trip-123' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }
            }
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses/expense-123', {
        method: 'DELETE',
      })

      const response = await deleteExpense(request, { params: mockParams })

      expect(response.status).toBe(204)
    })

    it('应该在费用记录不存在时返回 404', async () => {
      // Mock 费用记录不存在
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses/expense-999', {
        method: 'DELETE',
      })

      const response = await deleteExpense(request, {
        params: Promise.resolve({ id: 'expense-999' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('费用记录不存在')
    })

    it('应该在无权操作时返回 403', async () => {
      // Mock 费用记录存在但行程不属于当前用户
      mockRequireAuth.mockResolvedValue({
        user: mockUser,
        supabase: {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'expenses') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { trip_id: 'trip-123' },
                      error: null,
                    }),
                  }),
                }),
              }
            } else if (table === 'trips') {
              // 行程不属于当前用户
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Not found' },
                      }),
                    }),
                  }),
                }),
              }
            }
          }),
        },
        token: 'mock-token',
      })

      const request = new NextRequest('http://localhost/api/expenses/expense-123', {
        method: 'DELETE',
      })

      const response = await deleteExpense(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('无权操作此费用记录')
    })
  })
})
