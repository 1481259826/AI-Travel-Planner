/**
 * 数据库 CRUD 操作
 *
 * 提供 Trips 和 Expenses 表的便捷操作方法
 *
 * @example
 * ```typescript
 * import { db } from '@/lib/database'
 *
 * // 获取用户所有行程
 * const { data, error } = await db.trips.getAll(userId)
 *
 * // 创建新行程
 * const { data: newTrip } = await db.trips.create({ ... })
 * ```
 */

import type {
  Trip,
  TripInsert,
  TripUpdate,
  Expense,
  ExpenseInsert,
  ExpenseUpdate,
  SupabaseSingleResponse,
  SupabaseArrayResponse,
} from '@/types/supabase'

import { supabase } from './client'

/**
 * 数据库操作对象
 *
 * 包含 Trips 和 Expenses 的 CRUD 操作
 */
export const db = {
  // Trips
  trips: {
    /**
     * 获取用户的所有行程
     * @param userId - 用户 ID
     */
    getAll: async (userId: string): Promise<SupabaseArrayResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      return { data: data || [], error } as SupabaseArrayResponse<Trip>
    },

    /**
     * 根据 ID 获取单个行程
     * @param id - 行程 ID
     */
    getById: async (id: string): Promise<SupabaseSingleResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error }
    },

    /**
     * 创建新行程
     * @param trip - 行程数据
     */
    create: async (trip: TripInsert): Promise<SupabaseSingleResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .insert(trip)
        .select()
        .single()
      return { data, error }
    },

    /**
     * 更新行程
     * @param id - 行程 ID
     * @param updates - 更新的字段
     */
    update: async (id: string, updates: TripUpdate): Promise<SupabaseSingleResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    },

    /**
     * 删除行程
     * @param id - 行程 ID
     */
    delete: async (id: string) => {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id)
      return { error }
    },
  },

  // Expenses
  expenses: {
    /**
     * 获取行程的所有费用记录
     * @param tripId - 行程 ID
     */
    getByTrip: async (tripId: string): Promise<SupabaseArrayResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false })
      return { data: data || [], error } as SupabaseArrayResponse<Expense>
    },

    /**
     * 根据 ID 获取单个费用记录
     * @param id - 费用 ID
     */
    getById: async (id: string): Promise<SupabaseSingleResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error }
    },

    /**
     * 创建新费用记录
     * @param expense - 费用数据
     */
    create: async (expense: ExpenseInsert): Promise<SupabaseSingleResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()
      return { data, error }
    },

    /**
     * 更新费用记录
     * @param id - 费用 ID
     * @param updates - 更新的字段
     */
    update: async (id: string, updates: ExpenseUpdate): Promise<SupabaseSingleResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    },

    /**
     * 删除费用记录
     * @param id - 费用 ID
     */
    delete: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      return { error }
    },
  },
}
