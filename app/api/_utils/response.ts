/**
 * API 统一响应格式工具
 * 提供标准化的成功和错误响应格式
 */

import { NextResponse } from 'next/server'

/**
 * 成功响应格式
 */
export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
}

/**
 * 错误响应格式
 */
export interface ErrorResponse {
  success: false
  error: string
  message: string
  context?: Record<string, unknown>
}

/**
 * 创建成功响应
 * @param data 响应数据
 * @param message 可选的成功消息
 * @param status HTTP 状态码，默认 200
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  )
}

/**
 * 创建错误响应
 * @param error 错误名称
 * @param message 错误消息
 * @param status HTTP 状态码
 * @param context 可选的错误上下文
 */
export function errorResponse(
  error: string,
  message: string,
  status: number = 500,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      ...(context && { context }),
    },
    { status }
  )
}

/**
 * 创建创建成功响应 (201 Created)
 */
export function createdResponse<T>(data: T, message?: string) {
  return successResponse(data, message, 201)
}

/**
 * 创建无内容响应 (204 No Content)
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 })
}

/**
 * 创建分页响应
 */
export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / pageSize)
  const hasMore = page < totalPages

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasMore,
    },
  })
}
