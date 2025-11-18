/**
 * 数据库类型定义模块
 *
 * 职责：
 * - 重新导出 Supabase 数据库类型
 * - 提供类型安全的数据库操作
 * - 集中管理所有数据库相关类型
 */

// ==================== 数据库表类型 ====================

export type {
  Profile,
  Trip,
  TripStatus,
  Expense,
  ApiKey,
  ApiKeyService,
} from '@/types/supabase'

// ==================== 数据库操作类型 ====================

export type {
  ProfileInsert,
  ProfileUpdate,
  TripInsert,
  TripUpdate,
  ExpenseInsert,
  ExpenseUpdate,
  ApiKeyInsert,
  ApiKeyUpdate,
} from '@/types/supabase'

// ==================== Supabase 响应类型 ====================

export type {
  SupabaseSuccess,
  SupabaseError,
  SupabaseResponse,
  SupabaseSingleResponse,
  SupabaseArrayResponse,
} from '@/types/supabase'

// ==================== 数据库表名映射 ====================

export { DATABASE_TABLES } from '@/types/supabase'
export type { DatabaseTable } from '@/types/supabase'

// ==================== 查询过滤器类型 ====================

export type {
  TripFilter,
  ExpenseFilter,
  ApiKeyFilter,
} from '@/types/supabase'

// ==================== 扩展的数据库类型 ====================

export type {
  TripWithExpenses,
  TripWithProfile,
  ExpenseStats,
} from '@/types/supabase'

// ==================== 数据库函数返回类型 ====================

export type { ShareToken } from '@/types/supabase'

// ==================== 索引字段提示 ====================

export type { IndexedFields } from '@/types/supabase'

// ==================== 认证上下文类型 ====================

export type { AuthContext } from '@/types/supabase'
