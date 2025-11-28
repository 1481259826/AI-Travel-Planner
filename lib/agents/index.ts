/**
 * LangGraph 多智能体系统 - 统一导出
 * Phase 3: 专家 Agent 实现完成
 * Phase 5.1: 添加结果缓存支持
 * Phase 5.2: 添加 PostgreSQL Checkpointer 支持
 * Phase 5.3: 添加工作流追踪支持
 */

// ============================================================================
// 状态定义
// ============================================================================
export * from './state'

// ============================================================================
// 工作流
// ============================================================================
export {
  createTripPlanningWorkflow,
  createTripPlanningWorkflowAsync,
  getTripPlanningWorkflow,
  getTripPlanningWorkflowAsync,
  resetTripPlanningWorkflow,
  executeTripPlanningWorkflow,
  executeTripPlanningWorkflowWithPersistence,
  streamTripPlanningWorkflow,
  streamTripPlanningWorkflowWithPersistence,
  getWorkflowNodes,
} from './workflow'
export type { AIClientConfig, WorkflowConfig } from './workflow'

// ============================================================================
// Checkpointer
// ============================================================================
export {
  getCheckpointer,
  closeCheckpointer,
  cleanupOldCheckpoints,
  isCheckpointerInitialized,
  getCheckpointerType,
} from './checkpointer'
export type { CheckpointerType, CheckpointerConfig } from './checkpointer'

// ============================================================================
// Tracer (追踪器)
// ============================================================================
export {
  createTracer,
  getTracer,
  resetTracer,
  getDefaultTracerConfig,
  withTracing,
  withSpan,
  BaseTracer,
  ConsoleTracer,
  JsonTracer,
  LangSmithTracer,
  NoopTracer,
} from './tracer'
export type {
  TracerType,
  SpanType,
  SpanStatus,
  TraceSpan,
  TraceRecord,
  TracerConfig,
  Tracer,
} from './tracer'

// ============================================================================
// Agent 节点
// ============================================================================
export {
  createWeatherScoutAgent,
  createItineraryPlannerAgent,
  createAccommodationAgent,
  createTransportAgent,
  createDiningAgent,
  createBudgetCriticAgent,
  createFinalizeAgent,
} from './nodes'

// ============================================================================
// Agent Prompts
// ============================================================================
export {
  WEATHER_SCOUT_SYSTEM_PROMPT,
  buildWeatherScoutUserMessage,
  ITINERARY_PLANNER_SYSTEM_PROMPT,
  buildItineraryPlannerUserMessage,
  ACCOMMODATION_SYSTEM_PROMPT,
  buildAccommodationUserMessage,
  TRANSPORT_SYSTEM_PROMPT,
  buildTransportUserMessage,
  DINING_SYSTEM_PROMPT,
  buildDiningUserMessage,
  BUDGET_CRITIC_SYSTEM_PROMPT,
  buildBudgetCriticUserMessage,
  FINALIZE_SYSTEM_PROMPT,
  buildFinalizeUserMessage,
} from './prompts'

// ============================================================================
// MCP 客户端
// ============================================================================
export { MCPClient, getMCPClient, resetMCPClient } from './mcp-client'
export type {
  WeatherForecastResult,
  POI,
  POISearchResult,
  RouteResult,
  RouteStep,
  GeocodeResult,
  DistanceResult,
} from './mcp-client'

// ============================================================================
// 缓存
// ============================================================================
export {
  MemoryCache,
  getMCPCache,
  resetMCPCache,
  withCache,
  logCacheStats,
  CACHE_TTL,
} from './cache'
export type { CacheType } from './cache'

// ============================================================================
// 指标收集 (Metrics)
// ============================================================================
export {
  MetricsCollector,
  getMetricsCollector,
  resetMetricsCollector,
  createTimer,
  withAgentMetrics,
  withMCPToolMetrics,
} from './metrics'
export type {
  MetricsConfig,
  AgentExecutionRecord,
  WorkflowExecutionRecord,
  MCPToolCallRecord,
  CounterMetric,
  HistogramMetric,
  GaugeMetric,
} from './metrics'

// ============================================================================
// 使用示例
// ============================================================================

/*
// 基本用法（使用内存检查点）
import { executeTripPlanningWorkflow } from '@/lib/agents'

const userInput = {
  destination: '杭州',
  start_date: '2025-12-01',
  end_date: '2025-12-03',
  budget: 3000,
  travelers: 2,
  adult_count: 2,
  child_count: 0,
  preferences: ['文化历史', '自然风光'],
}

const result = await executeTripPlanningWorkflow(userInput)
console.log(result.finalItinerary)

// 使用 PostgreSQL 持久化（支持中断恢复）
import { executeTripPlanningWorkflowWithPersistence } from '@/lib/agents'

const result = await executeTripPlanningWorkflowWithPersistence(userInput, {
  thread_id: 'trip-123', // 自定义线程 ID，用于中断恢复
  config: {
    checkpointerType: 'postgres', // 使用 PostgreSQL 存储
  },
})

// 流式执行（用于实时进度反馈）
import { streamTripPlanningWorkflow } from '@/lib/agents'

for await (const event of streamTripPlanningWorkflow(userInput)) {
  console.log('Current node:', event.node)
  console.log('State:', event.state)
}

// 流式执行 + PostgreSQL 持久化
import { streamTripPlanningWorkflowWithPersistence } from '@/lib/agents'

for await (const event of streamTripPlanningWorkflowWithPersistence(userInput, {
  thread_id: 'trip-123',
})) {
  console.log('Current node:', event.node)
}

// 使用自定义配置
import { executeTripPlanningWorkflow } from '@/lib/agents'

const result = await executeTripPlanningWorkflow(userInput, {
  config: {
    ai: {
      apiKey: 'your-api-key',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-chat',
    },
    maxRetries: 3,
  },
})

// 使用 MCP 客户端
import { getMCPClient } from '@/lib/agents'

const mcpClient = getMCPClient()
const weather = await mcpClient.getWeatherForecast('杭州')
console.log(weather)

const pois = await mcpClient.searchPOI({ keywords: '西湖', city: '杭州' })
console.log(pois)

// 获取工作流节点列表（用于进度显示）
import { getWorkflowNodes } from '@/lib/agents'

const nodes = getWorkflowNodes()
// [
//   { id: 'weather_scout', name: '天气分析', description: '...' },
//   { id: 'itinerary_planner', name: '行程规划', description: '...' },
//   ...
// ]

// Checkpointer 管理
import {
  getCheckpointer,
  closeCheckpointer,
  cleanupOldCheckpoints,
  getCheckpointerType,
} from '@/lib/agents'

// 获取当前使用的 checkpointer 类型
console.log('Checkpointer type:', getCheckpointerType())

// 清理旧的检查点数据（建议定期调用）
const deletedCount = await cleanupOldCheckpoints(7) // 保留 7 天
console.log(`Cleaned up ${deletedCount} old checkpoints`)

// 应用关闭时释放连接
await closeCheckpointer()
*/
