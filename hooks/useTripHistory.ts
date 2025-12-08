/**
 * useTripHistory Hook
 * 管理行程生成历史记录的状态和操作
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { auth } from '@/lib/supabase'
import type {
  TripHistoryListItem,
  TripGenerationRecord,
  HistoryFilters,
  HistoryStatus,
} from '@/lib/trip-history'

// ============================================================================
// 类型定义
// ============================================================================

export interface UseTripHistoryOptions {
  /** 自动加载 */
  autoLoad?: boolean
  /** 初始页大小 */
  pageSize?: number
  /** 初始筛选条件 */
  initialFilters?: HistoryFilters
}

export interface UseTripHistoryReturn {
  /** 历史记录列表 */
  records: TripHistoryListItem[]
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 是否有更多数据 */
  hasMore: boolean
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 当前筛选条件 */
  filters: HistoryFilters

  // 操作方法
  /** 刷新列表（从第一页开始） */
  refresh: () => Promise<void>
  /** 加载更多（下一页） */
  loadMore: () => Promise<void>
  /** 设置筛选条件 */
  setFilters: (filters: HistoryFilters) => void
  /** 删除记录 */
  deleteRecord: (id: string) => Promise<void>
  /** 获取记录详情 */
  getRecordDetail: (id: string) => Promise<TripGenerationRecord | null>
  /** 清除错误 */
  clearError: () => void
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useTripHistory(options: UseTripHistoryOptions = {}): UseTripHistoryReturn {
  const {
    autoLoad = true,
    pageSize: initialPageSize = 20,
    initialFilters = {},
  } = options

  // 状态
  const [records, setRecords] = useState<TripHistoryListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(initialPageSize)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<HistoryFilters>(initialFilters)

  // Refs
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)

  // 计算是否有更多数据
  const hasMore = records.length < total

  /**
   * 获取认证 token
   */
  const getToken = useCallback(async (): Promise<string> => {
    const { data: { session } } = await auth.getSession()
    if (!session?.access_token) {
      throw new Error('请先登录')
    }
    return session.access_token
  }, [])

  /**
   * 获取历史记录列表
   */
  const fetchRecords = useCallback(async (
    pageNum: number,
    append: boolean = false
  ) => {
    // 防止重复加载
    if (loadingRef.current) return
    loadingRef.current = true

    setIsLoading(true)
    setError(null)

    try {
      const token = await getToken()

      // 构建查询参数
      const params = new URLSearchParams({
        page: pageNum.toString(),
        page_size: pageSize.toString(),
      })

      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status)
      }
      if (filters.destination) {
        params.set('destination', filters.destination)
      }
      if (filters.dateFrom) {
        params.set('date_from', filters.dateFrom)
      }
      if (filters.dateTo) {
        params.set('date_to', filters.dateTo)
      }

      const response = await fetch(`/api/trip-history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '获取历史记录失败')
      }

      const data = await response.json()

      if (!mountedRef.current) return

      if (append) {
        setRecords(prev => [...prev, ...data.data])
      } else {
        setRecords(data.data)
      }
      setTotal(data.pagination.total)
      setPage(pageNum)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : '获取历史记录失败')
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
      loadingRef.current = false
    }
  }, [getToken, pageSize, filters])

  /**
   * 刷新列表
   */
  const refresh = useCallback(async () => {
    await fetchRecords(1, false)
  }, [fetchRecords])

  /**
   * 加载更多
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchRecords(page + 1, true)
  }, [fetchRecords, page, hasMore, isLoading])

  /**
   * 设置筛选条件
   */
  const setFilters = useCallback((newFilters: HistoryFilters) => {
    setFiltersState(newFilters)
    // 筛选条件变化时，重置到第一页
    setPage(1)
    setRecords([])
  }, [])

  /**
   * 删除记录
   */
  const deleteRecord = useCallback(async (id: string) => {
    try {
      const token = await getToken()

      const response = await fetch(`/api/trip-history/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok && response.status !== 204) {
        const data = await response.json()
        throw new Error(data.message || '删除失败')
      }

      // 从列表中移除
      setRecords(prev => prev.filter(r => r.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [getToken])

  /**
   * 获取记录详情
   */
  const getRecordDetail = useCallback(async (id: string): Promise<TripGenerationRecord | null> => {
    try {
      const token = await getToken()

      const response = await fetch(`/api/trip-history/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '获取详情失败')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取详情失败')
      return null
    }
  }, [getToken])

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 初始加载和筛选条件变化时重新加载
  // 使用 ref 跟踪是否已初始化，避免重复加载
  const initializedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    if (autoLoad) {
      fetchRecords(1, false)
      initializedRef.current = true
    }

    return () => {
      mountedRef.current = false
    }
  }, []) // 只在挂载时执行一次

  // 筛选条件变化时重新加载（跳过初始化）
  useEffect(() => {
    if (initializedRef.current && autoLoad) {
      fetchRecords(1, false)
    }
  }, [filters]) // 只监听 filters 变化

  return {
    records,
    total,
    page,
    pageSize,
    hasMore,
    isLoading,
    error,
    filters,
    refresh,
    loadMore,
    setFilters,
    deleteRecord,
    getRecordDetail,
    clearError,
  }
}

// ============================================================================
// 单条记录详情 Hook
// ============================================================================

export interface UseTripHistoryDetailOptions {
  /** 记录 ID */
  id: string
  /** 自动加载 */
  autoLoad?: boolean
}

export interface UseTripHistoryDetailReturn {
  /** 记录详情 */
  record: TripGenerationRecord | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 刷新 */
  refresh: () => Promise<void>
}

export function useTripHistoryDetail(options: UseTripHistoryDetailOptions): UseTripHistoryDetailReturn {
  const { id, autoLoad = true } = options

  const [record, setRecord] = useState<TripGenerationRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await auth.getSession()
      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      const response = await fetch(`/api/trip-history/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '获取详情失败')
      }

      const data = await response.json()

      if (mountedRef.current) {
        setRecord(data.data)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : '获取详情失败')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [id])

  useEffect(() => {
    if (autoLoad && id) {
      refresh()
    }

    return () => {
      mountedRef.current = false
    }
  }, [id, autoLoad, refresh])

  return {
    record,
    isLoading,
    error,
    refresh,
  }
}

export default useTripHistory
