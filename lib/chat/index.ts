/**
 * 对话 Agent 模块
 * 统一导出所有对话相关的类型、工具和类
 */

// 类型定义
export type {
  // 消息类型
  ChatMessage,
  ChatMessageMetadata,
  ToolCall,
  ToolResult,
  ChatTool,
  ToolParameter,

  // 会话类型
  ChatSession,
  ChatContext,
  ChatSessionListItem,

  // SSE 事件
  ChatStreamEventType,
  ChatStreamEvent,

  // API 请求/响应
  SendMessageRequest,
  CreateSessionRequest,
  SessionListResponse,
  SessionDetailResponse,
  MessageHistoryResponse,

  // 工具参数类型
  ItineraryModifyOperation,
  ModifyItineraryParams,
  SearchAttractionsParams,
  SearchHotelsParams,
  SearchRestaurantsParams,
  GetWeatherParams,
  CreateTripParams,
  CalculateRouteParams,
  GetRecommendationsParams,

  // 数据库类型
  DBChatSession,
  DBChatMessage,

  // 配置类型
  ChatAgentConfig,
  ToolExecutionContext,

  // 对话式行程生成类型
  TripFormData,
  TripFormValidation,
  TripFormState,
  TripGenerationEventType,
  TripGenerationEvent,
  GenerationStage,
  TripGenerationState,
  ChatMessageCardType,
  TripFormPreviewData,
  TripGenerationProgressData,
  TripCompletionData,
  ChatCardData,

  // 对话式行程修改类型
  ItineraryModificationOperation,
  ModificationPreview,
  ModificationChange,
  DayPlanSummary,
  PrepareItineraryModificationParams,
  ConfirmItineraryModificationParams,
  ModificationPreviewData,
  ModificationConfirmData,
  ChatCardDataExtended,
} from './types'

// 工具定义
export {
  CHAT_TOOLS,
  TOOL_DESCRIPTIONS,
  TOOL_ICONS,
  getToolDescription,
  getToolIcon,
  getOpenAITools,
} from './tools'

// 工具执行器
export { ToolExecutor } from './executor'

// Agent 类
export { TravelChatAgent, createChatAgent } from './agent'

// 修改缓存管理
export {
  modificationCache,
  generateModificationId,
  calculateExpiresAt,
} from './modification-cache'
