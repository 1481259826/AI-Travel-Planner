/**
 * 基础 Repository 抽象类
 * 提供通用的 CRUD 操作接口
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface RepositoryOptions {
  supabaseClient?: SupabaseClient
}

/**
 * 基础 Repository 接口
 * 所有具体 Repository 都应实现此接口
 */
export interface IRepository<T, TInsert = Partial<T>, TUpdate = Partial<T>> {
  /**
   * 根据 ID 获取单条记录
   */
  findById(id: string): Promise<T | null>

  /**
   * 获取所有记录（支持过滤条件）
   */
  findAll(filters?: Record<string, unknown>): Promise<T[]>

  /**
   * 创建新记录
   */
  create(data: TInsert): Promise<T>

  /**
   * 更新记录
   */
  update(id: string, data: TUpdate): Promise<T>

  /**
   * 删除记录
   */
  delete(id: string): Promise<void>

  /**
   * 批量创建
   */
  createMany(data: TInsert[]): Promise<T[]>

  /**
   * 检查记录是否存在
   */
  exists(id: string): Promise<boolean>

  /**
   * 统计记录数量
   */
  count(filters?: Record<string, unknown>): Promise<number>
}

/**
 * 基础 Repository 抽象类
 * 提供默认的 Supabase 客户端管理
 */
export abstract class BaseRepository<T, TInsert = Partial<T>, TUpdate = Partial<T>>
  implements IRepository<T, TInsert, TUpdate>
{
  protected supabase: SupabaseClient
  protected abstract tableName: string

  constructor(options?: RepositoryOptions) {
    if (options?.supabaseClient) {
      this.supabase = options.supabaseClient
    } else {
      // 默认使用服务端 Supabase 客户端
      // 子类可以在构造函数中传入自定义客户端
      throw new Error('Supabase client is required. Please pass it in options.')
    }
  }

  /**
   * 获取表的查询构建器
   */
  protected get table() {
    return this.supabase.from(this.tableName)
  }

  /**
   * 根据 ID 查找记录
   */
  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.table.select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 记录不存在
        return null
      }
      throw new Error(`Failed to find ${this.tableName} by id: ${error.message}`)
    }

    return data as T
  }

  /**
   * 查找所有记录（支持过滤）
   */
  async findAll(filters?: Record<string, unknown>): Promise<T[]> {
    let query = this.table.select('*')

    // 应用过滤条件
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to find all ${this.tableName}: ${error.message}`)
    }

    return (data as T[]) || []
  }

  /**
   * 创建记录
   */
  async create(data: TInsert): Promise<T> {
    const { data: created, error } = await this.table.insert(data).select().single()

    if (error) {
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`)
    }

    return created as T
  }

  /**
   * 更新记录
   */
  async update(id: string, data: TUpdate): Promise<T> {
    const { data: updated, error } = await this.table
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`)
    }

    return updated as T
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.table.delete().eq('id', id)

    if (error) {
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`)
    }
  }

  /**
   * 批量创建
   */
  async createMany(data: TInsert[]): Promise<T[]> {
    if (data.length === 0) {
      return []
    }

    const { data: created, error } = await this.table.insert(data).select()

    if (error) {
      throw new Error(`Failed to create many ${this.tableName}: ${error.message}`)
    }

    return (created as T[]) || []
  }

  /**
   * 检查记录是否存在
   */
  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.table.select('id', { count: 'exact', head: true }).eq('id', id)

    if (error) {
      throw new Error(`Failed to check existence of ${this.tableName}: ${error.message}`)
    }

    return (count ?? 0) > 0
  }

  /**
   * 统计记录数量
   */
  async count(filters?: Record<string, unknown>): Promise<number> {
    let query = this.table.select('*', { count: 'exact', head: true })

    // 应用过滤条件
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { count, error } = await query

    if (error) {
      throw new Error(`Failed to count ${this.tableName}: ${error.message}`)
    }

    return count ?? 0
  }
}
