/**
 * 数据库模块统一导出
 *
 * 提供清晰的模块化数据库访问接口：
 * - 客户端初始化（client）
 * - 认证操作（auth）
 * - 数据库类型（schema）
 *
 * @example
 * ```typescript
 * // 导入客户端
 * import { supabase, createClient } from '@/lib/database'
 *
 * // 导入认证函数
 * import { signIn, signOut } from '@/lib/database'
 *
 * // 导入类型
 * import type { Trip, TripInsert } from '@/lib/database'
 * ```
 */

// ==================== 客户端模块 ====================

export {
  supabase,
  createClient,
  createServerSupabaseClient,
  createAdminClient,
} from './client'

// ==================== 认证模块 ====================

export {
  auth,
  signUp,
  signIn,
  signOut,
  getUser,
  getSession,
  onAuthStateChange,
} from './auth'

// ==================== CRUD 操作模块 ====================

export { db } from './crud'

// ==================== 类型定义模块 ====================

// 数据库表类型
export type {
  Profile,
  Trip,
  TripStatus,
  Expense,
  ApiKey,
  ApiKeyService,
} from './schema'

// 数据库操作类型
export type {
  ProfileInsert,
  ProfileUpdate,
  TripInsert,
  TripUpdate,
  ExpenseInsert,
  ExpenseUpdate,
  ApiKeyInsert,
  ApiKeyUpdate,
} from './schema'

// Supabase 响应类型
export type {
  SupabaseSuccess,
  SupabaseError,
  SupabaseResponse,
  SupabaseSingleResponse,
  SupabaseArrayResponse,
} from './schema'

// 数据库表名映射
export { DATABASE_TABLES } from './schema'
export type { DatabaseTable } from './schema'

// 查询过滤器类型
export type {
  TripFilter,
  ExpenseFilter,
  ApiKeyFilter,
} from './schema'

// 扩展的数据库类型
export type {
  TripWithExpenses,
  TripWithProfile,
  ExpenseStats,
} from './schema'

// 数据库函数返回类型
export type { ShareToken } from './schema'

// 索引字段提示
export type { IndexedFields } from './schema'

// 认证上下文类型
export type { AuthContext } from './schema'
