/**
 * 模板模块统一导出
 * @module lib/templates
 */

// 类型导出
export type {
  TemplateCategory,
  AccommodationPreference,
  TransportPreference,
  DBTemplate,
  TemplateFormData,
  TripTemplate,
  TemplateListItem,
  CreateTemplateParams,
  CreateTemplateFromTripParams,
  UpdateTemplateParams,
  TemplateFilters,
  ListTemplatesParams,
  ListTemplatesResponse,
  ApplyTemplateResult,
} from './types'

// 常量和工具函数导出
export {
  TEMPLATE_CATEGORY_CONFIG,
  getCategoryLabel,
  getCategoryEmoji,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './types'

// 服务层导出
export { TemplateService } from './service'
