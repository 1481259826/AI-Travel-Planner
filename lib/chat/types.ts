/**
 * 对话 Agent 类型定义
 * 用于支持对话式旅行规划功能
 */

import type { Trip, Itinerary } from '@/types'

// ============================================================
// 核心消息类型
// ============================================================

/**
 * 对话消息
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  metadata?: ChatMessageMetadata
}

/**
 * 消息元数据
 */
export interface ChatMessageMetadata {
  /** 工具调用列表 */
  toolCalls?: ToolCall[]
  /** 工具调用结果 */
  toolResults?: ToolResult[]
  /** 行程上下文 */
  tripContext?: {
    tripId?: string
    destination?: string
  }
  /** 思考过程（可选，用于调试） */
  reasoning?: string
  /** 消息来源模型 */
  model?: string
  /** Token 使用统计 */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// ============================================================
// 工具调用类型
// ============================================================

/**
 * 工具调用
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * 工具调用结果
 */
export interface ToolResult {
  toolCallId: string
  name: string
  result: unknown
  error?: string
}

/**
 * 工具定义（OpenAI 格式）
 */
export interface ChatTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameter>
      required?: string[]
    }
  }
}

/**
 * 工具参数定义
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
  required?: string[]
}

// ============================================================
// 会话类型
// ============================================================

/**
 * 对话会话
 */
export interface ChatSession {
  id: string
  userId: string
  tripId?: string
  title?: string
  context: ChatContext
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

/**
 * 对话上下文
 */
export interface ChatContext {
  /** 当前关联的行程 */
  currentTrip?: Trip
  /** 上次搜索结果缓存 */
  lastSearchResults?: {
    type: 'attractions' | 'hotels' | 'restaurants'
    items: unknown[]
    timestamp: number
  }
  /** 用户偏好 */
  userPreferences?: {
    budget?: number
    travelStyle?: string[]
    dietary?: string[]
  }
}

/**
 * 会话列表项（简化版，用于列表展示）
 */
export interface ChatSessionListItem {
  id: string
  title?: string
  tripId?: string
  tripDestination?: string
  lastMessage?: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

// ============================================================
// SSE 事件类型
// ============================================================

/**
 * Chat SSE 事件类型
 */
export type ChatStreamEventType =
  | 'start'        // 对话开始
  | 'delta'        // 文本增量
  | 'tool_call'    // 工具调用开始
  | 'tool_result'  // 工具调用结果
  | 'end'          // 对话结束
  | 'error'        // 错误

/**
 * Chat SSE 事件
 */
export interface ChatStreamEvent {
  type: ChatStreamEventType
  timestamp: number

  // start 事件
  sessionId?: string
  messageId?: string

  // delta 事件
  delta?: string

  // tool_call 事件
  toolCall?: ToolCall

  // tool_result 事件
  toolCallId?: string
  toolResult?: unknown

  // end 事件
  fullContent?: string
  fullMessage?: ChatMessage

  // error 事件
  error?: string
}

// ============================================================
// API 请求/响应类型
// ============================================================

/**
 * 发送消息请求
 */
export interface SendMessageRequest {
  /** 会话 ID（可选，不提供则创建新会话） */
  sessionId?: string
  /** 消息内容 */
  message: string
  /** 关联行程 ID（可选） */
  tripId?: string
}

/**
 * 创建会话请求
 */
export interface CreateSessionRequest {
  /** 关联行程 ID（可选） */
  tripId?: string
  /** 会话标题（可选） */
  title?: string
  /** 初始上下文（可选） */
  context?: Partial<ChatContext>
}

/**
 * 会话列表响应
 */
export interface SessionListResponse {
  sessions: ChatSessionListItem[]
  total: number
}

/**
 * 会话详情响应
 */
export interface SessionDetailResponse {
  session: ChatSession
  messages: ChatMessage[]
}

/**
 * 消息历史响应
 */
export interface MessageHistoryResponse {
  messages: ChatMessage[]
  hasMore: boolean
  nextCursor?: string
}

// ============================================================
// 工具执行相关类型
// ============================================================

/**
 * 行程修改操作类型
 */
export type ItineraryModifyOperation =
  | 'add_attraction'     // 添加景点
  | 'remove_attraction'  // 删除景点
  | 'reorder'           // 调整顺序
  | 'change_time'       // 修改时间
  | 'add_day'           // 增加一天
  | 'remove_day'        // 删除一天
  | 'change_hotel'      // 更换酒店
  | 'change_restaurant' // 更换餐厅

/**
 * 行程修改参数
 */
export interface ModifyItineraryParams {
  tripId: string
  operation: ItineraryModifyOperation
  params: {
    // add_attraction
    dayIndex?: number
    activityIndex?: number
    attraction?: {
      name: string
      location?: string
      duration?: string
      description?: string
    }

    // remove_attraction
    // dayIndex + activityIndex

    // reorder
    fromDay?: number
    fromIndex?: number
    toDay?: number
    toIndex?: number

    // change_time
    // dayIndex + activityIndex
    newTime?: string

    // add_day / remove_day
    // dayIndex

    // change_hotel / change_restaurant
    newName?: string
    newLocation?: string
  }
}

/**
 * 搜索景点参数
 */
export interface SearchAttractionsParams {
  city: string
  keywords?: string
  type?: '景点' | '美食' | '购物' | '娱乐' | '文化'
  limit?: number
}

/**
 * 搜索酒店参数
 */
export interface SearchHotelsParams {
  city: string
  priceRange?: 'budget' | 'mid' | 'luxury'
  type?: 'hotel' | 'hostel' | 'apartment' | 'resort'
  limit?: number
}

/**
 * 搜索餐厅参数
 */
export interface SearchRestaurantsParams {
  city: string
  cuisine?: string
  priceRange?: 'budget' | 'mid' | 'high'
  limit?: number
}

/**
 * 获取天气参数
 */
export interface GetWeatherParams {
  city: string
  date?: string
}

/**
 * 创建行程参数
 */
export interface CreateTripParams {
  destination: string
  startDate: string
  endDate: string
  budget: number
  travelers: number
  preferences?: string[]
}

// ============================================================
// 对话式行程生成相关类型
// ============================================================

/**
 * 行程表单数据
 */
export interface TripFormData {
  destination: string
  startDate: string
  endDate: string
  budget: number
  travelers: number
  origin?: string
  preferences?: string[]
  accommodation_preference?: 'budget' | 'mid' | 'luxury'
  transport_preference?: 'public' | 'driving' | 'mixed'
  special_requirements?: string
}

/**
 * 表单验证结果
 */
export interface TripFormValidation {
  isValid: boolean
  missingRequired: string[]
  missingOptional: string[]
}

/**
 * 行程表单状态（工具返回）
 */
export interface TripFormState {
  formData: Partial<TripFormData>
  validation: TripFormValidation
}

/**
 * 行程生成 SSE 事件类型
 */
export type TripGenerationEventType =
  | 'start'           // 开始生成
  | 'node_complete'   // 节点完成
  | 'progress'        // 进度更新
  | 'error'           // 错误
  | 'complete'        // 生成完成

/**
 * 行程生成 SSE 事件
 */
export interface TripGenerationEvent {
  type: TripGenerationEventType
  timestamp: number

  // start 事件
  sessionId?: string

  // node_complete 事件
  node?: string
  nodeName?: string

  // progress 事件
  progress?: number
  currentStage?: number
  totalStages?: number

  // error 事件
  error?: string

  // complete 事件
  tripId?: string
  destination?: string
  duration?: number
}

/**
 * 生成阶段信息
 */
export interface GenerationStage {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress?: number
  message?: string
}

/**
 * 行程生成状态（前端使用）
 */
export interface TripGenerationState {
  /** 待确认的表单数据 */
  pendingForm: Partial<TripFormData> | null
  /** 表单验证状态 */
  formValidation: TripFormValidation | null
  /** 模态框状态 */
  isModalOpen: boolean
  /** 生成进度 */
  generation: {
    isGenerating: boolean
    progress: number
    stages: GenerationStage[]
    currentStage: number
    error: string | null
    result: { tripId: string; destination?: string } | null
  }
}

/**
 * 扩展消息类型 - 用于特殊卡片渲染
 */
export type ChatMessageCardType =
  | 'trip_form_preview'         // 表单预览卡片
  | 'trip_generation_progress'  // 生成进度卡片
  | 'trip_completion'           // 生成完成卡片

/**
 * 表单预览卡片数据
 */
export interface TripFormPreviewData {
  cardType: 'trip_form_preview'
  formData: Partial<TripFormData>
  validation: TripFormValidation
}

/**
 * 生成进度卡片数据
 */
export interface TripGenerationProgressData {
  cardType: 'trip_generation_progress'
  sessionId: string
  stages: GenerationStage[]
}

/**
 * 生成完成卡片数据
 */
export interface TripCompletionData {
  cardType: 'trip_completion'
  tripId: string
  destination: string
  startDate: string
  endDate: string
  totalDays: number
}

/**
 * 特殊卡片数据联合类型
 */
export type ChatCardData =
  | TripFormPreviewData
  | TripGenerationProgressData
  | TripCompletionData

/**
 * 计算路线参数
 */
export interface CalculateRouteParams {
  origin: string
  destination: string
  mode?: 'driving' | 'transit' | 'walking'
}

/**
 * 获取推荐参数
 */
export interface GetRecommendationsParams {
  city: string
  category: 'attractions' | 'restaurants' | 'hotels' | 'activities'
  preferences?: string[]
  limit?: number
}

// ============================================================
// 数据库模型类型
// ============================================================

/**
 * 数据库会话记录
 */
export interface DBChatSession {
  id: string
  user_id: string
  trip_id: string | null
  title: string | null
  context: Record<string, unknown>
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

/**
 * 数据库消息记录
 */
export interface DBChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================================
// Agent 配置类型
// ============================================================

/**
 * Chat Agent 配置
 */
export interface ChatAgentConfig {
  /** AI API Key */
  apiKey: string
  /** AI API Base URL */
  baseURL: string
  /** 模型名称 */
  model?: string
  /** 最大 Token 数 */
  maxTokens?: number
  /** 温度参数 */
  temperature?: number
  /** 是否启用工具调用 */
  enableTools?: boolean
  /** 最大工具调用轮数 */
  maxToolRounds?: number
}

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  /** 用户 ID */
  userId: string
  /** 当前会话 */
  session: ChatSession
  /** Supabase 客户端 */
  supabase: unknown
  /** MCP 客户端 */
  mcpClient: unknown
}

// ============================================================
// 行程修改预览相关类型（对话式行程修改）
// ============================================================

/**
 * 行程修改操作类型（扩展版）
 * 包含基础修改、结构变更、智能重规划和完整重生成
 */
export type ItineraryModificationOperation =
  // 基础修改
  | 'add_attraction'
  | 'remove_attraction'
  | 'reorder'
  | 'change_time'
  | 'change_hotel'
  | 'change_restaurant'
  // 结构变更
  | 'add_day'
  | 'remove_day'
  | 'split_day'
  | 'merge_days'
  // 智能重规划
  | 'optimize_route'
  | 'replan_day'
  | 'adjust_for_weather'
  // 完整重生成
  | 'regenerate_day'
  | 'regenerate_trip_segment'

/**
 * 修改预览数据
 * 用于在用户确认前展示修改的预览
 */
export interface ModificationPreview {
  /** 唯一修改 ID，用于确认时引用 */
  id: string

  /** 行程 ID */
  tripId: string

  /** 操作类型 */
  operation: ItineraryModificationOperation

  /** 修改前的行程摘要 */
  before: {
    days: DayPlanSummary[]
    totalCost: number
  }

  /** 修改后的行程摘要 */
  after: {
    days: DayPlanSummary[]
    totalCost: number
  }

  /** 变更列表 */
  changes: ModificationChange[]

  /** 影响评估 */
  impact: {
    /** 受影响的天数（索引） */
    affectedDays: number[]
    /** 成本变化（正数表示增加） */
    costDelta: number
    /** 时间影响描述 */
    timeImpact: string
    /** 警告信息 */
    warnings: string[]
  }

  /** 创建时间 */
  createdAt: number

  /** 过期时间（10分钟后） */
  expiresAt: number

  /** 状态 */
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired'
}

/**
 * 单个变更项
 */
export interface ModificationChange {
  /** 变更类型 */
  type: 'add' | 'remove' | 'modify' | 'reorder'

  /** 天数索引 */
  dayIndex: number

  /** 项目类型 */
  itemType: 'attraction' | 'meal' | 'hotel' | 'transport'

  /** 项目名称 */
  itemName: string

  /** 变更描述 */
  description: string

  /** 变更前的值（可选） */
  before?: unknown

  /** 变更后的值（可选） */
  after?: unknown
}

/**
 * 天计划摘要（用于预览显示）
 */
export interface DayPlanSummary {
  day: number
  date: string
  activities: Array<{
    time: string
    name: string
    type: string
    /** 是否有变更 */
    isChanged?: boolean
    /** 变更类型 */
    changeType?: 'added' | 'removed' | 'modified'
  }>
}

/**
 * prepare_itinerary_modification 工具参数
 */
export interface PrepareItineraryModificationParams {
  /** 行程 ID */
  trip_id: string

  /** 操作类型 */
  operation: ItineraryModificationOperation

  /** 操作参数 */
  params: {
    // 目标定位
    day_index?: number
    activity_index?: number
    meal_index?: number  // 用于 change_restaurant

    // 新增项数据
    attraction?: {
      name: string
      location?: string
      duration?: string
      preferred_time?: string
      description?: string
    }

    // 更换酒店
    hotel?: {
      name: string
      type?: string
      price_per_night?: number
      description?: string
      location?: { lat: number; lng: number }
      photos?: string[]
    }

    // 更换餐厅
    restaurant?: {
      name: string
      cuisine?: string
      avg_price?: number
      recommended_dishes?: string[]
    }

    // 重排序参数
    from_day?: number
    from_index?: number
    to_day?: number
    to_index?: number

    // 时间修改
    new_time?: string

    // 重生成选项
    regeneration_hints?: {
      keep_attractions?: string[]    // 保留的景点
      exclude_attractions?: string[] // 排除的景点
      preferences?: string[]         // 新增偏好
      budget_adjustment?: number     // 预算调整
    }

    // 多天操作范围
    day_range?: {
      start_day: number
      end_day: number
    }
  }

  /** 修改原因（AI 上下文） */
  reason?: string
}

/**
 * confirm_itinerary_modification 工具参数
 */
export interface ConfirmItineraryModificationParams {
  /** 修改预览 ID */
  modification_id: string

  /** 用户调整（可选） */
  user_adjustments?: {
    // 允许在确认时微调
    time_adjustments?: Array<{
      day_index: number
      activity_index: number
      new_time: string
    }>
  }
}

/**
 * 修改预览卡片数据
 */
export interface ModificationPreviewData {
  cardType: 'modification_preview'
  preview: ModificationPreview
}

/**
 * 修改确认卡片数据
 */
export interface ModificationConfirmData {
  cardType: 'modification_confirm'
  success: boolean
  message: string
  tripId: string
}

/**
 * 扩展特殊卡片数据联合类型
 */
export type ChatCardDataExtended =
  | ChatCardData
  | ModificationPreviewData
  | ModificationConfirmData
