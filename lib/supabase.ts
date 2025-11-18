/**
 * Supabase 模块（向后兼容层）
 *
 * ⚠️ 弃用警告：此文件仅用于向后兼容，推荐使用新的模块化导入
 *
 * 旧的用法（仍然支持）：
 * ```typescript
 * import { supabase, auth, db } from '@/lib/supabase'
 * await auth.signIn('user@example.com', 'password')
 * await db.trips.getAll(userId)
 * ```
 *
 * 推荐的新用法：
 * ```typescript
 * import { supabase, signIn } from '@/lib/database'
 * await signIn('user@example.com', 'password')
 * ```
 *
 * 计划：一周后将逐步迁移所有代码到新模块，然后删除此文件
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

// ==================== 重新导出新模块 ====================

// 客户端
export {
  supabase,
  createClient,
  createServerSupabaseClient,
  createAdminClient,
} from '@/lib/database/client'

// 认证
export { auth } from '@/lib/database/auth'

// 类型
export type {
  Profile,
  TripStatus,
  ApiKey,
  ApiKeyService,
  ProfileInsert,
  ProfileUpdate,
  ApiKeyInsert,
  ApiKeyUpdate,
  SupabaseSuccess,
  SupabaseError,
  SupabaseResponse,
  TripFilter,
  ExpenseFilter,
  ApiKeyFilter,
  TripWithExpenses,
  TripWithProfile,
  ExpenseStats,
  ShareToken,
  IndexedFields,
  AuthContext,
} from '@/lib/database'

// ==================== 数据库 CRUD 操作（保留） ====================

import { supabase } from '@/lib/database/client'

/**
 * 数据库操作对象
 *
 * @deprecated 未来将拆分为独立的 repository 模块
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
