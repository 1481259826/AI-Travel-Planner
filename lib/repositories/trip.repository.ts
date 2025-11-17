/**
 * Trip Repository
 * 负责 trips 表的数据访问操作
 */

import { BaseRepository } from './base.repository'
import type { Trip, TripInsert, TripUpdate } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export class TripRepository extends BaseRepository<Trip, TripInsert, TripUpdate> {
  protected tableName = 'trips'

  constructor(supabaseClient: SupabaseClient) {
    super({ supabaseClient })
  }

  /**
   * 根据用户 ID 获取所有行程
   * 按创建时间倒序排列
   */
  async findByUserId(userId: string): Promise<Trip[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to find trips by user_id: ${error.message}`)
    }

    return (data as Trip[]) || []
  }

  /**
   * 根据分享 token 获取行程
   */
  async findByShareToken(token: string): Promise<Trip | null> {
    const { data, error } = await this.table
      .select('*')
      .eq('share_token', token)
      .eq('is_public', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to find trip by share_token: ${error.message}`)
    }

    return data as Trip
  }

  /**
   * 根据状态获取行程
   */
  async findByStatus(userId: string, status: Trip['status']): Promise<Trip[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to find trips by status: ${error.message}`)
    }

    return (data as Trip[]) || []
  }

  /**
   * 根据日期范围获取行程
   */
  async findByDateRange(userId: string, startDate: string, endDate: string): Promise<Trip[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('user_id', userId)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date', { ascending: true })

    if (error) {
      throw new Error(`Failed to find trips by date range: ${error.message}`)
    }

    return (data as Trip[]) || []
  }

  /**
   * 搜索行程（根据目的地或出发地）
   */
  async search(userId: string, query: string): Promise<Trip[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('user_id', userId)
      .or(`destination.ilike.%${query}%,origin.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search trips: ${error.message}`)
    }

    return (data as Trip[]) || []
  }

  /**
   * 获取用户的正在进行的行程
   */
  async findOngoingTrips(userId: string): Promise<Trip[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.table
      .select('*')
      .eq('user_id', userId)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })

    if (error) {
      throw new Error(`Failed to find ongoing trips: ${error.message}`)
    }

    return (data as Trip[]) || []
  }

  /**
   * 获取用户的即将开始的行程
   */
  async findUpcomingTrips(userId: string, limit: number = 10): Promise<Trip[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.table
      .select('*')
      .eq('user_id', userId)
      .gt('start_date', today)
      .order('start_date', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to find upcoming trips: ${error.message}`)
    }

    return (data as Trip[]) || []
  }

  /**
   * 统计用户的行程数量（按状态）
   */
  async countByStatus(userId: string): Promise<Record<Trip['status'], number>> {
    const statuses: Trip['status'][] = ['draft', 'planned', 'ongoing', 'completed']
    const counts: Record<Trip['status'], number> = {
      draft: 0,
      planned: 0,
      ongoing: 0,
      completed: 0,
    }

    await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await this.table
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', status)

        if (error) {
          throw new Error(`Failed to count trips by status: ${error.message}`)
        }

        counts[status] = count ?? 0
      })
    )

    return counts
  }

  /**
   * 更新行程状态
   */
  async updateStatus(id: string, status: Trip['status']): Promise<Trip> {
    const { data, error } = await this.table
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update trip status: ${error.message}`)
    }

    return data as Trip
  }

  /**
   * 生成并设置分享 token
   */
  async generateShareToken(id: string): Promise<{ token: string; trip: Trip }> {
    const token = crypto.randomUUID()

    const { data, error } = await this.table
      .update({
        share_token: token,
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to generate share token: ${error.message}`)
    }

    return { token, trip: data as Trip }
  }

  /**
   * 取消分享
   */
  async revokeShareToken(id: string): Promise<Trip> {
    const { data, error } = await this.table
      .update({
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to revoke share token: ${error.message}`)
    }

    return data as Trip
  }
}
