/**
 * useTemplates Hook
 * 管理旅行模板的状态和操作
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { auth } from '@/lib/supabase'
import type {
  TripTemplate,
  TemplateListItem,
  TemplateCategory,
  TemplateFormData,
  UpdateTemplateParams,
} from '@/lib/templates'

// ============================================================================
// 类型定义
// ============================================================================

export interface TemplateFilters {
  /** 分类筛选 */
  category?: TemplateCategory | 'all'
  /** 搜索关键词 */
  search?: string
}

export interface UseTemplatesOptions {
  /** 自动加载 */
  autoLoad?: boolean
  /** 初始页大小 */
  pageSize?: number
  /** 初始筛选条件 */
  initialFilters?: TemplateFilters
}

export interface UseTemplatesReturn {
  /** 模板列表 */
  templates: TemplateListItem[]
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
  filters: TemplateFilters

  // 操作方法
  /** 刷新列表（从第一页开始） */
  refresh: () => Promise<void>
  /** 加载更多（下一页） */
  loadMore: () => Promise<void>
  /** 设置筛选条件 */
  setFilters: (filters: TemplateFilters) => void
  /** 创建模板 */
  createTemplate: (data: TemplateFormData) => Promise<TripTemplate>
  /** 从行程创建模板 */
  createFromTrip: (tripId: string, data: Omit<TemplateFormData, 'itinerary_template'>) => Promise<TripTemplate>
  /** 更新模板 */
  updateTemplate: (id: string, data: UpdateTemplateParams) => Promise<TripTemplate>
  /** 删除模板 */
  deleteTemplate: (id: string) => Promise<void>
  /** 获取模板详情 */
  getTemplate: (id: string) => Promise<TripTemplate | null>
  /** 应用模板 */
  applyTemplate: (id: string) => Promise<{ trip_id: string }>
  /** 清除错误 */
  clearError: () => void
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const {
    autoLoad = true,
    pageSize: initialPageSize = 20,
    initialFilters = {},
  } = options

  // 状态
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(initialPageSize)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<TemplateFilters>(initialFilters)

  // Refs
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)

  // 计算是否有更多数据
  const hasMore = templates.length < total

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
   * 获取模板列表
   */
  const fetchTemplates = useCallback(async (
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

      if (filters.category && filters.category !== 'all') {
        params.set('category', filters.category)
      }
      if (filters.search) {
        params.set('search', filters.search)
      }

      const response = await fetch(`/api/templates?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '获取模板列表失败')
      }

      const data = await response.json()

      if (!mountedRef.current) return

      if (append) {
        setTemplates(prev => [...prev, ...data.data])
      } else {
        setTemplates(data.data)
      }
      setTotal(data.pagination.total)
      setPage(pageNum)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : '获取模板列表失败')
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
    await fetchTemplates(1, false)
  }, [fetchTemplates])

  /**
   * 加载更多
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchTemplates(page + 1, true)
  }, [fetchTemplates, page, hasMore, isLoading])

  /**
   * 设置筛选条件
   */
  const setFilters = useCallback((newFilters: TemplateFilters) => {
    setFiltersState(newFilters)
    // 筛选条件变化时，重置到第一页
    setPage(1)
    setTemplates([])
  }, [])

  /**
   * 创建模板
   */
  const createTemplate = useCallback(async (data: TemplateFormData): Promise<TripTemplate> => {
    try {
      const token = await getToken()

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '创建模板失败')
      }

      const result = await response.json()

      // 刷新列表
      await refresh()

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建模板失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [getToken, refresh])

  /**
   * 从行程创建模板
   */
  const createFromTrip = useCallback(async (
    tripId: string,
    data: Omit<TemplateFormData, 'itinerary_template'>
  ): Promise<TripTemplate> => {
    try {
      const token = await getToken()

      const response = await fetch('/api/templates/from-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trip_id: tripId,
          ...data,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '从行程创建模板失败')
      }

      const result = await response.json()

      // 刷新列表
      await refresh()

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '从行程创建模板失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [getToken, refresh])

  /**
   * 更新模板
   */
  const updateTemplate = useCallback(async (
    id: string,
    data: UpdateTemplateParams
  ): Promise<TripTemplate> => {
    try {
      const token = await getToken()

      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '更新模板失败')
      }

      const result = await response.json()

      // 更新本地列表
      setTemplates(prev => prev.map(t =>
        t.id === id
          ? { ...t, name: result.data.name, category: result.data.category, updated_at: result.data.updated_at }
          : t
      ))

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新模板失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [getToken])

  /**
   * 删除模板
   */
  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    try {
      const token = await getToken()

      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok && response.status !== 204) {
        const data = await response.json()
        throw new Error(data.message || '删除模板失败')
      }

      // 从列表中移除
      setTemplates(prev => prev.filter(t => t.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除模板失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [getToken])

  /**
   * 获取模板详情
   */
  const getTemplate = useCallback(async (id: string): Promise<TripTemplate | null> => {
    try {
      const token = await getToken()

      const response = await fetch(`/api/templates/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '获取模板详情失败')
      }

      const result = await response.json()
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取模板详情失败')
      return null
    }
  }, [getToken])

  /**
   * 应用模板创建新行程
   */
  const applyTemplate = useCallback(async (id: string): Promise<{ trip_id: string }> => {
    try {
      const token = await getToken()

      const response = await fetch(`/api/templates/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '应用模板失败')
      }

      const result = await response.json()

      // 增加使用次数（本地更新）
      setTemplates(prev => prev.map(t =>
        t.id === id ? { ...t, use_count: t.use_count + 1 } : t
      ))

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '应用模板失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [getToken])

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 初始加载
  const initializedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    if (autoLoad) {
      fetchTemplates(1, false)
      initializedRef.current = true
    }

    return () => {
      mountedRef.current = false
    }
  }, []) // 只在挂载时执行一次

  // 筛选条件变化时重新加载（跳过初始化）
  useEffect(() => {
    if (initializedRef.current && autoLoad) {
      fetchTemplates(1, false)
    }
  }, [filters]) // 只监听 filters 变化

  return {
    templates,
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
    createTemplate,
    createFromTrip,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    applyTemplate,
    clearError,
  }
}

// ============================================================================
// 单条模板详情 Hook
// ============================================================================

export interface UseTemplateDetailOptions {
  /** 模板 ID */
  id: string
  /** 自动加载 */
  autoLoad?: boolean
}

export interface UseTemplateDetailReturn {
  /** 模板详情 */
  template: TripTemplate | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 刷新 */
  refresh: () => Promise<void>
}

export function useTemplateDetail(options: UseTemplateDetailOptions): UseTemplateDetailReturn {
  const { id, autoLoad = true } = options

  const [template, setTemplate] = useState<TripTemplate | null>(null)
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

      const response = await fetch(`/api/templates/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '获取模板详情失败')
      }

      const result = await response.json()

      if (mountedRef.current) {
        setTemplate(result.data)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : '获取模板详情失败')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [id])

  useEffect(() => {
    mountedRef.current = true

    if (autoLoad && id) {
      refresh()
    }

    return () => {
      mountedRef.current = false
    }
  }, [id, autoLoad, refresh])

  return {
    template,
    isLoading,
    error,
    refresh,
  }
}

export default useTemplates
