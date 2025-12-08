/**
 * 行程生成历史记录 - 类型定义
 */

import type { TripFormData } from '@/lib/chat'

// ============================================================================
// 状态类型
// ============================================================================

/**
 * 历史记录状态
 */
export type HistoryStatus = 'pending' | 'generating' | 'completed' | 'failed'

// ============================================================================
// 数据模型
// ============================================================================

/**
 * 生成结果摘要
 */
export interface TripResultSummary {
  /** 目的地 */
  destination: string
  /** 总天数 */
  totalDays: number
  /** 预算 */
  totalBudget: number
  /** 实际花费（预估） */
  actualCost?: number
  /** 景点数量 */
  attractionCount: number
  /** 酒店数量 */
  hotelCount: number
  /** 行程亮点（最多3个） */
  highlights: string[]
  /** 封面图片 URL */
  coverImage?: string
}

/**
 * 完整历史记录（详情页使用）
 */
export interface TripGenerationRecord {
  id: string
  userId: string
  sessionId?: string
  tripId?: string

  /** 生成时使用的表单参数 */
  formData: TripFormData

  /** 生成状态 */
  status: HistoryStatus

  /** 生成结果摘要 */
  resultSummary?: TripResultSummary

  /** 错误信息（失败时） */
  errorMessage?: string

  /** 开始时间 */
  startedAt: string

  /** 完成时间 */
  completedAt?: string

  /** 生成耗时（毫秒） */
  generationDurationMs?: number

  /** 工作流版本 */
  workflowVersion: string

  /** 创建时间 */
  createdAt: string

  /** 更新时间 */
  updatedAt: string
}

/**
 * 历史记录列表项（列表展示使用，简化版）
 */
export interface TripHistoryListItem {
  id: string
  /** 目的地 */
  destination: string
  /** 开始日期 */
  startDate: string
  /** 结束日期 */
  endDate: string
  /** 预算 */
  budget: number
  /** 出行人数 */
  travelers: number
  /** 生成状态 */
  status: HistoryStatus
  /** 生成耗时（毫秒） */
  generationDurationMs?: number
  /** 关联的行程 ID（成功时） */
  tripId?: string
  /** 创建时间 */
  createdAt: string
}

// ============================================================================
// API 请求/响应类型
// ============================================================================

/**
 * 筛选参数
 */
export interface HistoryFilters {
  /** 状态筛选 */
  status?: HistoryStatus | 'all'
  /** 目的地搜索 */
  destination?: string
  /** 日期范围 - 开始 */
  dateFrom?: string
  /** 日期范围 - 结束 */
  dateTo?: string
}

/**
 * 列表请求参数
 */
export interface ListHistoryParams {
  /** 页码（从1开始） */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 筛选条件 */
  filters?: HistoryFilters
  /** 排序字段 */
  sortBy?: 'createdAt' | 'destination' | 'status'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
}

/**
 * 列表响应
 */
export interface ListHistoryResponse {
  /** 记录列表 */
  records: TripHistoryListItem[]
  /** 总数 */
  total: number
  /** 当前页 */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 创建历史记录参数
 */
export interface CreateHistoryParams {
  userId: string
  sessionId?: string
  formData: TripFormData
  workflowVersion?: string
}

/**
 * 更新历史记录参数
 */
export interface UpdateHistoryParams {
  status: HistoryStatus
  tripId?: string
  resultSummary?: TripResultSummary
  errorMessage?: string
  generationDurationMs?: number
}

// ============================================================================
// 数据库模型（内部使用）
// ============================================================================

/**
 * 数据库记录格式
 */
export interface DBTripGenerationHistory {
  id: string
  user_id: string
  session_id: string | null
  trip_id: string | null
  form_data: Record<string, unknown>
  status: HistoryStatus
  result_summary: Record<string, unknown> | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  generation_duration_ms: number | null
  workflow_version: string
  created_at: string
  updated_at: string
}

// ============================================================================
// 常量
// ============================================================================

/**
 * 状态配置
 */
export const HISTORY_STATUS_CONFIG: Record<HistoryStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  pending: {
    label: '准备中',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  generating: {
    label: '生成中',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  completed: {
    label: '已完成',
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  failed: {
    label: '失败',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
}

/**
 * 默认分页配置
 */
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
