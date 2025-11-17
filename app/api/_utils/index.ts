/**
 * API 工具函数统一导出
 */

export {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
} from './response'
export type { SuccessResponse, ErrorResponse, PaginatedResponse } from './response'

export {
  validateRequest,
  validateRequestSync,
  parseAndValidateJson,
  parseSearchParams,
  // Schema 导出
  paginationSchema,
  dateRangeSchema,
  uuidSchema,
  generateItinerarySchema,
  updateTripSchema,
  createExpenseSchema,
  updateExpenseSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  addApiKeySchema,
  updateApiKeySchema,
} from './validation'

export {
  correctItineraryCoordinates,
} from './coordinate-fixer'

export {
  createAIClient,
  buildItineraryPrompt,
  generateItinerary,
} from './ai-helper'
export type { AIClientConfig } from './ai-helper'
