/**
 * useAuthFetch Hook
 * 封装带认证的 fetch 请求
 */

'use client'

import { useCallback } from 'react'
import { useAuth } from './useAuth'
import { logger } from '@/lib/logger'

export interface AuthFetchOptions extends RequestInit {
  /** 是否跳过错误日志 */
  skipErrorLog?: boolean
}

export interface UseAuthFetchResult {
  /** 带认证的 fetch 函数 */
  authFetch: <T = any>(url: string, options?: AuthFetchOptions) => Promise<T>
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 是否正在加载认证状态 */
  isLoading: boolean
  /** 用户 session */
  session: any
}

/**
 * 带认证的 fetch Hook
 */
export function useAuthFetch(): UseAuthFetchResult {
  const { session, loading, isAuthenticated } = useAuth()

  /**
   * 带认证的 fetch 请求
   * @param url API 端点
   * @param options fetch 选项
   * @returns 解析后的 JSON 数据
   */
  const authFetch = useCallback(
    async <T = any>(url: string, options: AuthFetchOptions = {}): Promise<T> => {
      const { skipErrorLog, headers, ...restOptions } = options

      if (!session?.access_token) {
        const error = new Error('未认证：请先登录')
        if (!skipErrorLog) {
          logger.error('authFetch: 未认证', { url })
        }
        throw error
      }

      try {
        const response = await fetch(url, {
          ...restOptions,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            ...headers,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const error = new Error(
            errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
          )
          if (!skipErrorLog) {
            logger.error('authFetch: 请求失败', {
              url,
              status: response.status,
              error: errorData,
            })
          }
          throw error
        }

        const data = await response.json()
        return data as T
      } catch (error) {
        if (!skipErrorLog) {
          logger.error('authFetch: 请求异常', { url, error })
        }
        throw error
      }
    },
    [session]
  )

  return {
    authFetch,
    isAuthenticated,
    isLoading: loading,
    session,
  }
}
