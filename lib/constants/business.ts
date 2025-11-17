/**
 * 业务相关常量
 * 统一管理行程、费用、预算等业务常量
 */

/**
 * 行程状态
 */
export const TRIP_STATUS = {
  DRAFT: 'draft',
  PLANNED: 'planned',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
} as const

export type TripStatus = typeof TRIP_STATUS[keyof typeof TRIP_STATUS]

/**
 * 行程状态中文名称
 */
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  [TRIP_STATUS.DRAFT]: '草稿',
  [TRIP_STATUS.PLANNED]: '已计划',
  [TRIP_STATUS.ONGOING]: '进行中',
  [TRIP_STATUS.COMPLETED]: '已完成',
}

/**
 * 费用类别
 */
export const EXPENSE_CATEGORY = {
  ACCOMMODATION: 'accommodation',
  TRANSPORTATION: 'transportation',
  FOOD: 'food',
  ATTRACTIONS: 'attractions',
  SHOPPING: 'shopping',
  OTHER: 'other',
} as const

export type ExpenseCategory = typeof EXPENSE_CATEGORY[keyof typeof EXPENSE_CATEGORY]

/**
 * 费用类别中文名称
 */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [EXPENSE_CATEGORY.ACCOMMODATION]: '住宿',
  [EXPENSE_CATEGORY.TRANSPORTATION]: '交通',
  [EXPENSE_CATEGORY.FOOD]: '餐饮',
  [EXPENSE_CATEGORY.ATTRACTIONS]: '景点',
  [EXPENSE_CATEGORY.SHOPPING]: '购物',
  [EXPENSE_CATEGORY.OTHER]: '其他',
}

/**
 * 预算级别
 */
export const BUDGET_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  LUXURY: 'luxury',
} as const

export type BudgetLevel = typeof BUDGET_LEVEL[keyof typeof BUDGET_LEVEL]

/**
 * 预算级别中文名称
 */
export const BUDGET_LEVEL_LABELS: Record<BudgetLevel, string> = {
  [BUDGET_LEVEL.LOW]: '经济',
  [BUDGET_LEVEL.MEDIUM]: '舒适',
  [BUDGET_LEVEL.HIGH]: '豪华',
  [BUDGET_LEVEL.LUXURY]: '奢华',
}

/**
 * 住宿类型
 */
export const ACCOMMODATION_TYPE = {
  HOTEL: 'hotel',
  HOSTEL: 'hostel',
  APARTMENT: 'apartment',
  RESORT: 'resort',
  GUESTHOUSE: 'guesthouse',
  OTHER: 'other',
} as const

export type AccommodationType = typeof ACCOMMODATION_TYPE[keyof typeof ACCOMMODATION_TYPE]

/**
 * 住宿类型中文名称
 */
export const ACCOMMODATION_TYPE_LABELS: Record<AccommodationType, string> = {
  [ACCOMMODATION_TYPE.HOTEL]: '酒店',
  [ACCOMMODATION_TYPE.HOSTEL]: '青年旅舍',
  [ACCOMMODATION_TYPE.APARTMENT]: '公寓',
  [ACCOMMODATION_TYPE.RESORT]: '度假村',
  [ACCOMMODATION_TYPE.GUESTHOUSE]: '民宿',
  [ACCOMMODATION_TYPE.OTHER]: '其他',
}

/**
 * 活动类型
 */
export const ACTIVITY_TYPE = {
  SIGHTSEEING: 'sightseeing',
  MUSEUM: 'museum',
  ADVENTURE: 'adventure',
  RELAXATION: 'relaxation',
  SHOPPING: 'shopping',
  DINING: 'dining',
  ENTERTAINMENT: 'entertainment',
  OTHER: 'other',
} as const

export type ActivityType = typeof ACTIVITY_TYPE[keyof typeof ACTIVITY_TYPE]

/**
 * 活动类型中文名称
 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ACTIVITY_TYPE.SIGHTSEEING]: '观光',
  [ACTIVITY_TYPE.MUSEUM]: '博物馆',
  [ACTIVITY_TYPE.ADVENTURE]: '探险',
  [ACTIVITY_TYPE.RELAXATION]: '休闲',
  [ACTIVITY_TYPE.SHOPPING]: '购物',
  [ACTIVITY_TYPE.DINING]: '美食',
  [ACTIVITY_TYPE.ENTERTAINMENT]: '娱乐',
  [ACTIVITY_TYPE.OTHER]: '其他',
}

/**
 * API Key 服务类型
 */
export const API_KEY_SERVICE = {
  DEEPSEEK: 'deepseek',
  MODELSCOPE: 'modelscope',
  MAP: 'map',
  VOICE: 'voice',
} as const

export type ApiKeyService = typeof API_KEY_SERVICE[keyof typeof API_KEY_SERVICE]

/**
 * API Key 服务中文名称
 */
export const API_KEY_SERVICE_LABELS: Record<ApiKeyService, string> = {
  [API_KEY_SERVICE.DEEPSEEK]: 'DeepSeek',
  [API_KEY_SERVICE.MODELSCOPE]: 'ModelScope',
  [API_KEY_SERVICE.MAP]: '高德地图',
  [API_KEY_SERVICE.VOICE]: '科大讯飞语音',
}

/**
 * 默认配置值
 */
export const DEFAULTS = {
  /** 默认行程天数 */
  TRIP_DAYS: 3,
  /** 默认人数 */
  TRAVELERS: 1,
  /** 默认预算级别 */
  BUDGET_LEVEL: BUDGET_LEVEL.MEDIUM,
  /** 默认地图缩放级别 */
  MAP_ZOOM: 12,
  /** 默认地图中心（北京天安门） */
  MAP_CENTER: [116.397428, 39.90923] as [number, number],
} as const

/**
 * 限制值
 */
export const LIMITS = {
  /** 最大行程天数 */
  MAX_TRIP_DAYS: 30,
  /** 最小行程天数 */
  MIN_TRIP_DAYS: 1,
  /** 最大人数 */
  MAX_TRAVELERS: 20,
  /** 最小人数 */
  MIN_TRAVELERS: 1,
  /** 最大预算（元） */
  MAX_BUDGET: 1000000,
  /** 最小预算（元） */
  MIN_BUDGET: 100,
  /** API Key 最大长度 */
  MAX_API_KEY_LENGTH: 500,
  /** 行程名称最大长度 */
  MAX_TRIP_NAME_LENGTH: 100,
} as const
