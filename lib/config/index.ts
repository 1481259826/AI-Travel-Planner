/**
 * 配置模块统一导出
 */

export { appConfig, type AppConfig, type SupabaseConfig, type AIModelConfig, type VoiceConfig, type MapConfig, type FeatureFlags } from './app.config'

export {
  DATE_FORMATS,
  TRIP_STATUS,
  TRIP_STATUS_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ICONS,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_ICONS,
  TRANSPORTATION_METHODS,
  TRANSPORTATION_METHOD_LABELS,
  TRANSPORTATION_METHOD_ICONS,
  MAP_CONSTANTS,
  API_RATE_LIMITS,
  PAGINATION,
  VALIDATION_RULES,
  FILE_UPLOAD_LIMITS,
  CACHE_DURATIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  AI_MODELS,
  getDefaultModel,
  getModelById,
  type TripStatus,
  type ExpenseCategory,
  type ActivityType,
  type TransportationMethod,
  type AIModel,
} from './constants'

// 默认导出（向后兼容）
import config from './app.config'
export default config
