/**
 * 行程生成历史记录 - 服务层
 * 提供 CRUD 操作和业务逻辑
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type {
  TripGenerationRecord,
  TripHistoryListItem,
  TripResultSummary,
  HistoryStatus,
  CreateHistoryParams,
  UpdateHistoryParams,
  ListHistoryParams,
  ListHistoryResponse,
  DBTripGenerationHistory,
} from './types'
import type { TripFormData } from '@/lib/chat'

// ============================================================================
// 辅助函数：数据转换
// ============================================================================

/**
 * 将数据库记录转换为完整历史记录
 */
function mapToRecord(data: DBTripGenerationHistory): TripGenerationRecord {
  const formData = data.form_data as unknown as TripFormData
  return {
    id: data.id,
    userId: data.user_id,
    sessionId: data.session_id || undefined,
    tripId: data.trip_id || undefined,
    formData: {
      destination: formData.destination || '',
      startDate: formData.startDate || '',
      endDate: formData.endDate || '',
      budget: formData.budget || 0,
      travelers: formData.travelers || 1,
      origin: formData.origin,
      preferences: formData.preferences,
      accommodation_preference: formData.accommodation_preference,
      transport_preference: formData.transport_preference,
      special_requirements: formData.special_requirements,
    },
    status: data.status,
    resultSummary: data.result_summary as unknown as TripResultSummary | undefined,
    errorMessage: data.error_message || undefined,
    startedAt: data.started_at,
    completedAt: data.completed_at || undefined,
    generationDurationMs: data.generation_duration_ms || undefined,
    workflowVersion: data.workflow_version,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * 将数据库记录转换为列表项
 */
function mapToListItem(data: DBTripGenerationHistory): TripHistoryListItem {
  const formData = data.form_data as unknown as TripFormData
  return {
    id: data.id,
    destination: formData.destination || '',
    startDate: formData.startDate || '',
    endDate: formData.endDate || '',
    budget: formData.budget || 0,
    travelers: formData.travelers || 1,
    status: data.status,
    generationDurationMs: data.generation_duration_ms || undefined,
    tripId: data.trip_id || undefined,
    createdAt: data.created_at,
  }
}

// ============================================================================
// 服务类
// ============================================================================

/**
 * 行程历史记录服务
 */
export class TripHistoryService {
  /**
   * 创建历史记录
   * @returns 新创建的记录 ID
   */
  static async create(
    supabase: SupabaseClient,
    params: CreateHistoryParams
  ): Promise<string> {
    const { userId, sessionId, formData, workflowVersion = 'v2' } = params

    logger.info('创建行程生成历史记录', {
      userId,
      sessionId,
      destination: formData.destination,
    })

    const { data, error } = await supabase
      .from('trip_generation_history')
      .insert({
        user_id: userId,
        session_id: sessionId || null,
        form_data: formData,
        status: 'generating' as HistoryStatus,
        workflow_version: workflowVersion,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      logger.error('创建历史记录失败', error as Error)
      throw error
    }

    logger.info('历史记录创建成功', { historyId: data.id })
    return data.id
  }

  /**
   * 更新历史记录（完成/失败）
   */
  static async update(
    supabase: SupabaseClient,
    id: string,
    params: UpdateHistoryParams
  ): Promise<void> {
    const { status, tripId, resultSummary, errorMessage, generationDurationMs } = params

    logger.info('更新行程生成历史记录', { id, status })

    const updateData: Record<string, unknown> = {
      status,
    }

    if (tripId !== undefined) {
      updateData.trip_id = tripId
    }

    if (resultSummary !== undefined) {
      updateData.result_summary = resultSummary
    }

    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage
    }

    if (generationDurationMs !== undefined) {
      updateData.generation_duration_ms = generationDurationMs
    }

    // 设置完成时间
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('trip_generation_history')
      .update(updateData)
      .eq('id', id)

    if (error) {
      logger.error('更新历史记录失败', error as Error)
      throw error
    }

    logger.info('历史记录更新成功', { id, status })
  }

  /**
   * 获取单条历史记录详情
   */
  static async getById(
    supabase: SupabaseClient,
    id: string,
    userId: string
  ): Promise<TripGenerationRecord | null> {
    const { data, error } = await supabase
      .from('trip_generation_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 记录不存在
        return null
      }
      logger.error('获取历史记录失败', error as Error)
      throw error
    }

    return mapToRecord(data as DBTripGenerationHistory)
  }

  /**
   * 获取历史记录列表（分页、筛选）
   */
  static async list(
    supabase: SupabaseClient,
    userId: string,
    params: ListHistoryParams = {}
  ): Promise<ListHistoryResponse> {
    const {
      page = 1,
      pageSize = 20,
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params

    // 构建查询
    let query = supabase
      .from('trip_generation_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // 应用筛选条件
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.destination) {
      // 使用 JSONB 字段的模糊搜索
      query = query.ilike('form_data->>destination', `%${filters.destination}%`)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    // 排序
    const sortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // 分页
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      logger.error('获取历史记录列表失败', error as Error)
      throw error
    }

    return {
      records: (data || []).map((item) => mapToListItem(item as DBTripGenerationHistory)),
      total: count || 0,
      page,
      pageSize,
    }
  }

  /**
   * 删除历史记录
   */
  static async delete(
    supabase: SupabaseClient,
    id: string,
    userId: string
  ): Promise<void> {
    logger.info('删除行程生成历史记录', { id, userId })

    const { error } = await supabase
      .from('trip_generation_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      logger.error('删除历史记录失败', error as Error)
      throw error
    }

    logger.info('历史记录删除成功', { id })
  }

  /**
   * 批量删除历史记录
   */
  static async deleteMany(
    supabase: SupabaseClient,
    ids: string[],
    userId: string
  ): Promise<number> {
    if (ids.length === 0) return 0

    logger.info('批量删除行程生成历史记录', { count: ids.length, userId })

    const { error, count } = await supabase
      .from('trip_generation_history')
      .delete({ count: 'exact' })
      .in('id', ids)
      .eq('user_id', userId)

    if (error) {
      logger.error('批量删除历史记录失败', error as Error)
      throw error
    }

    logger.info('批量删除完成', { deletedCount: count })
    return count || 0
  }

  /**
   * 获取用户历史记录统计
   */
  static async getStats(
    supabase: SupabaseClient,
    userId: string
  ): Promise<{
    total: number
    completed: number
    failed: number
    avgDuration: number
  }> {
    const { data, error } = await supabase
      .from('trip_generation_history')
      .select('status, generation_duration_ms')
      .eq('user_id', userId)

    if (error) {
      logger.error('获取统计信息失败', error as Error)
      throw error
    }

    const records = data || []
    const total = records.length
    const completed = records.filter((r) => r.status === 'completed').length
    const failed = records.filter((r) => r.status === 'failed').length

    const durations = records
      .filter((r) => r.generation_duration_ms != null)
      .map((r) => r.generation_duration_ms as number)

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

    return {
      total,
      completed,
      failed,
      avgDuration,
    }
  }
}

// ============================================================================
// 便捷函数（向后兼容）
// ============================================================================

/**
 * 创建历史记录
 */
export async function createTripHistory(
  supabase: SupabaseClient,
  params: CreateHistoryParams
): Promise<string> {
  return TripHistoryService.create(supabase, params)
}

/**
 * 更新历史记录
 */
export async function updateTripHistory(
  supabase: SupabaseClient,
  id: string,
  params: UpdateHistoryParams
): Promise<void> {
  return TripHistoryService.update(supabase, id, params)
}

/**
 * 获取历史记录详情
 */
export async function getTripHistoryById(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<TripGenerationRecord | null> {
  return TripHistoryService.getById(supabase, id, userId)
}

/**
 * 获取历史记录列表
 */
export async function listTripHistory(
  supabase: SupabaseClient,
  userId: string,
  params?: ListHistoryParams
): Promise<ListHistoryResponse> {
  return TripHistoryService.list(supabase, userId, params)
}

/**
 * 删除历史记录
 */
export async function deleteTripHistory(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<void> {
  return TripHistoryService.delete(supabase, id, userId)
}
