/**
 * Supabase 客户端初始化模块
 *
 * 职责：
 * - 创建和配置 Supabase 客户端实例
 * - 提供客户端工厂函数
 * - 支持服务端和客户端环境
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import config from '@/lib/config'

/**
 * 默认 Supabase 客户端实例
 * 用于客户端和服务端的通用操作
 */
export const supabase = createSupabaseClient(
  config.supabase.url,
  config.supabase.anonKey
)

/**
 * 创建新的 Supabase 客户端实例
 *
 * @returns 新的 Supabase 客户端实例
 *
 * @example
 * ```typescript
 * const client = createClient()
 * const { data, error } = await client.from('trips').select('*')
 * ```
 */
export function createClient(): SupabaseClient {
  return createSupabaseClient(
    config.supabase.url,
    config.supabase.anonKey
  )
}

/**
 * 创建服务端 Supabase 客户端（带认证 token）
 * 用于 API 路由中需要特定用户身份的操作
 *
 * @param token - 用户的认证 token
 * @returns 配置了用户认证的 Supabase 客户端
 *
 * @example
 * ```typescript
 * const token = req.headers.get('Authorization')?.replace('Bearer ', '')
 * const client = createServerSupabaseClient(token)
 * const { data, error } = await client.from('trips').select('*')
 * ```
 */
export function createServerSupabaseClient(token: string): SupabaseClient {
  return createSupabaseClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

/**
 * 创建服务端 Supabase 客户端（使用 Service Role Key）
 * ⚠️ 警告：仅在服务端使用，绕过 RLS 策略
 *
 * @returns 具有完全权限的 Supabase 客户端
 *
 * @example
 * ```typescript
 * // 仅在管理员操作或系统任务中使用
 * const adminClient = createAdminClient()
 * ```
 */
export function createAdminClient(): SupabaseClient {
  if (!config.supabase.serviceRoleKey) {
    throw new Error('Service Role Key 未配置，无法创建管理员客户端')
  }

  return createSupabaseClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  )
}
