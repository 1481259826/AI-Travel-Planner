/**
 * Expense Repository
 * 负责 expenses 表的数据访问操作
 */

import { BaseRepository } from './base.repository'
import type { Expense, ExpenseInsert, ExpenseUpdate } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export class ExpenseRepository extends BaseRepository<Expense, ExpenseInsert, ExpenseUpdate> {
  protected tableName = 'expenses'

  constructor(supabaseClient: SupabaseClient) {
    super({ supabaseClient })
  }

  /**
   * 根据行程 ID 获取所有费用
   * 按日期倒序排列
   */
  async findByTripId(tripId: string): Promise<Expense[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('trip_id', tripId)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Failed to find expenses by trip_id: ${error.message}`)
    }

    return (data as Expense[]) || []
  }

  /**
   * 根据分类获取费用
   */
  async findByCategory(tripId: string, category: Expense['category']): Promise<Expense[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('trip_id', tripId)
      .eq('category', category)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Failed to find expenses by category: ${error.message}`)
    }

    return (data as Expense[]) || []
  }

  /**
   * 根据日期范围获取费用
   */
  async findByDateRange(tripId: string, startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('trip_id', tripId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Failed to find expenses by date range: ${error.message}`)
    }

    return (data as Expense[]) || []
  }

  /**
   * 计算行程总费用
   */
  async getTotalAmount(tripId: string): Promise<number> {
    const expenses = await this.findByTripId(tripId)
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  /**
   * 按分类统计费用
   */
  async getAmountByCategory(tripId: string): Promise<Record<Expense['category'], number>> {
    const expenses = await this.findByTripId(tripId)

    const categories: Expense['category'][] = [
      'accommodation',
      'transportation',
      'food',
      'attractions',
      'shopping',
      'other',
    ]

    const amounts: Record<Expense['category'], number> = {
      accommodation: 0,
      transportation: 0,
      food: 0,
      attractions: 0,
      shopping: 0,
      other: 0,
    }

    expenses.forEach((expense) => {
      amounts[expense.category] += expense.amount
    })

    return amounts
  }

  /**
   * 批量删除行程的所有费用
   */
  async deleteByTripId(tripId: string): Promise<void> {
    const { error } = await this.table.delete().eq('trip_id', tripId)

    if (error) {
      throw new Error(`Failed to delete expenses by trip_id: ${error.message}`)
    }
  }

  /**
   * 获取最近的费用记录
   */
  async findRecent(tripId: string, limit: number = 10): Promise<Expense[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to find recent expenses: ${error.message}`)
    }

    return (data as Expense[]) || []
  }

  /**
   * 搜索费用（根据描述）
   */
  async search(tripId: string, query: string): Promise<Expense[]> {
    const { data, error } = await this.table
      .select('*')
      .eq('trip_id', tripId)
      .ilike('description', `%${query}%`)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Failed to search expenses: ${error.message}`)
    }

    return (data as Expense[]) || []
  }
}
