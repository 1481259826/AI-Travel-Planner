/**
 * API 认证中间件
 * 提供统一的身份验证和授权机制
 */

import { NextRequest } from 'next/server'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { UnauthorizedError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * 认证结果
 */
export interface AuthResult {
  user: User
  supabase: SupabaseClient
  token: string
}

/**
 * 从请求中提取访问令牌
 */
function extractToken(request: NextRequest): string | null {
  // 1. 尝试从 Authorization header 获取
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  // 2. 尝试从 Cookie 获取
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const accessToken = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('sb-access-token='))
      ?.split('=')[1]

    if (accessToken) {
      return decodeURIComponent(accessToken)
    }
  }

  return null
}

/**
 * 创建带认证的 Supabase 客户端
 */
function createAuthenticatedClient(token: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * 验证用户身份并返回认证信息
 * @param request Next.js 请求对象
 * @throws UnauthorizedError 当认证失败时
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  // 提取令牌
  const token = extractToken(request)

  if (!token) {
    logger.warn('Authentication failed: No token provided')
    throw new UnauthorizedError('未提供认证令牌，请先登录')
  }

  // 创建 Supabase 客户端
  const supabase = createAuthenticatedClient(token)

  // 验证令牌并获取用户信息
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error) {
      logger.warn('Authentication failed:', {
        error: error.message,
        code: error.status,
      })
      throw new UnauthorizedError('认证令牌无效或已过期，请重新登录')
    }

    if (!user) {
      logger.warn('Authentication failed: User not found')
      throw new UnauthorizedError('用户信息不存在，请重新登录')
    }

    // 认证成功
    logger.debug('Authentication successful:', {
      userId: user.id,
      email: user.email,
    })

    return { user, supabase, token }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error
    }

    logger.error('Authentication error:', error as Error)
    throw new UnauthorizedError('身份验证失败，请重新登录')
  }
}

/**
 * 可选认证 - 如果有令牌则验证，没有则返回 null
 * 适用于既支持匿名访问又支持认证访问的端点
 */
export async function optionalAuth(
  request: NextRequest
): Promise<AuthResult | null> {
  const token = extractToken(request)

  if (!token) {
    return null
  }

  try {
    return await requireAuth(request)
  } catch (error) {
    // 认证失败时返回 null，而不是抛出错误
    logger.debug('Optional auth failed:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

/**
 * 验证用户是否有权访问特定资源
 * @param userId 当前用户 ID
 * @param resourceUserId 资源所属用户 ID
 * @throws ForbiddenError 当权限不足时
 */
export function requireOwnership(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    logger.warn('Authorization failed: User does not own resource', {
      userId,
      resourceUserId,
    })
    throw new UnauthorizedError('没有权限访问该资源')
  }
}

/**
 * 创建服务端 Supabase 客户端（使用 service role key）
 * 仅在需要绕过 RLS 策略时使用，需谨慎使用
 */
export function createServiceClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * 使用示例：
 *
 * // 基本使用
 * export async function GET(request: NextRequest) {
 *   try {
 *     const { user, supabase } = await requireAuth(request)
 *
 *     // 使用认证的 supabase 客户端查询数据
 *     const { data, error } = await supabase
 *       .from('trips')
 *       .select('*')
 *       .eq('user_id', user.id)
 *
 *     return successResponse(data)
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 *
 * // 验证资源所有权
 * export async function DELETE(
 *   request: NextRequest,
 *   { params }: { params: { id: string } }
 * ) {
 *   try {
 *     const { user, supabase } = await requireAuth(request)
 *
 *     // 获取资源
 *     const { data: trip } = await supabase
 *       .from('trips')
 *       .select('user_id')
 *       .eq('id', params.id)
 *       .single()
 *
 *     // 验证所有权
 *     requireOwnership(user.id, trip.user_id)
 *
 *     // 删除资源
 *     await supabase.from('trips').delete().eq('id', params.id)
 *
 *     return noContentResponse()
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 *
 * // 可选认证
 * export async function GET(request: NextRequest) {
 *   try {
 *     const auth = await optionalAuth(request)
 *
 *     if (auth) {
 *       // 已认证用户 - 返回私有数据
 *       const { data } = await auth.supabase
 *         .from('trips')
 *         .select('*')
 *         .eq('user_id', auth.user.id)
 *       return successResponse(data)
 *     } else {
 *       // 未认证用户 - 返回公开数据
 *       const { data } = await supabase
 *         .from('trips')
 *         .select('*')
 *         .eq('is_public', true)
 *       return successResponse(data)
 *     }
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 */
