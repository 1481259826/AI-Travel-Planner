/**
 * Supabase Mock
 * 用于 API 路由测试
 */

import { vi } from 'vitest'

// Mock 用户数据
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

// Mock Profile 数据
export const mockProfile = {
  id: mockUser.id,
  email: mockUser.email,
  name: 'Test User',
  theme: 'light',
  default_model: 'claude-haiku-4-5',
  default_budget: 5000,
  default_origin: '北京',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

// Mock Trip 数据
export const mockTrip = {
  id: 'test-trip-id',
  user_id: mockUser.id,
  destination: '上海',
  start_date: '2025-02-01',
  end_date: '2025-02-03',
  budget: 3000,
  travelers: 2,
  adult_count: 2,
  child_count: 0,
  preferences: '喜欢历史文化和美食',
  itinerary: {
    destination: '上海',
    startDate: '2025-02-01',
    endDate: '2025-02-03',
    totalDays: 3,
    days: [],
  },
  status: 'planned',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

// Mock Expense 数据
export const mockExpense = {
  id: 'test-expense-id',
  trip_id: mockTrip.id,
  user_id: mockUser.id,
  category: 'food',
  amount: 150,
  currency: 'CNY',
  description: '午餐',
  date: '2025-02-01',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

// Mock API Key 数据
export const mockApiKey = {
  id: 'test-api-key-id',
  user_id: mockUser.id,
  service: 'deepseek',
  encrypted_key: 'encrypted-test-key',
  base_url: 'https://api.deepseek.com',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

/**
 * 创建 Mock Supabase 客户端
 */
export function createMockSupabaseClient(options: {
  profileExists?: boolean
  profileInsertSuccess?: boolean
  tripInsertSuccess?: boolean
  expenseInsertSuccess?: boolean
  apiKeys?: any[]
} = {}) {
  const {
    profileExists = true,
    profileInsertSuccess = true,
    tripInsertSuccess = true,
    expenseInsertSuccess = true,
    apiKeys = [],
  } = options

  // Mock auth
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
  }

  // Mock from() query builder
  const createQueryBuilder = (table: string) => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
    }

    // 根据表名配置不同的返回值
    switch (table) {
      case 'profiles':
        queryBuilder.single.mockResolvedValue({
          data: profileExists ? mockProfile : null,
          error: null,
        })
        queryBuilder.insert.mockReturnValue({
          ...queryBuilder,
          single: vi.fn().mockResolvedValue({
            data: profileInsertSuccess ? mockProfile : null,
            error: profileInsertSuccess ? null : new Error('Insert failed'),
          }),
        })
        break

      case 'trips':
        queryBuilder.single.mockResolvedValue({
          data: mockTrip,
          error: null,
        })
        queryBuilder.insert.mockReturnValue({
          ...queryBuilder,
          select: vi.fn().mockReturnValue({
            ...queryBuilder,
            single: vi.fn().mockResolvedValue({
              data: tripInsertSuccess ? mockTrip : null,
              error: tripInsertSuccess ? null : new Error('Insert failed'),
            }),
          }),
        })
        break

      case 'expenses':
        queryBuilder.single.mockResolvedValue({
          data: mockExpense,
          error: null,
        })
        queryBuilder.insert.mockReturnValue({
          ...queryBuilder,
          select: vi.fn().mockReturnValue({
            ...queryBuilder,
            single: vi.fn().mockResolvedValue({
              data: expenseInsertSuccess ? mockExpense : null,
              error: expenseInsertSuccess ? null : new Error('Insert failed'),
            }),
          }),
        })
        break

      case 'api_keys':
        queryBuilder.select.mockReturnValue({
          ...queryBuilder,
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: apiKeys[0] || null,
            error: apiKeys.length > 0 ? null : new Error('Not found'),
          }),
        })
        break
    }

    return queryBuilder
  }

  const mockFrom = vi.fn().mockImplementation(createQueryBuilder)

  return {
    auth: mockAuth,
    from: mockFrom,
  }
}

/**
 * Mock requireAuth 中间件
 */
export function createMockAuthMiddleware(options: {
  authenticated?: boolean
  user?: any
} = {}) {
  const { authenticated = true, user = mockUser } = options

  return vi.fn().mockImplementation(async (request: Request) => {
    if (!authenticated) {
      throw new Error('未提供认证令牌，请先登录')
    }

    return {
      user,
      supabase: createMockSupabaseClient(),
      token: 'mock-token',
    }
  })
}
