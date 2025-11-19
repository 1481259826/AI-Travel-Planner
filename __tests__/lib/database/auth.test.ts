/**
 * Supabase 认证模块测试
 *
 * 测试覆盖：
 * - 用户注册（signUp）
 * - 用户登录（signIn）
 * - 用户登出（signOut）
 * - 获取当前用户（getUser）
 * - 获取会话（getSession）
 * - 监听认证状态变化（onAuthStateChange）
 * - 向后兼容的对象式 API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User, Session, AuthError } from '@supabase/supabase-js'

// Mock Supabase 客户端
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/lib/database/client', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}))

describe('database/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    it('应该成功注册用户', async () => {
      const { signUp } = await import('@/lib/database/auth')

      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockSession: Partial<Session> = {
        access_token: 'token-123',
        user: mockUser as User,
      }

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      const result = await signUp('test@example.com', 'password123')

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: undefined,
          },
        },
      })

      expect(result).toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
    })

    it('应该注册用户并包含姓名', async () => {
      const { signUp } = await import('@/lib/database/auth')

      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })

      await signUp('test@example.com', 'password123', '张三')

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: '张三',
          },
        },
      })
    })

    it('应该处理注册错误', async () => {
      const { signUp } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: '邮箱已被使用',
        status: 400,
      }

      mockSignUp.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await signUp('existing@example.com', 'password123')

      expect(result.error).toEqual(mockError)
      expect(result.data).toBeNull()
    })

    it('应该处理弱密码错误', async () => {
      const { signUp } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: 'Password should be at least 6 characters',
        status: 400,
      }

      mockSignUp.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await signUp('test@example.com', '123')

      expect(result.error).toBeTruthy()
      expect(result.data).toBeNull()
    })
  })

  describe('signIn', () => {
    it('应该成功登录用户', async () => {
      const { signIn } = await import('@/lib/database/auth')

      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockSession: Partial<Session> = {
        access_token: 'token-123',
        user: mockUser as User,
      }

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      const result = await signIn('test@example.com', 'password123')

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result).toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
    })

    it('应该处理登录错误（邮箱不存在）', async () => {
      const { signIn } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: 'Invalid login credentials',
        status: 400,
      }

      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await signIn('notexist@example.com', 'password123')

      expect(result.error).toEqual(mockError)
      expect(result.data).toBeNull()
    })

    it('应该处理登录错误（密码错误）', async () => {
      const { signIn } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: 'Invalid login credentials',
        status: 400,
      }

      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await signIn('test@example.com', 'wrongpassword')

      expect(result.error).toBeTruthy()
      expect(result.data).toBeNull()
    })

    it('应该处理空邮箱/密码', async () => {
      const { signIn } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: 'Email and password required',
        status: 400,
      }

      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await signIn('', '')

      expect(result.error).toBeTruthy()
    })
  })

  describe('signOut', () => {
    it('应该成功登出用户', async () => {
      const { signOut } = await import('@/lib/database/auth')

      mockSignOut.mockResolvedValue({ error: null })

      const result = await signOut()

      expect(mockSignOut).toHaveBeenCalled()
      expect(result).toEqual({ error: null })
    })

    it('应该处理登出错误', async () => {
      const { signOut } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: 'Failed to sign out',
        status: 500,
      }

      mockSignOut.mockResolvedValue({ error: mockError })

      const result = await signOut()

      expect(result.error).toEqual(mockError)
    })

    it('应该在未登录状态下也能调用', async () => {
      const { signOut } = await import('@/lib/database/auth')

      mockSignOut.mockResolvedValue({ error: null })

      const result = await signOut()

      expect(result).toEqual({ error: null })
    })
  })

  describe('getUser', () => {
    it('应该获取当前登录用户', async () => {
      const { getUser } = await import('@/lib/database/auth')

      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getUser()

      expect(mockGetUser).toHaveBeenCalled()
      expect(result).toEqual({ user: mockUser, error: null })
    })

    it('应该在未登录时返回 null', async () => {
      const { getUser } = await import('@/lib/database/auth')

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getUser()

      expect(result.user).toBeNull()
      expect(result.error).toBeNull()
    })

    it('应该处理获取用户错误', async () => {
      const { getUser } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: 'Failed to get user',
        status: 500,
      }

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const result = await getUser()

      expect(result.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('getSession', () => {
    it('应该获取当前会话', async () => {
      const { getSession } = await import('@/lib/database/auth')

      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockSession: Partial<Session> = {
        access_token: 'token-123',
        user: mockUser as User,
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await getSession()

      expect(mockGetSession).toHaveBeenCalled()
      expect(result).toEqual({
        data: { session: mockSession },
        error: null,
      })
    })

    it('应该在未登录时返回 null session', async () => {
      const { getSession } = await import('@/lib/database/auth')

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await getSession()

      expect(result.data.session).toBeNull()
      expect(result.error).toBeNull()
    })

    it('应该处理获取会话错误', async () => {
      const { getSession } = await import('@/lib/database/auth')

      const mockError: Partial<AuthError> = {
        message: 'Failed to get session',
        status: 500,
      }

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      })

      const result = await getSession()

      expect(result.error).toEqual(mockError)
    })
  })

  describe('onAuthStateChange', () => {
    it('应该监听认证状态变化', async () => {
      const { onAuthStateChange } = await import('@/lib/database/auth')

      const mockUnsubscribe = vi.fn()
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      })

      const callback = vi.fn()
      const result = onAuthStateChange(callback)

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(callback)
      expect(result.data.subscription.unsubscribe).toBe(mockUnsubscribe)
    })

    it('应该在状态变化时调用回调', async () => {
      const { onAuthStateChange } = await import('@/lib/database/auth')

      let savedCallback: ((event: string, session: Session | null) => void) | null = null

      mockOnAuthStateChange.mockImplementation((callback) => {
        savedCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })

      const callback = vi.fn()
      onAuthStateChange(callback)

      // 模拟登录事件
      const mockSession: Partial<Session> = {
        access_token: 'token-123',
      }

      savedCallback?.('SIGNED_IN', mockSession as Session)

      expect(callback).toHaveBeenCalledWith('SIGNED_IN', mockSession)
    })

    it('应该在登出时调用回调', async () => {
      const { onAuthStateChange } = await import('@/lib/database/auth')

      let savedCallback: ((event: string, session: Session | null) => void) | null = null

      mockOnAuthStateChange.mockImplementation((callback) => {
        savedCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })

      const callback = vi.fn()
      onAuthStateChange(callback)

      // 模拟登出事件
      savedCallback?.('SIGNED_OUT', null)

      expect(callback).toHaveBeenCalledWith('SIGNED_OUT', null)
    })

    it('应该能取消订阅', async () => {
      const { onAuthStateChange } = await import('@/lib/database/auth')

      const mockUnsubscribe = vi.fn()
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      })

      const callback = vi.fn()
      const { data } = onAuthStateChange(callback)

      data.subscription.unsubscribe()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('auth 对象（向后兼容）', () => {
    it('应该导出 auth 对象包含所有方法', async () => {
      const { auth } = await import('@/lib/database/auth')

      expect(auth).toHaveProperty('signUp')
      expect(auth).toHaveProperty('signIn')
      expect(auth).toHaveProperty('signOut')
      expect(auth).toHaveProperty('getUser')
      expect(auth).toHaveProperty('getSession')
      expect(auth).toHaveProperty('onAuthStateChange')
    })

    it('应该能通过 auth 对象调用 signIn', async () => {
      const { auth } = await import('@/lib/database/auth')

      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })

      await auth.signIn('test@example.com', 'password123')

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('应该能通过 auth 对象调用 signUp', async () => {
      const { auth } = await import('@/lib/database/auth')

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      await auth.signUp('new@example.com', 'password123', '新用户')

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            name: '新用户',
          },
        },
      })
    })

    it('应该能通过 auth 对象调用 signOut', async () => {
      const { auth } = await import('@/lib/database/auth')

      mockSignOut.mockResolvedValue({ error: null })

      await auth.signOut()

      expect(mockSignOut).toHaveBeenCalled()
    })

    it('应该能通过 auth 对象调用 getUser', async () => {
      const { auth } = await import('@/lib/database/auth')

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await auth.getUser()

      expect(mockGetUser).toHaveBeenCalled()
    })

    it('应该能通过 auth 对象调用 getSession', async () => {
      const { auth } = await import('@/lib/database/auth')

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      await auth.getSession()

      expect(mockGetSession).toHaveBeenCalled()
    })

    it('应该能通过 auth 对象调用 onAuthStateChange', async () => {
      const { auth } = await import('@/lib/database/auth')

      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })

      const callback = vi.fn()
      auth.onAuthStateChange(callback)

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(callback)
    })
  })

  describe('边界情况', () => {
    it('应该处理特殊字符的邮箱', async () => {
      const { signUp } = await import('@/lib/database/auth')

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      await signUp('user+tag@example.com', 'password123')

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user+tag@example.com',
        })
      )
    })

    it('应该处理包含特殊字符的密码', async () => {
      const { signIn } = await import('@/lib/database/auth')

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      await signIn('test@example.com', 'P@ssw0rd!#$%')

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'P@ssw0rd!#$%',
      })
    })

    it('应该处理包含中文的姓名', async () => {
      const { signUp } = await import('@/lib/database/auth')

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      await signUp('test@example.com', 'password123', '张三李四王五')

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            data: {
              name: '张三李四王五',
            },
          },
        })
      )
    })

    it('应该处理长邮箱地址', async () => {
      const { signIn } = await import('@/lib/database/auth')

      const longEmail = 'a'.repeat(50) + '@example.com'

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      await signIn(longEmail, 'password123')

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: longEmail,
        password: 'password123',
      })
    })
  })
})
