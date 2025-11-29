/**
 * LangGraph 状态定义
 * 定义多智能体系统的共享状态 Schema
 */

import { Annotation } from '@langchain/langgraph'
import type {
  TripFormData,
  Itinerary,
  DayPlan,
  Activity,
  Meal,
  Location,
  Accommodation,
} from '@/types'

// ============================================================================
// 策略标签类型
// ============================================================================

/**
 * 天气策略标签
 * 用于指导行程规划的环境上下文
 */
export type StrategyTag =
  | 'indoor_priority' // 优先室内活动
  | 'outdoor_friendly' // 适合户外
  | 'rain_prepared' // 需带雨具
  | 'cold_weather' // 天气寒冷
  | 'hot_weather' // 天气炎热

// ============================================================================
// 天气相关类型
// ============================================================================

/**
 * 单日天气预报
 */
export interface DayForecast {
  date: string
  dayweather: string // 白天天气
  nightweather: string // 夜间天气
  daytemp: string // 白天温度
  nighttemp: string // 夜间温度
  daywind: string // 白天风向
  nightwind: string // 夜间风向
  daypower: string // 白天风力
  nightpower: string // 夜间风力
}

/**
 * 天气 Agent 输出
 */
export interface WeatherOutput {
  forecasts: DayForecast[] // 天气预报数据
  strategyTags: StrategyTag[] // 策略标签
  clothingAdvice: string // 穿衣建议
  warnings: string[] // 天气警告
}

// ============================================================================
// 草稿行程类型
// ============================================================================

/**
 * 景点时间槽（草稿阶段）
 */
export interface AttractionSlot {
  time: string // 开始时间
  name: string // 景点名称
  duration: string // 游玩时长
  location?: Location // 位置信息（可选，由 Planner 填充）
  type?: Activity['type'] // 活动类型
}

/**
 * 餐饮时间槽（草稿阶段）
 */
export interface MealSlot {
  time: string // 用餐时间
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' // 餐次类型
  cuisine?: string // 菜系偏好（可选）
}

/**
 * 草稿行程 - 每日计划
 */
export interface DraftDay {
  day: number
  date: string
  attractions: AttractionSlot[] // 景点列表（无详细信息）
  mealSlots: MealSlot[] // 餐饮时间槽
}

/**
 * 草稿行程 - 核心规划 Agent 输出
 */
export interface DraftItinerary {
  days: DraftDay[]
  totalAttractions: number
  totalMeals: number
  estimatedAttractionCost?: number // 门票估算（可选）
}

// ============================================================================
// 景点详情增强类型
// ============================================================================

/**
 * 景点详细信息（增强后）
 */
export interface EnrichedAttraction {
  name: string // 景点名称
  address?: string // 地址
  location?: Location // 位置坐标
  type?: Activity['type'] // 活动类型
  // 增强字段
  ticketPrice?: number // 门票价格（元）
  ticketInfo?: string // 门票信息描述
  openingHours?: string // 开放时间
  rating?: number // 评分（1-5）
  photos?: string[] // 照片 URL 列表
  tel?: string // 联系电话
  website?: string // 官方网站
  description?: string // 景点介绍
  recommendedDuration?: string // 建议游玩时长
  tips?: string[] // 游玩贴士
  tags?: string[] // 标签（如：世界遗产、5A 景区等）
  poiId?: string // 高德 POI ID
  category?: string // POI 类别
}

/**
 * 景点增强 Agent 输出
 */
export interface AttractionEnrichmentResult {
  enrichedAttractions: EnrichedAttraction[] // 增强后的景点列表
  totalAttractions: number // 总景点数
  enrichedCount: number // 成功增强的景点数
  totalTicketCost: number // 预估门票总费用
  errors?: string[] // 增强过程中的错误信息
}

// ============================================================================
// 资源 Agent 输出类型
// ============================================================================

/**
 * 酒店推荐结果
 */
export interface HotelRecommendation extends Accommodation {
  // 继承 Accommodation 的所有字段
  distanceFromCenter?: number // 距离行程中心点的距离（km）
  matchScore?: number // 匹配分数（0-1）
}

/**
 * 住宿 Agent 输出
 */
export interface AccommodationResult {
  recommendations: HotelRecommendation[] // 推荐酒店列表
  selected: HotelRecommendation | null // 选中的酒店
  totalCost: number // 总住宿成本
  centroidLocation?: Location // 行程地理中心点
}

/**
 * 交通模式
 */
export type TransportMode = 'driving' | 'transit' | 'walking' | 'cycling'

/**
 * 交通路段
 */
export interface TransportSegment {
  from: Location // 起点
  to: Location // 终点
  mode: TransportMode // 交通方式
  duration: number // 时长（分钟）
  distance: number // 距离（米）
  cost: number // 费用（元）
  polyline?: string // 路线轨迹（高德 polyline）
}

/**
 * 交通 Agent 输出
 */
export interface TransportResult {
  segments: TransportSegment[] // 所有交通路段
  totalTime: number // 总时长（分钟）
  totalDistance: number // 总距离（米）
  totalCost: number // 总费用（元）
  recommendedModes: TransportMode[] // 推荐的交通方式
}

/**
 * 餐厅推荐
 */
export interface RestaurantRecommendation extends Meal {
  // 继承 Meal 的所有字段
  rating?: number // 评分
  photos?: string[] // 照片
  openHours?: string // 营业时间
  phone?: string // 电话
}

/**
 * 餐饮 Agent 输出
 */
export interface DiningResult {
  recommendations: RestaurantRecommendation[] // 推荐餐厅列表
  totalCost: number // 总餐饮成本
}

// ============================================================================
// 预算审计类型
// ============================================================================

/**
 * 预算反馈行动
 */
export type BudgetFeedbackAction =
  | 'downgrade_hotel' // 降级酒店
  | 'reduce_attractions' // 减少景点
  | 'cheaper_transport' // 更便宜的交通
  | 'adjust_meals' // 调整餐饮

/**
 * 预算反馈
 */
export interface BudgetFeedback {
  action: BudgetFeedbackAction
  targetReduction: number // 目标减少金额（元）
  suggestion: string // 建议文本
}

/**
 * 预算审计结果
 */
export interface BudgetResult {
  totalCost: number // 总成本
  budgetUtilization: number // 预算利用率（0-1+）
  isWithinBudget: boolean // 是否在预算内
  costBreakdown: {
    accommodation: number
    transport: number
    dining: number
    attractions: number
  }
  feedback?: BudgetFeedback // 超预算时的反馈
}

// ============================================================================
// Agent 执行元信息
// ============================================================================

/**
 * MCP 工具调用记录
 */
export interface ToolCall {
  tool: string // 工具名称
  input: Record<string, unknown> // 输入参数
  output: unknown // 输出结果
  duration: number // 执行时长（ms）
  timestamp: number // 时间戳
}

/**
 * Agent 执行记录
 */
export interface AgentExecution {
  agent: string // Agent 名称
  startTime: number // 开始时间
  endTime: number // 结束时间
  duration: number // 执行时长（ms）
  status: 'success' | 'failed' | 'skipped' // 状态
  toolCalls: ToolCall[] // 工具调用列表
  error?: string // 错误信息
}

/**
 * Agent 错误
 */
export interface AgentError {
  agent: string
  error: string
  timestamp: number
}

// ============================================================================
// LangGraph 状态定义
// ============================================================================

/**
 * TripState Annotation
 * 使用 LangGraph 的 Annotation API 定义类型安全的状态
 */
export const TripStateAnnotation = Annotation.Root({
  // --------------------------------------------------------------------------
  // 用户输入
  // --------------------------------------------------------------------------
  userInput: Annotation<TripFormData>(),

  // --------------------------------------------------------------------------
  // 环境上下文
  // --------------------------------------------------------------------------
  weather: Annotation<WeatherOutput | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  // --------------------------------------------------------------------------
  // 草稿行程
  // --------------------------------------------------------------------------
  draftItinerary: Annotation<DraftItinerary | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  // --------------------------------------------------------------------------
  // 资源数据（并行 Agent 结果）
  // --------------------------------------------------------------------------
  accommodation: Annotation<AccommodationResult | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  transport: Annotation<TransportResult | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  dining: Annotation<DiningResult | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  attractionEnrichment: Annotation<AttractionEnrichmentResult | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  // --------------------------------------------------------------------------
  // 预算审计
  // --------------------------------------------------------------------------
  budgetResult: Annotation<BudgetResult | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  retryCount: Annotation<number>({
    default: () => 0,
    reducer: (current, delta) => current + delta,
  }),

  // --------------------------------------------------------------------------
  // 最终输出
  // --------------------------------------------------------------------------
  finalItinerary: Annotation<Itinerary | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),

  // --------------------------------------------------------------------------
  // 元信息
  // --------------------------------------------------------------------------
  meta: Annotation<{
    startTime: number
    agentExecutions: AgentExecution[]
    errors: AgentError[]
  }>({
    default: () => ({
      startTime: Date.now(),
      agentExecutions: [],
      errors: [],
    }),
    reducer: (current, updates) => ({
      ...current,
      ...updates,
    }),
  }),
})

/**
 * TripState 类型
 * 从 Annotation 推导出的状态类型
 */
export type TripState = typeof TripStateAnnotation.State

/**
 * TripState 更新类型
 * Agent 节点函数的返回类型
 */
export type TripStateUpdate = typeof TripStateAnnotation.Update
