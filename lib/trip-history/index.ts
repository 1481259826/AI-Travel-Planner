/**
 * 行程生成历史记录模块
 * 统一导出
 */

// 类型导出
export type {
  HistoryStatus,
  TripResultSummary,
  TripGenerationRecord,
  TripHistoryListItem,
  HistoryFilters,
  ListHistoryParams,
  ListHistoryResponse,
  CreateHistoryParams,
  UpdateHistoryParams,
  DBTripGenerationHistory,
} from './types'

// 常量导出
export {
  HISTORY_STATUS_CONFIG,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './types'

// 服务导出
export {
  TripHistoryService,
  createTripHistory,
  updateTripHistory,
  getTripHistoryById,
  listTripHistory,
  deleteTripHistory,
} from './service'
