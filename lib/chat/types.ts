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
