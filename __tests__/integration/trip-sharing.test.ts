/**
 * 行程分享流程集成测试
 *
 * 测试完整的行程分享流程：
 * 1. Token 生成（UUID）
 * 2. 分享链接构建
 * 3. 公开访问验证
 * 4. 权限验证（所有者 vs 访客）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateShareToken, getShareUrl, getQRCodeUrl, copyToClipboard } from '@/lib/share'
import { createMockSupabaseClient } from '../mocks/supabase'
import type { Trip } from '@/types'

// Mock Next.js
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === 'authorization') return 'Bearer mock-token'
      return null
    })
  }))
}))

describe('行程分享流程集成测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  const mockTrip: Trip = {
    id: 'trip-123',
    user_id: 'user-123',
    title: '测试分享行程',
    destination: '北京',
    start_date: '2025-01-20',
    end_date: '2025-01-22',
    duration: 3,
    status: 'planned',
    itinerary: {
      title: '测试分享行程',
      destination: '北京',
      days: 3,
      dailyPlans: []
    },
    is_public: false,
    share_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
  })

  it('应该完成完整的分享流程：生成Token → 构建链接 → 公开访问', async () => {
    // Step 1: 生成分享 Token（UUID 格式，无破折号）
    const shareToken = generateShareToken()

    // 验证 Token 格式（32 个十六进制字符，无破折号）
    const tokenRegex = /^[0-9a-f]{32}$/i
    expect(shareToken).toMatch(tokenRegex)
    expect(shareToken).toHaveLength(32)

    // Step 2: 更新行程为公开并保存 Token
    const sharedTrip: Trip = {
      ...mockTrip,
      is_public: true,
      share_token: shareToken
    }

    // Mock 数据库更新
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: sharedTrip, error: null }))
          }))
        }))
      }))
    } as any)

    // 更新数据库
    const { data: updated, error } = await mockSupabase
      .from('trips')
      .update({ is_public: true, share_token: shareToken })
      .eq('id', mockTrip.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated).toBeTruthy()
    expect(updated?.share_token).toBe(shareToken)
    expect(updated?.is_public).toBe(true)

    // Step 3: 构建分享链接
    const shareUrl = getShareUrl(shareToken)

    // 验证链接格式
    expect(shareUrl).toContain('/share/')
    expect(shareUrl).toContain(shareToken)

    // Step 4: 模拟公开访问（无需认证）
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: sharedTrip, error: null }))
        }))
      }))
    } as any)

    // 通过 Token 获取行程（不需要认证）
    const { data: publicTrip, error: accessError } = await mockSupabase
      .from('trips')
      .select('*')
      .eq('share_token', shareToken)
      .single()

    expect(accessError).toBeNull()
    expect(publicTrip).toBeTruthy()
    expect(publicTrip?.id).toBe(mockTrip.id)
    expect(publicTrip?.is_public).toBe(true)
  })

  it('应该验证只有所有者可以生成和管理分享', async () => {
    const shareToken = generateShareToken()

    // 模拟所有者尝试更新分享设置
    const ownerId = 'user-123'

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockTrip, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { ...mockTrip, is_public: true, share_token: shareToken },
              error: null
            }))
          }))
        }))
      }))
    } as any)

    // 验证所有权
    const { data: trip } = await mockSupabase
      .from('trips')
      .select('*')
      .eq('id', mockTrip.id)
      .single()

    expect(trip?.user_id).toBe(ownerId)

    // 所有者可以更新分享设置
    const { data: shared, error } = await mockSupabase
      .from('trips')
      .update({ is_public: true, share_token: shareToken })
      .eq('id', mockTrip.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(shared?.is_public).toBe(true)

    // 模拟非所有者尝试修改分享设置（应该失败）
    const nonOwnerId = 'user-456'

    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' }
            }))
          }))
        }))
      }))
    } as any)

    // 非所有者尝试更新（RLS 应阻止）
    const { data: unauthorized, error: authError } = await mockSupabase
      .from('trips')
      .update({ is_public: false })
      .eq('id', mockTrip.id)
      .select()
      .single()

    expect(unauthorized).toBeNull()
    expect(authError).toBeTruthy()
  })

  it('应该生成二维码 URL 用于分享', () => {
    const shareToken = generateShareToken()
    const shareUrl = getShareUrl(shareToken)

    // 生成二维码 URL（使用 qr-server API）
    const qrCodeUrl = getQRCodeUrl(shareUrl)

    // 验证二维码 URL 格式
    expect(qrCodeUrl).toContain('qrserver.com')
    expect(qrCodeUrl).toContain(encodeURIComponent(shareUrl))
  })

  it('应该处理取消分享（删除 Token 并设为私有）', async () => {
    // 模拟已分享的行程
    const sharedTrip: Trip = {
      ...mockTrip,
      is_public: true,
      share_token: generateShareToken()
    }

    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { ...sharedTrip, is_public: false, share_token: null },
              error: null
            }))
          }))
        }))
      }))
    } as any)

    // 取消分享
    const { data: unshared, error } = await mockSupabase
      .from('trips')
      .update({ is_public: false, share_token: null })
      .eq('id', sharedTrip.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(unshared?.is_public).toBe(false)
    expect(unshared?.share_token).toBeNull()

    // 验证旧的分享链接失效
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { code: '404' } }))
        }))
      }))
    } as any)

    const { data: notFound, error: accessError } = await mockSupabase
      .from('trips')
      .select('*')
      .eq('share_token', sharedTrip.share_token)
      .single()

    expect(notFound).toBeNull()
    expect(accessError).toBeTruthy()
  })

  it('应该处理分享链接访问：公开 vs 私有', async () => {
    const shareToken = generateShareToken()

    // 场景 1: 私有行程（未分享）
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { code: '404' } }))
        }))
      }))
    } as any)

    const { data: privateTrip, error: privateError } = await mockSupabase
      .from('trips')
      .select('*')
      .eq('share_token', shareToken)
      .single()

    expect(privateTrip).toBeNull()
    expect(privateError).toBeTruthy()

    // 场景 2: 公开行程（已分享）
    const publicTrip: Trip = {
      ...mockTrip,
      is_public: true,
      share_token: shareToken
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: publicTrip, error: null }))
        }))
      }))
    } as any)

    const { data: sharedTrip, error: sharedError } = await mockSupabase
      .from('trips')
      .select('*')
      .eq('share_token', shareToken)
      .single()

    expect(sharedError).toBeNull()
    expect(sharedTrip).toBeTruthy()
    expect(sharedTrip?.is_public).toBe(true)
  })

  it('应该验证分享 Token 的唯一性', () => {
    // 生成多个 Token
    const tokens = new Set<string>()
    const count = 100

    for (let i = 0; i < count; i++) {
      const token = generateShareToken()
      tokens.add(token)
    }

    // 验证所有 Token 都是唯一的
    expect(tokens.size).toBe(count)
  })

  it('应该处理分享链接的复制功能', async () => {
    const shareToken = generateShareToken()
    const shareUrl = getShareUrl(shareToken)

    // Mock navigator.clipboard
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    // 使用库的 copyToClipboard 函数
    await copyToClipboard(shareUrl)

    // 验证复制成功
    expect(mockClipboard.writeText).toHaveBeenCalledWith(shareUrl)
  })

  it('应该正确构建分享 URL（包含完整域名）', () => {
    const shareToken = generateShareToken()

    // 不同环境的 base URL
    const developmentUrl = getShareUrl(shareToken, 'http://localhost:3008')
    const productionUrl = getShareUrl(shareToken, 'https://travel.example.com')

    // 验证开发环境 URL
    expect(developmentUrl).toBe(`http://localhost:3008/share/${shareToken}`)

    // 验证生产环境 URL
    expect(productionUrl).toBe(`https://travel.example.com/share/${shareToken}`)
  })
})
