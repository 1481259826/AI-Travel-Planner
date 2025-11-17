/**
 * Supabase 数据库类型定义
 * 基于 database/init.sql 生成
 * 用于类型安全的数据库操作
 */

import { Itinerary, ExpenseCategoryDB } from './index'

// ==================== 数据库表类型 ====================

/**
 * Profiles 表（用户配置和设置）
 * 扩展 auth.users，存储用户个性化配置
 */
export interface Profile {
  id: string // UUID，关联 auth.users(id)
  email: string
  name: string | null
  avatar_url: string | null
  theme: 'light' | 'dark' | 'system'
  default_model: string | null
  default_budget: number | null // DECIMAL(10, 2)
  default_origin: string | null
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * Trips 表（旅行行程）
 * 核心业务表，存储用户创建的旅行计划
 */
export interface Trip {
  id: string // UUID
  user_id: string // UUID，关联 profiles(id)
  origin: string | null
  destination: string
  start_date: string // DATE（ISO 8601 格式：YYYY-MM-DD）
  end_date: string // DATE
  start_time: string | null // TIME（HH:MM:SS）
  end_time: string | null // TIME
  budget: number // DECIMAL(10, 2)
  travelers: number // INTEGER
  adult_count: number // INTEGER
  child_count: number // INTEGER
  preferences: string[] // TEXT[]
  itinerary: Itinerary | null // JSONB
  status: TripStatus
  share_token: string | null // 唯一分享 token
  is_public: boolean // 是否公开
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * 行程状态枚举
 */
export type TripStatus = 'draft' | 'planned' | 'ongoing' | 'completed'

/**
 * Expenses 表（开支记录）
 * 费用追踪功能，记录旅行中的各项支出
 */
export interface Expense {
  id: string // UUID
  trip_id: string // UUID，关联 trips(id)
  category: ExpenseCategoryDB
  amount: number // DECIMAL(10, 2)
  description: string | null
  date: string // DATE（ISO 8601 格式：YYYY-MM-DD）
  receipt_url: string | null
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * API Keys 表（API 密钥管理）
 * 存储用户自定义的 API Keys（加密存储）
 */
export interface ApiKey {
  id: string // UUID
  user_id: string // UUID，关联 profiles(id)
  service: ApiKeyService
  key_name: string // 用户给 API Key 起的名字
  encrypted_key: string // AES-256 加密后的密钥
  key_prefix: string // 密钥前缀（用于显示，如 "sk-***"）
  base_url: string | null // 自定义 API Base URL
  extra_config: string | null // 额外配置（JSON 字符串）
  is_active: boolean // 是否启用
  last_used_at: string | null // 最后使用时间
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * API Key 服务类型枚举
 */
export type ApiKeyService = 'deepseek' | 'modelscope' | 'map' | 'voice'

// ==================== 数据库操作类型 ====================

/**
 * 插入 Profile 时的输入类型
 * 排除自动生成的字段（created_at, updated_at）
 */
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}

/**
 * 更新 Profile 时的输入类型
 * 所有字段都是可选的，只更新提供的字段
 */
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>

/**
 * 插入 Trip 时的输入类型
 */
export type TripInsert = Omit<Trip, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

/**
 * 更新 Trip 时的输入类型
 */
export type TripUpdate = Partial<Omit<Trip, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

/**
 * 插入 Expense 时的输入类型
 */
export type ExpenseInsert = Omit<Expense, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

/**
 * 更新 Expense 时的输入类型
 */
export type ExpenseUpdate = Partial<Omit<Expense, 'id' | 'trip_id' | 'created_at' | 'updated_at'>>

/**
 * 插入 ApiKey 时的输入类型
 */
export type ApiKeyInsert = Omit<ApiKey, 'id' | 'created_at' | 'updated_at' | 'last_used_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
  last_used_at?: string
}

/**
 * 更新 ApiKey 时的输入类型
 */
export type ApiKeyUpdate = Partial<
  Omit<ApiKey, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>

// ==================== Supabase 响应类型 ====================

/**
 * Supabase 查询成功响应
 */
export interface SupabaseSuccess<T> {
  data: T
  error: null
}

/**
 * Supabase 查询失败响应
 */
export interface SupabaseError {
  data: null
  error: {
    message: string
    details: string
    hint: string
    code: string
  }
}

/**
 * Supabase 查询响应（成功或失败）
 */
export type SupabaseResponse<T> = SupabaseSuccess<T> | SupabaseError

/**
 * Supabase 单条记录响应
 */
export type SupabaseSingleResponse<T> = SupabaseResponse<T | null>

/**
 * Supabase 多条记录响应
 */
export type SupabaseArrayResponse<T> = SupabaseResponse<T[]>

// ==================== 数据库表名映射 ====================

/**
 * 数据库表名常量
 * 用于类型安全的表引用
 */
export const DATABASE_TABLES = {
  PROFILES: 'profiles',
  TRIPS: 'trips',
  EXPENSES: 'expenses',
  API_KEYS: 'api_keys',
} as const

/**
 * 数据库表名类型
 */
export type DatabaseTable = (typeof DATABASE_TABLES)[keyof typeof DATABASE_TABLES]

// ==================== RLS 策略类型 ====================

/**
 * 认证用户上下文
 * 用于 RLS 策略验证
 */
export interface AuthContext {
  uid: string | null // 当前登录用户 ID
}

// ==================== 查询过滤器类型 ====================

/**
 * Trip 查询过滤器
 */
export interface TripFilter {
  user_id?: string
  status?: TripStatus
  is_public?: boolean
  share_token?: string
  start_date_from?: string
  start_date_to?: string
}

/**
 * Expense 查询过滤器
 */
export interface ExpenseFilter {
  trip_id?: string
  category?: ExpenseCategoryDB
  date_from?: string
  date_to?: string
  amount_min?: number
  amount_max?: number
}

/**
 * ApiKey 查询过滤器
 */
export interface ApiKeyFilter {
  user_id?: string
  service?: ApiKeyService
  is_active?: boolean
}

// ==================== 扩展的数据库类型 ====================

/**
 * Trip 包含关联数据
 * 用于获取行程详情时关联查询费用记录
 */
export interface TripWithExpenses extends Trip {
  expenses: Expense[]
}

/**
 * Trip 包含用户信息
 * 用于公开分享页面显示创建者信息
 */
export interface TripWithProfile extends Trip {
  profile: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

/**
 * 费用统计数据
 * 用于费用分析图表
 */
export interface ExpenseStats {
  trip_id: string
  total_amount: number
  by_category: {
    category: ExpenseCategoryDB
    amount: number
    count: number
  }[]
  by_date: {
    date: string
    amount: number
  }[]
}

// ==================== 数据库函数返回类型 ====================

/**
 * generate_unique_share_token() 函数返回类型
 */
export type ShareToken = string

/**
 * update_updated_at_column() 触发器（内部使用，无需类型定义）
 */

// ==================== 索引字段提示 ====================

/**
 * 已索引的字段（优化查询性能）
 *
 * Profiles: email
 * Trips: user_id, status, start_date, share_token, is_public
 * Expenses: trip_id, date, category
 * ApiKeys: user_id, service, is_active
 */
export type IndexedFields = {
  profiles: 'email'
  trips: 'user_id' | 'status' | 'start_date' | 'share_token' | 'is_public'
  expenses: 'trip_id' | 'date' | 'category'
  api_keys: 'user_id' | 'service' | 'is_active'
}
