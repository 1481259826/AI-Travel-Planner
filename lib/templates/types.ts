/**
 * 旅行模板功能 - 类型定义
 * @module lib/templates/types
 */

// ============================================================================
// 枚举类型
// ============================================================================

/**
 * 模板分类
 */
export type TemplateCategory =
  | 'business'   // 商务出行
  | 'leisure'    // 休闲度假
  | 'family'     // 亲子游
  | 'adventure'  // 探险
  | 'culture'    // 文化之旅
  | 'custom'     // 自定义

/**
 * 住宿偏好
 */
export type AccommodationPreference = 'budget' | 'mid' | 'luxury'

/**
 * 交通偏好
 */
export type TransportPreference = 'public' | 'driving' | 'mixed'

// ============================================================================
// 数据模型
// ============================================================================

/**
 * 数据库模板记录（原始格式）
 */
export interface DBTemplate {
  id: string
  user_id: string
  name: string
  description: string | null
  category: TemplateCategory | null
  tags: string[] | null
  destination: string
  duration_days: number
  budget: number
  travelers: number
  origin: string | null
  preferences: string[] | null
  accommodation_preference: AccommodationPreference | null
  transport_preference: TransportPreference | null
  special_requirements: string | null
  use_count: number
  last_used_at: string | null
  source_trip_id: string | null
  created_at: string
  updated_at: string
}

/**
 * 模板表单数据（可复用部分）
 * 不包含具体日期，由用户使用时填写
 */
export interface TemplateFormData {
  destination: string
  durationDays: number  // 建议天数
  budget: number
  travelers: number
  origin?: string
  preferences?: string[]
  accommodation_preference?: AccommodationPreference
  transport_preference?: TransportPreference
  special_requirements?: string
}

/**
 * 完整模板（详情/编辑使用）
 */
export interface TripTemplate {
  id: string
  userId: string

  // 元数据
  name: string
  description?: string
  category?: TemplateCategory
  tags?: string[]

  // 表单数据
  formData: TemplateFormData

  // 使用统计
  useCount: number
  lastUsedAt?: string

  // 来源行程
  sourceTripId?: string

  // 时间戳
  createdAt: string
  updatedAt: string
}

/**
 * 模板列表项（简化版，列表展示用）
 */
export interface TemplateListItem {
  id: string
  name: string
  description?: string
  category?: TemplateCategory
  tags?: string[]
  destination: string
  durationDays: number
  budget: number
  travelers: number
  useCount: number
  lastUsedAt?: string
  createdAt: string
}

// ============================================================================
// API 请求/响应类型
// ============================================================================

/**
 * 创建模板参数
 */
export interface CreateTemplateParams {
  name: string
  description?: string
  category?: TemplateCategory
  tags?: string[]
  formData: TemplateFormData
  sourceTripId?: string
}

/**
 * 从行程创建模板参数
 */
export interface CreateTemplateFromTripParams {
  tripId: string
  name: string
  description?: string
  category?: TemplateCategory
  tags?: string[]
}

/**
 * 更新模板参数
 */
export interface UpdateTemplateParams {
  name?: string
  description?: string
  category?: TemplateCategory
  tags?: string[]
  formData?: Partial<TemplateFormData>
}

/**
 * 列表筛选参数
 */
export interface TemplateFilters {
  category?: TemplateCategory | 'all'
  destination?: string  // 模糊搜索
  query?: string        // 全文搜索（名称、描述、目的地）
}

/**
 * 列表请求参数
 */
export interface ListTemplatesParams {
  page?: number
  pageSize?: number
  filters?: TemplateFilters
  sortBy?: 'createdAt' | 'useCount' | 'name' | 'lastUsedAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 列表响应
 */
export interface ListTemplatesResponse {
  templates: TemplateListItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 应用模板结果
 */
export interface ApplyTemplateResult {
  success: boolean
  formData?: {
    destination: string
    budget: number
    travelers: number
    origin?: string
    preferences?: string[]
    accommodation_preference?: AccommodationPreference
    transport_preference?: TransportPreference
    special_requirements?: string
    startDate?: string
    endDate?: string
  }
  template?: TripTemplate
  message?: string
}

// ============================================================================
// 常量配置
// ============================================================================

/**
 * 分类配置
 */
export const TEMPLATE_CATEGORY_CONFIG: Record<
  TemplateCategory,
  {
    label: string
    emoji: string
    color: string
  }
> = {
  business: {
    label: '商务出行',
    emoji: '💼',
    color: 'text-blue-600 dark:text-blue-400',
  },
  leisure: {
    label: '休闲度假',
    emoji: '🏖️',
    color: 'text-green-600 dark:text-green-400',
  },
  family: {
    label: '亲子游',
    emoji: '👨‍👩‍👧‍👦',
    color: 'text-orange-600 dark:text-orange-400',
  },
  adventure: {
    label: '探险',
    emoji: '🏔️',
    color: 'text-red-600 dark:text-red-400',
  },
  culture: {
    label: '文化之旅',
    emoji: '🏛️',
    color: 'text-purple-600 dark:text-purple-400',
  },
  custom: {
    label: '自定义',
    emoji: '✨',
    color: 'text-gray-600 dark:text-gray-400',
  },
}

/**
 * 获取分类标签
 */
export function getCategoryLabel(category: TemplateCategory | undefined): string {
  if (!category) return '未分类'
  return TEMPLATE_CATEGORY_CONFIG[category]?.label || category
}

/**
 * 获取分类 Emoji
 */
export function getCategoryEmoji(category: TemplateCategory | undefined): string {
  if (!category) return '📋'
  return TEMPLATE_CATEGORY_CONFIG[category]?.emoji || '📋'
}

/**
 * 默认分页配置
 */
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
