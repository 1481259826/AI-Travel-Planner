/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/trips/[id]/route'
import { mockUser, mockTrip, createMockSupabaseClient } from '@/__tests__/mocks/supabase'
import type { Itinerary } from '@/types'

//  Mock依赖
const mockRequireAuth = vi.fn()
const mockRequireOwnership = vi.fn()

vi.mock('@/app/api/_middleware', () => ({
  requireAuth: (req: any) => mockRequireAuth(req),
  requireOwnership: (userId: string, resourceUserId: string) =>
    mockRequireOwnership(userId, resourceUserId),
}))

vi.mock('@/app/api/_middleware/error-handler', () => ({
  handleApiError: vi.fn().mockImplementation((error: Error) => {
    const status = error.message.includes('不存在') || error.message.includes('缺少')
      ? 404
      : error.message.includes('没有权限')
      ? 403
      : error.message.includes('未提供认证令牌')
      ? 401
      : 500

    return Response.json({ error: error.message }, { status })
  }),
}))

vi.mock('@/app/api/_utils/response', () => ({
  successResponse: vi.fn().mockImplementation((data: any, message?: string) => {
    return Response.json({ data, message }, { status: 200 })
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

describe('GET /api/trips/:id', () => {
  const mockParams = Promise.resolve({ id: 'test-trip-id' })

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: createMockSupabaseClient(),
      token: 'mock-token',
    })

    mockRequireOwnership.mockImplementation(() => {})
  })

  it('应该成功获取行程详情', async () => {
    const request = new NextRequest('http://localhost/api/trips/test-trip-id', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const response = await GET(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockTrip)
    expect(mockRequireOwnership).toHaveBeenCalledWith(mockUser.id, mockTrip.user_id)
  })

  it('应该在行程不存在时返回 404', async () => {
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      },
      token: 'mock-token',
    })

    const request = new NextRequest('http://localhost/api/trips/non-existent-id', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const response = await GET(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('行程不存在')
  })

  it('应该在未认证时返回 401', async () => {
    mockRequireAuth.mockRejectedValue(new Error('未提供认证令牌，请先登录'))

    const request = new NextRequest('http://localhost/api/trips/test-trip-id', {
      method: 'GET',
    })

    const response = await GET(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('未提供认证令牌')
  })

  it('应该在无权访问时返回 403', async () => {
    mockRequireOwnership.mockImplementation(() => {
      throw new Error('没有权限访问该资源')
    })

    const request = new NextRequest('http://localhost/api/trips/test-trip-id', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const response = await GET(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('没有权限')
  })
})

describe('PUT /api/trips/:id', () => {
  const mockParams = Promise.resolve({ id: 'test-trip-id' })

  const updatedItinerary: Itinerary = {
    destination: '北京',
    startDate: '2025-03-01',
    endDate: '2025-03-03',
    totalDays: 3,
    days: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'trips') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockTrip, itinerary: updatedItinerary },
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      },
      token: 'mock-token',
    })

    mockRequireOwnership.mockImplementation(() => {})
  })

  it('应该成功更新行程', async () => {
    const request = new NextRequest('http://localhost/api/trips/test-trip-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ itinerary: updatedItinerary }),
    })

    const response = await PUT(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.itinerary).toEqual(updatedItinerary)
    expect(mockRequireOwnership).toHaveBeenCalledWith(mockUser.id, mockUser.id)
  })

  it('应该在缺少行程数据时返回 404', async () => {
    const request = new NextRequest('http://localhost/api/trips/test-trip-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({}),
    })

    const response = await PUT(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('缺少行程数据')
  })

  it('应该在行程不存在时返回 404', async () => {
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      },
      token: 'mock-token',
    })

    const request = new NextRequest('http://localhost/api/trips/non-existent-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ itinerary: updatedItinerary }),
    })

    const response = await PUT(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('行程不存在')
  })
})

describe('DELETE /api/trips/:id', () => {
  const mockParams = Promise.resolve({ id: 'test-trip-id' })

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { user_id: mockUser.id },
                error: null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      },
      token: 'mock-token',
    })

    mockRequireOwnership.mockImplementation(() => {})
  })

  it('应该成功删除行程', async () => {
    const request = new NextRequest('http://localhost/api/trips/test-trip-id', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const response = await DELETE(request, { params: mockParams })

    expect(response.status).toBe(204)
    expect(mockRequireOwnership).toHaveBeenCalledWith(mockUser.id, mockUser.id)
  })

  it('应该在行程不存在时返回 404', async () => {
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      },
      token: 'mock-token',
    })

    const request = new NextRequest('http://localhost/api/trips/non-existent-id', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const response = await DELETE(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('行程不存在')
  })

  it('应该在无权删除时返回 403', async () => {
    mockRequireOwnership.mockImplementation(() => {
      throw new Error('没有权限访问该资源')
    })

    const request = new NextRequest('http://localhost/api/trips/test-trip-id', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    const response = await DELETE(request, { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('没有权限')
  })
})
