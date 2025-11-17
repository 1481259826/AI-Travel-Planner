/**
 * 自定义错误类
 */

/**
 * 基础应用错误
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * 验证错误 (400)
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * 未授权错误 (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权，请先登录') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

/**
 * 禁止访问错误 (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '无权访问此资源') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

/**
 * 资源未找到错误 (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * 冲突错误 (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * API 错误 (可自定义状态码)
 */
export class APIError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'API_ERROR')
    this.name = 'APIError'
    Object.setPrototypeOf(this, APIError.prototype)
  }
}

/**
 * 外部服务错误 (502)
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string = '外部服务调用失败',
    public serviceName?: string
  ) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR')
    this.name = 'ExternalServiceError'
    Object.setPrototypeOf(this, ExternalServiceError.prototype)
  }
}

/**
 * 从未知错误对象中提取错误消息
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object') {
    // 尝试从对象中提取 message 属性
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message
    }

    // 尝试从对象中提取 error 属性
    if ('error' in error && typeof (error as any).error === 'string') {
      return (error as any).error
    }

    // 尝试序列化对象
    try {
      return JSON.stringify(error)
    } catch {
      return '未知错误'
    }
  }

  return '未知错误'
}
