/**
 * 模板服务层
 * 提供模板的 CRUD 操作和业务逻辑
 * @module lib/templates/service
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  TripTemplate,
  TemplateListItem,
  CreateTemplateParams,
  CreateTemplateFromTripParams,
  UpdateTemplateParams,
  ListTemplatesParams,
  ListTemplatesResponse,
  ApplyTemplateResult,
  DBTemplate,
  TemplateFormData,
} from './types'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './types'

/**
 * 模板服务类
 * 提供模板的 CRUD 操作
 */
export class TemplateService {
  // ====================================================================
  // 创建模板
  // ====================================================================

  /**
   * 创建新模板
   */
  static async create(
    supabase: SupabaseClient,
    userId: string,
    params: CreateTemplateParams
  ): Promise<TripTemplate> {
    const { name, description, category, tags, formData, sourceTripId } = params

    const insertData = {
      user_id: userId,
      name,
      description: description || null,
      category: category || null,
      tags: tags || [],
      destination: formData.destination,
      duration_days: formData.durationDays,
      budget: formData.budget,
      travelers: formData.travelers,
      origin: formData.origin || null,
      preferences: formData.preferences || [],
      accommodation_preference: formData.accommodation_preference || null,
      transport_preference: formData.transport_preference || null,
      special_requirements: formData.special_requirements || null,
      source_trip_id: sourceTripId || null,
    }

    const { data, error } = await supabase
      .from('templates')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('创建模板失败:', error)
      throw new Error(`创建模板失败: ${error.message}`)
    }

    return this.toTemplate(data as DBTemplate)
  }

  /**
   * 从已有行程创建模板
   */
  static async createFromTrip(
    supabase: SupabaseClient,
    userId: string,
    params: CreateTemplateFromTripParams
  ): Promise<TripTemplate> {
    const { tripId, name, description, category, tags } = params

    // 1. 获取行程数据
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single()

    if (tripError || !trip) {
      throw new Error('行程不存在或无权访问')
    }

    // 2. 计算行程天数
    const startDate = new Date(trip.start_date)
    const endDate = new Date(trip.end_date)
    const durationDays =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 3. 构建模板表单数据
    const formData: TemplateFormData = {
      destination: trip.destination,
      durationDays,
      budget: Number(trip.budget),
      travelers: trip.travelers,
      origin: trip.origin || undefined,
      preferences: trip.preferences || undefined,
      accommodation_preference: trip.accommodation_preference || undefined,
      transport_preference: trip.transport_preference || undefined,
      special_requirements: trip.special_requirements || undefined,
    }

    // 4. 创建模板
    return this.create(supabase, userId, {
      name,
      description,
      category,
      tags,
      formData,
      sourceTripId: tripId,
    })
  }

  // ====================================================================
  // 查询模板
  // ====================================================================

  /**
   * 获取模板列表
   */
  static async list(
    supabase: SupabaseClient,
    userId: string,
    params: ListTemplatesParams = {}
  ): Promise<ListTemplatesResponse> {
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params

    const effectivePageSize = Math.min(pageSize, MAX_PAGE_SIZE)
    const offset = (page - 1) * effectivePageSize

    // 构建查询
    let query = supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // 应用筛选
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.destination) {
      query = query.ilike('destination', `%${filters.destination}%`)
    }

    if (filters.query) {
      // 全文搜索：名称、描述、目的地
      query = query.or(
        `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,destination.ilike.%${filters.query}%`
      )
    }

    // 应用排序
    const sortColumn = this.getSortColumn(sortBy)
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // 应用分页
    query = query.range(offset, offset + effectivePageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('获取模板列表失败:', error)
      throw new Error(`获取模板列表失败: ${error.message}`)
    }

    return {
      templates: ((data as DBTemplate[]) || []).map(this.toListItem),
      total: count || 0,
      page,
      pageSize: effectivePageSize,
    }
  }

  /**
   * 获取单个模板详情
   */
  static async get(
    supabase: SupabaseClient,
    userId: string,
    templateId: string
  ): Promise<TripTemplate | null> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 记录不存在
        return null
      }
      console.error('获取模板失败:', error)
      throw new Error(`获取模板失败: ${error.message}`)
    }

    return this.toTemplate(data as DBTemplate)
  }

  /**
   * 按名称搜索模板（用于对话中的模糊匹配）
   */
  static async searchByName(
    supabase: SupabaseClient,
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<TemplateListItem[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .or(`name.ilike.%${query}%,destination.ilike.%${query}%`)
      .order('use_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('搜索模板失败:', error)
      throw new Error(`搜索模板失败: ${error.message}`)
    }

    return ((data as DBTemplate[]) || []).map(this.toListItem)
  }

  // ====================================================================
  // 更新模板
  // ====================================================================

  /**
   * 更新模板
   */
  static async update(
    supabase: SupabaseClient,
    userId: string,
    templateId: string,
    params: UpdateTemplateParams
  ): Promise<TripTemplate> {
    const updateData: Record<string, unknown> = {}

    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description || null
    if (params.category !== undefined) updateData.category = params.category || null
    if (params.tags !== undefined) updateData.tags = params.tags || []

    // 展开 formData 到数据库字段
    if (params.formData) {
      const fd = params.formData
      if (fd.destination !== undefined) updateData.destination = fd.destination
      if (fd.durationDays !== undefined) updateData.duration_days = fd.durationDays
      if (fd.budget !== undefined) updateData.budget = fd.budget
      if (fd.travelers !== undefined) updateData.travelers = fd.travelers
      if (fd.origin !== undefined) updateData.origin = fd.origin || null
      if (fd.preferences !== undefined) updateData.preferences = fd.preferences || []
      if (fd.accommodation_preference !== undefined)
        updateData.accommodation_preference = fd.accommodation_preference || null
      if (fd.transport_preference !== undefined)
        updateData.transport_preference = fd.transport_preference || null
      if (fd.special_requirements !== undefined)
        updateData.special_requirements = fd.special_requirements || null
    }

    // 如果没有任何更新字段，直接返回现有数据
    if (Object.keys(updateData).length === 0) {
      const existing = await this.get(supabase, userId, templateId)
      if (!existing) {
        throw new Error('模板不存在')
      }
      return existing
    }

    const { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('更新模板失败:', error)
      throw new Error(`更新模板失败: ${error.message}`)
    }

    return this.toTemplate(data as DBTemplate)
  }

  /**
   * 记录模板使用（增加使用次数）
   */
  static async recordUsage(
    supabase: SupabaseClient,
    userId: string,
    templateId: string
  ): Promise<void> {
    // 尝试使用 RPC 函数
    const { error: rpcError } = await supabase.rpc('increment_template_use_count', {
      template_id: templateId,
      p_user_id: userId,
    })

    if (rpcError) {
      // 降级处理：直接更新
      console.warn('RPC 调用失败，使用直接更新:', rpcError.message)

      // 先获取当前值
      const { data: current } = await supabase
        .from('templates')
        .select('use_count')
        .eq('id', templateId)
        .eq('user_id', userId)
        .single()

      if (current) {
        await supabase
          .from('templates')
          .update({
            use_count: (current.use_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', templateId)
          .eq('user_id', userId)
      }
    }
  }

  // ====================================================================
  // 删除模板
  // ====================================================================

  /**
   * 删除模板
   */
  static async delete(
    supabase: SupabaseClient,
    userId: string,
    templateId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId)

    if (error) {
      console.error('删除模板失败:', error)
      throw new Error(`删除模板失败: ${error.message}`)
    }
  }

  // ====================================================================
  // 应用模板
  // ====================================================================

  /**
   * 应用模板 - 转换为 TripFormData
   * 根据用户提供的日期计算实际的 startDate 和 endDate
   */
  static async apply(
    supabase: SupabaseClient,
    userId: string,
    templateId: string,
    startDate?: string // 可选：用户指定的开始日期
  ): Promise<ApplyTemplateResult> {
    const template = await this.get(supabase, userId, templateId)

    if (!template) {
      return {
        success: false,
        message: '模板不存在或无权访问',
      }
    }

    // 计算日期
    let calculatedStartDate = startDate
    let calculatedEndDate: string | undefined

    if (startDate) {
      const start = new Date(startDate)
      const end = new Date(start)
      end.setDate(end.getDate() + template.formData.durationDays - 1)
      calculatedEndDate = end.toISOString().split('T')[0]
    }

    // 构建表单数据
    const formData = {
      destination: template.formData.destination,
      budget: template.formData.budget,
      travelers: template.formData.travelers,
      origin: template.formData.origin,
      preferences: template.formData.preferences,
      accommodation_preference: template.formData.accommodation_preference,
      transport_preference: template.formData.transport_preference,
      special_requirements: template.formData.special_requirements,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
    }

    // 记录使用（异步，不阻塞）
    this.recordUsage(supabase, userId, templateId).catch((err) => {
      console.error('记录模板使用失败:', err)
    })

    return {
      success: true,
      formData,
      template,
    }
  }

  // ====================================================================
  // 辅助方法
  // ====================================================================

  /**
   * 获取排序字段映射
   */
  private static getSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      createdAt: 'created_at',
      useCount: 'use_count',
      name: 'name',
      lastUsedAt: 'last_used_at',
    }
    return mapping[sortBy] || 'created_at'
  }

  /**
   * 数据库记录转换为完整模板对象
   */
  private static toTemplate(db: DBTemplate): TripTemplate {
    return {
      id: db.id,
      userId: db.user_id,
      name: db.name,
      description: db.description || undefined,
      category: db.category || undefined,
      tags: db.tags || undefined,
      formData: {
        destination: db.destination,
        durationDays: db.duration_days,
        budget: Number(db.budget),
        travelers: db.travelers,
        origin: db.origin || undefined,
        preferences: db.preferences || undefined,
        accommodation_preference: db.accommodation_preference || undefined,
        transport_preference: db.transport_preference || undefined,
        special_requirements: db.special_requirements || undefined,
      },
      useCount: db.use_count,
      lastUsedAt: db.last_used_at || undefined,
      sourceTripId: db.source_trip_id || undefined,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    }
  }

  /**
   * 数据库记录转换为列表项
   */
  private static toListItem(db: DBTemplate): TemplateListItem {
    return {
      id: db.id,
      name: db.name,
      description: db.description || undefined,
      category: db.category || undefined,
      tags: db.tags || undefined,
      destination: db.destination,
      durationDays: db.duration_days,
      budget: Number(db.budget),
      travelers: db.travelers,
      useCount: db.use_count,
      lastUsedAt: db.last_used_at || undefined,
      createdAt: db.created_at,
    }
  }
}
