/**
 * 应用常量配置
 * 存放不依赖环境变量的常量
 */

/**
 * 日期格式常量
 */
export const DATE_FORMATS = {
  /** 标准日期格式: YYYY-MM-DD */
  STANDARD: 'YYYY-MM-DD',
  /** 显示日期格式: YYYY年MM月DD日 */
  DISPLAY: 'YYYY年MM月DD日',
  /** 时间格式: HH:mm:ss */
  TIME: 'HH:mm:ss',
  /** 日期时间格式: YYYY-MM-DD HH:mm:ss */
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  /** ISO 8601 格式 */
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const

/**
 * 行程状态
 */
export const TRIP_STATUS = {
  DRAFT: 'draft',
  PLANNED: 'planned',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
} as const

export type TripStatus = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS]

/**
 * 行程状态显示名称
 */
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft: '草稿',
  planned: '已计划',
  ongoing: '进行中',
  completed: '已完成',
}

/**
 * 费用分类
 */
export const EXPENSE_CATEGORIES = {
  ACCOMMODATION: 'accommodation',
  TRANSPORTATION: 'transportation',
  FOOD: 'food',
  ATTRACTIONS: 'attractions',
  SHOPPING: 'shopping',
  OTHER: 'other',
} as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[keyof typeof EXPENSE_CATEGORIES]

/**
 * 费用分类显示名称
 */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  accommodation: '住宿',
  transportation: '交通',
  food: '餐饮',
  attractions: '景点',
  shopping: '购物',
  other: '其他',
}

/**
 * 费用分类图标 (Emoji)
 */
export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  accommodation: '🏨',
  transportation: '🚗',
  food: '🍜',
  attractions: '🎫',
  shopping: '🛍️',
  other: '📝',
}

/**
 * 活动类型
 */
export const ACTIVITY_TYPES = {
  ATTRACTION: 'attraction',
  SHOPPING: 'shopping',
  ENTERTAINMENT: 'entertainment',
  RELAXATION: 'relaxation',
} as const

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES]

/**
 * 活动类型图标 (Emoji)
 */
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  attraction: '🎯',
  shopping: '🛍️',
  entertainment: '🎭',
  relaxation: '🧘',
}

/**
 * 交通方式
 */
export const TRANSPORTATION_METHODS = {
  FLIGHT: 'flight',
  TRAIN: 'train',
  BUS: 'bus',
  CAR: 'car',
  SUBWAY: 'subway',
  TAXI: 'taxi',
  WALK: 'walk',
  OTHER: 'other',
} as const

export type TransportationMethod = (typeof TRANSPORTATION_METHODS)[keyof typeof TRANSPORTATION_METHODS]

/**
 * 交通方式显示名称
 */
export const TRANSPORTATION_METHOD_LABELS: Record<TransportationMethod, string> = {
  flight: '飞机',
  train: '火车/高铁',
  bus: '巴士',
  car: '自驾',
  subway: '地铁',
  taxi: '出租车',
  walk: '步行',
  other: '其他',
}

/**
 * 交通方式图标 (Emoji)
 */
export const TRANSPORTATION_METHOD_ICONS: Record<TransportationMethod, string> = {
  flight: '✈️',
  train: '🚄',
  bus: '🚌',
  car: '🚗',
  subway: '🚇',
  taxi: '🚕',
  walk: '🚶',
  other: '🚀',
}

/**
 * 地图相关常量
 */
export const MAP_CONSTANTS = {
  /** 默认缩放级别 */
  DEFAULT_ZOOM: 12,
  /** 最小缩放级别 */
  MIN_ZOOM: 3,
  /** 最大缩放级别 */
  MAX_ZOOM: 18,
  /** 默认中心点（北京天安门） */
  DEFAULT_CENTER: [116.397428, 39.90923] as [number, number],
  /** 标记点击提示延迟（毫秒） */
  MARKER_TOOLTIP_DELAY: 300,
  /** 路线颜色（按天） */
  DAY_COLORS: [
    '#3b82f6', // blue-600
    '#10b981', // green-600
    '#f59e0b', // amber-600
    '#ef4444', // red-600
    '#8b5cf6', // violet-600
    '#ec4899', // pink-600
    '#14b8a6', // teal-600
    '#f97316', // orange-600
  ],
} as const

/**
 * API 限流常量
 */
export const API_RATE_LIMITS = {
  /** 地理编码 API 每批次最大调用次数 */
  GEOCODING_MAX_BATCH_SIZE: 30,
  /** 地理编码 API 请求间隔（毫秒） */
  GEOCODING_DELAY_MS: 300,
  /** 地理编码 API 最大重试次数 */
  GEOCODING_MAX_RETRIES: 2,
  /** AI 模型最大 token 数 */
  AI_MAX_TOKENS: 8000,
  /** AI 模型超时时间（毫秒） */
  AI_TIMEOUT_MS: 60000,
} as const

/**
 * 分页常量
 */
export const PAGINATION = {
  /** 默认每页数量 */
  DEFAULT_PAGE_SIZE: 10,
  /** 最大每页数量 */
  MAX_PAGE_SIZE: 100,
  /** 行程列表每页数量 */
  TRIPS_PER_PAGE: 12,
  /** 费用列表每页数量 */
  EXPENSES_PER_PAGE: 20,
} as const

/**
 * 验证规则
 */
export const VALIDATION_RULES = {
  /** 密码最小长度 */
  PASSWORD_MIN_LENGTH: 8,
  /** 密码最大长度 */
  PASSWORD_MAX_LENGTH: 128,
  /** 描述最大长度 */
  DESCRIPTION_MAX_LENGTH: 500,
  /** 行程名称最大长度 */
  TRIP_NAME_MAX_LENGTH: 100,
  /** 最小旅行人数 */
  MIN_TRAVELERS: 1,
  /** 最大旅行人数 */
  MAX_TRAVELERS: 100,
  /** 最小预算 */
  MIN_BUDGET: 0,
  /** 最大预算 */
  MAX_BUDGET: 999999999,
  /** 行程最小天数 */
  MIN_TRIP_DAYS: 1,
  /** 行程最大天数 */
  MAX_TRIP_DAYS: 365,
} as const

/**
 * 文件上传限制
 */
export const FILE_UPLOAD_LIMITS = {
  /** 单个文件最大大小（字节，10MB） */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** 允许的图片格式 */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  /** 允许的文档格式 */
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const,
} as const

/**
 * 缓存时间（秒）
 */
export const CACHE_DURATIONS = {
  /** 短期缓存（5分钟） */
  SHORT: 300,
  /** 中期缓存（30分钟） */
  MEDIUM: 1800,
  /** 长期缓存（1小时） */
  LONG: 3600,
  /** 超长期缓存（24小时） */
  EXTRA_LONG: 86400,
} as const

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  GENERIC: '操作失败，请稍后重试',
  NETWORK: '网络连接失败，请检查网络设置',
  UNAUTHORIZED: '未授权，请先登录',
  FORBIDDEN: '没有权限执行此操作',
  NOT_FOUND: '请求的资源不存在',
  VALIDATION: '输入数据验证失败',
  SERVER_ERROR: '服务器内部错误',
} as const

/**
 * 成功消息
 */
export const SUCCESS_MESSAGES = {
  SAVED: '保存成功',
  CREATED: '创建成功',
  UPDATED: '更新成功',
  DELETED: '删除成功',
  COPIED: '复制成功',
} as const

/**
 * AI 模型配置接口
 */
export interface AIModel {
  id: string
  name: string
  provider: 'deepseek' | 'modelscope'
  description: string
  maxTokens: number
  enabled: boolean
}

/**
 * 可用的 AI 模型配置
 */
export const AI_MODELS: AIModel[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'DeepSeek 对话模型，中文支持优秀',
    maxTokens: 8000,
    enabled: true,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    description: 'DeepSeek 推理模型，适合复杂逻辑推理',
    maxTokens: 8000,
    enabled: true,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen2.5 72B Instruct (ModelScope)',
    provider: 'modelscope',
    description: 'Qwen 2.5 72B 指令微调模型（ModelScope）',
    maxTokens: 8000,
    enabled: true,
  },
]

/**
 * 获取默认模型
 */
export const getDefaultModel = (): AIModel => {
  return AI_MODELS[0]
}

/**
 * 根据 ID 获取模型配置
 */
export const getModelById = (id: string): AIModel | undefined => {
  return AI_MODELS.find(model => model.id === id)
}
