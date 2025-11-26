/**
 * LangGraph 多智能体系统 - 统一导出
 * Phase 2: 框架搭建完成
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
  getTripPlanningWorkflow,
  executeTripPlanningWorkflow,
  streamTripPlanningWorkflow,
} from './workflow'

// ============================================================================
// MCP 客户端
// ============================================================================
export { MCPClient, getMCPClient } from './mcp-client'
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
// 使用示例
// ============================================================================

/*
// 基本用法
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

// 流式执行（用于实时进度反馈）
import { streamTripPlanningWorkflow } from '@/lib/agents'

for await (const event of streamTripPlanningWorkflow(userInput)) {
  console.log('Current node:', event)
}

// 使用 MCP 客户端
import { getMCPClient } from '@/lib/agents'

const mcpClient = getMCPClient()
const weather = await mcpClient.getWeatherForecast('杭州')
console.log(weather)
*/
