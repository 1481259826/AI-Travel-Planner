/**
 * 自定义错误类型系统
 * 提供语义化的错误类，便于错误处理和调试
 */

/**
 * 基础应用错误类
 * 所有自定义错误的父类
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    // 维护正确的堆栈跟踪（仅在 V8 引擎中有效）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    }
  }
}

// ==================== HTTP 错误 ====================

/**
 * 400 Bad Request - 请求参数错误
 */
export class ValidationError extends AppError {
  constructor(message: string = '请求参数验证失败', context?: Record<string, unknown>) {
    super(message, 400, true, context)
  }
}

/**
 * 401 Unauthorized - 未认证
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未登录或登录已过期', context?: Record<string, unknown>) {
    super(message, 401, true, context)
  }
}

/**
 * 403 Forbidden - 无权限
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '没有权限执行此操作', context?: Record<string, unknown>) {
    super(message, 403, true, context)
  }
}

/**
 * 404 Not Found - 资源不存在
 */
export class NotFoundError extends AppError {
  constructor(message: string = '请求的资源不存在', context?: Record<string, unknown>) {
    super(message, 404, true, context)
  }
}

/**
 * 409 Conflict - 资源冲突
 */
export class ConflictError extends AppError {
  constructor(message: string = '资源冲突', context?: Record<string, unknown>) {
    super(message, 409, true, context)
  }
}

/**
 * 429 Too Many Requests - 请求过于频繁
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = '请求过于频繁，请稍后再试',
    context?: Record<string, unknown>
  ) {
    super(message, 429, true, context)
  }
}

/**
 * 500 Internal Server Error - 服务器内部错误
 */
export class InternalServerError extends AppError {
  constructor(message: string = '服务器内部错误', context?: Record<string, unknown>) {
    super(message, 500, false, context)
  }
}

/**
 * 503 Service Unavailable - 服务不可用
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = '服务暂时不可用', context?: Record<string, unknown>) {
    super(message, 503, true, context)
  }
}

/**
 * API 错误 - 通用 API 错误（可自定义状态码）
 * 用于向后兼容
 */
export class APIError extends AppError {
  constructor(message: string, statusCode: number = 500, context?: Record<string, unknown>) {
    super(message, statusCode, true, context)
  }
}

// ==================== 业务错误 ====================

/**
 * 数据库操作错误
 */
export class DatabaseError extends AppError {
  constructor(message: string = '数据库操作失败', context?: Record<string, unknown>) {
    super(message, 500, false, context)
  }
}

/**
 * 外部 API 调用错误
 */
export class ExternalApiError extends AppError {
  constructor(
    message: string = '外部服务调用失败',
    public readonly service: string,
    context?: Record<string, unknown>
  ) {
    super(message, 502, true, { ...context, service })
  }
}

/**
 * AI 模型调用错误
 */
export class AIModelError extends ExternalApiError {
  constructor(
    message: string = 'AI 模型调用失败',
    modelName: string,
    context?: Record<string, unknown>
  ) {
    super(message, `AI:${modelName}`, { ...context, modelName })
  }
}

/**
 * 地图 API 错误
 */
export class MapApiError extends ExternalApiError {
  constructor(message: string = '地图服务调用失败', context?: Record<string, unknown>) {
    super(message, 'AMap', context)
  }
}

/**
 * 数据同步错误
 */
export class SyncError extends AppError {
  constructor(message: string = '数据同步失败', context?: Record<string, unknown>) {
    super(message, 500, true, context)
  }
}

/**
 * 离线存储错误
 */
export class OfflineStorageError extends AppError {
  constructor(message: string = '离线存储操作失败', context?: Record<string, unknown>) {
    super(message, 500, true, context)
  }
}

/**
 * 加密/解密错误
 */
export class EncryptionError extends AppError {
  constructor(message: string = '加密或解密操作失败', context?: Record<string, unknown>) {
    super(message, 500, false, context)
  }
}

/**
 * 配置错误（环境变量缺失等）
 */
export class ConfigurationError extends AppError {
  constructor(message: string = '应用配置错误', context?: Record<string, unknown>) {
    super(message, 500, false, context)
  }
}

// ==================== 工具函数 ====================

/**
 * 判断错误是否为可操作的（预期的）错误
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

/**
 * 从任意错误对象中提取错误信息
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '未知错误'
}

/**
 * 从 HTTP 状态码创建对应的错误
 */
export function createHttpError(
  statusCode: number,
  message?: string,
  context?: Record<string, unknown>
): AppError {
  switch (statusCode) {
    case 400:
      return new ValidationError(message, context)
    case 401:
      return new UnauthorizedError(message, context)
    case 403:
      return new ForbiddenError(message, context)
    case 404:
      return new NotFoundError(message, context)
    case 409:
      return new ConflictError(message, context)
    case 429:
      return new RateLimitError(message, context)
    case 503:
      return new ServiceUnavailableError(message, context)
    default:
      return new InternalServerError(message, context)
  }
}

/**
 * 将错误转换为 HTTP 响应格式
 */
export function errorToHttpResponse(error: unknown): {
  status: number
  body: {
    error: string
    message: string
    context?: Record<string, unknown>
  }
} {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: error.name,
        message: error.message,
        context: error.context,
      },
    }
  }

  // 未知错误统一返回 500
  return {
    status: 500,
    body: {
      error: 'InternalServerError',
      message: extractErrorMessage(error),
    },
  }
}

// 使用示例
export const exampleUsage = {
  throwValidationError: () => {
    throw new ValidationError('目的地不能为空', { field: 'destination' })
  },

  throwNotFoundError: () => {
    throw new NotFoundError('行程不存在', { tripId: 'trip-123' })
  },

  throwAIModelError: () => {
    throw new AIModelError('AI 生成行程失败', 'deepseek-chat', {
      reason: 'API quota exceeded',
    })
  },

  catchAndHandle: async () => {
    try {
      // 某些可能抛出错误的操作
      throw new DatabaseError('Failed to connect to database')
    } catch (error) {
      if (error instanceof DatabaseError) {
        console.error('Database error:', error.message)
        // 重试逻辑
      } else if (isOperationalError(error as Error)) {
        console.warn('Operational error:', extractErrorMessage(error))
        // 向用户显示友好提示
      } else {
        console.error('Unexpected error:', error)
        // 记录到错误追踪服务
      }
    }
  },

  apiRouteExample: () => {
    try {
      // API 处理逻辑
      throw new UnauthorizedError('Token expired')
    } catch (error) {
      const response = errorToHttpResponse(error)
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}
