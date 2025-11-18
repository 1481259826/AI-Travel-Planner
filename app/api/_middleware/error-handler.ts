/**
 * API 统一错误处理中间件
 * 将各种错误类型转换为标准的 HTTP 响应
 */

import { NextResponse } from 'next/server'
import { AppError, extractErrorMessage } from '@/lib/errors'
import { errorResponse } from '@/app/api/_utils/response'
import { logger } from '@/lib/logger'

/**
 * Supabase 错误类型
 */
interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

/**
 * 判断是否为 Supabase 错误
 */
function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  )
}

/**
 * 处理 Supabase 错误
 */
function handleSupabaseError(error: SupabaseError): NextResponse {
  const { message, code, details, hint } = error

  // 记录详细错误信息
  logger.error('Supabase Error:', error as Error, {
    code,
    details,
    hint,
  })

  // 根据错误代码返回友好的错误消息
  if (code === '23505') {
    // 唯一约束冲突
    return errorResponse('ConflictError', '数据已存在', 409, { code })
  }

  if (code === '23503') {
    // 外键约束失败
    return errorResponse('ValidationError', '关联数据不存在', 400, { code })
  }

  if (code?.startsWith('42')) {
    // 语法错误或访问规则违规
    return errorResponse('DatabaseError', '数据库查询错误', 500, { code })
  }

  if (code === 'PGRST116') {
    // RLS 策略限制
    return errorResponse('ForbiddenError', '没有权限访问该资源', 403, { code })
  }

  // 其他 Supabase 错误
  return errorResponse('DatabaseError', message || '数据库操作失败', 500, { code })
}

/**
 * 处理 Zod 验证错误
 */
function handleZodError(error: any): NextResponse {
  const issues = error.issues || []
  const errors = issues.map((issue: any) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  logger.warn('Validation Error:', { errors })

  return errorResponse(
    'ValidationError',
    '请求参数验证失败',
    400,
    { errors }
  )
}

/**
 * 统一错误处理函数
 * @param error 错误对象
 * @param operationName 操作名称（用于日志）
 */
export function handleApiError(
  error: unknown,
  operationName?: string
): NextResponse {
  // 记录操作上下文
  const context = operationName ? { operation: operationName } : {}

  // 1. 处理自定义 AppError
  if (error instanceof AppError) {
    logger.error(`${operationName || 'API'} Error:`, error, error.context)

    return errorResponse(
      error.name,
      error.message,
      error.statusCode,
      error.context
    )
  }

  // 2. 处理 Zod 验证错误
  if (error && typeof error === 'object' && 'issues' in error) {
    return handleZodError(error)
  }

  // 3. 处理 Supabase 错误
  if (isSupabaseError(error)) {
    return handleSupabaseError(error)
  }

  // 4. 处理标准 Error 对象
  if (error instanceof Error) {
    logger.error(`${operationName || 'API'} Error:`, error, context)

    // 某些特定的 Error 名称
    if (error.name === 'SyntaxError') {
      return errorResponse(
        'ValidationError',
        '请求数据格式错误',
        400,
        context
      )
    }

    if (error.name === 'TimeoutError') {
      return errorResponse(
        'ServiceUnavailableError',
        '请求超时，请稍后重试',
        503,
        context
      )
    }

    // 其他 Error
    return errorResponse(
      'InternalServerError',
      error.message || '服务器内部错误',
      500,
      context
    )
  }

  // 5. 处理未知错误
  const message = extractErrorMessage(error)
  logger.error(`${operationName || 'API'} Unknown Error:`, error as Error, context)

  return errorResponse('InternalServerError', message, 500, context)
}

/**
 * API 路由包装器 - 自动捕获错误
 * @param handler API 处理函数
 * @param operationName 操作名称
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  operationName?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, operationName)
    }
  }) as T
}

/**
 * 使用示例：
 *
 * // 方式 1: 直接捕获
 * export async function GET(request: NextRequest) {
 *   try {
 *     // API 逻辑
 *     return successResponse(data)
 *   } catch (error) {
 *     return handleApiError(error, 'GET /api/trips')
 *   }
 * }
 *
 * // 方式 2: 使用包装器
 * async function getTripHandler(request: NextRequest) {
 *   // API 逻辑
 *   return successResponse(data)
 * }
 *
 * export const GET = withErrorHandler(getTripHandler, 'GET /api/trips')
 */
