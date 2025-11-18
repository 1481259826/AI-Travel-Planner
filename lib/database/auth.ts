/**
 * Supabase 认证操作模块
 *
 * 职责：
 * - 用户注册、登录、登出
 * - 获取用户信息和会话
 * - 监听认证状态变化
 */

import { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from './client'

/**
 * 用户注册
 *
 * @param email - 用户邮箱
 * @param password - 密码
 * @param name - 用户姓名（可选）
 * @returns 注册结果，包含用户数据和会话信息
 *
 * @example
 * ```typescript
 * const { data, error } = await auth.signUp('user@example.com', 'password123', '张三')
 * if (error) {
 *   console.error('注册失败:', error.message)
 * } else {
 *   console.log('注册成功:', data.user)
 * }
 * ```
 */
export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{
  data: { user: User | null; session: Session | null } | null
  error: AuthError | null
}> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })
  return { data, error }
}

/**
 * 用户登录
 *
 * @param email - 用户邮箱
 * @param password - 密码
 * @returns 登录结果，包含用户数据和会话信息
 *
 * @example
 * ```typescript
 * const { data, error } = await auth.signIn('user@example.com', 'password123')
 * if (error) {
 *   console.error('登录失败:', error.message)
 * } else {
 *   console.log('登录成功:', data.session)
 * }
 * ```
 */
export async function signIn(
  email: string,
  password: string
): Promise<{
  data: { user: User | null; session: Session | null } | null
  error: AuthError | null
}> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

/**
 * 用户登出
 *
 * @returns 登出结果
 *
 * @example
 * ```typescript
 * const { error } = await auth.signOut()
 * if (error) {
 *   console.error('登出失败:', error.message)
 * }
 * ```
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * 获取当前登录用户信息
 *
 * @returns 用户信息，如果未登录则返回 null
 *
 * @example
 * ```typescript
 * const { user, error } = await auth.getUser()
 * if (error) {
 *   console.error('获取用户失败:', error.message)
 * } else if (user) {
 *   console.log('当前用户:', user.email)
 * }
 * ```
 */
export async function getUser(): Promise<{
  user: User | null
  error: AuthError | null
}> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * 获取当前会话信息
 *
 * @returns 会话信息，如果未登录则返回 null
 *
 * @example
 * ```typescript
 * const { data, error } = await auth.getSession()
 * if (error) {
 *   console.error('获取会话失败:', error.message)
 * } else if (data.session) {
 *   console.log('会话 token:', data.session.access_token)
 * }
 * ```
 */
export async function getSession(): Promise<{
  data: { session: Session | null }
  error: AuthError | null
}> {
  return await supabase.auth.getSession()
}

/**
 * 监听认证状态变化
 *
 * @param callback - 认证状态变化时的回调函数
 * @returns 取消订阅函数
 *
 * @example
 * ```typescript
 * const unsubscribe = auth.onAuthStateChange((event, session) => {
 *   console.log('认证事件:', event)
 *   if (session) {
 *     console.log('用户已登录:', session.user.email)
 *   } else {
 *     console.log('用户已登出')
 *   }
 * })
 *
 * // 取消订阅
 * unsubscribe()
 * ```
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { data: { subscription: { unsubscribe: () => void } } } {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * 认证操作对象（向后兼容旧的对象式 API）
 *
 * @deprecated 推荐直接使用导出的函数
 *
 * @example
 * ```typescript
 * // 旧的用法（仍然支持）
 * await auth.signIn('user@example.com', 'password')
 *
 * // 推荐的用法
 * import { signIn } from '@/lib/database/auth'
 * await signIn('user@example.com', 'password')
 * ```
 */
export const auth = {
  signUp,
  signIn,
  signOut,
  getUser,
  getSession,
  onAuthStateChange,
}
