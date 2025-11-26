/**
 * LangGraph 多智能体系统 - 统一导出
 * Phase 3: 专家 Agent 实现完成
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
  resetTripPlanningWorkflow,
  executeTripPlanningWorkflow,
  streamTripPlanningWorkflow,
  getWorkflowNodes,
} from './workflow'
export type { AIClientConfig, WorkflowConfig } from './workflow'

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
  console.log('Current node:', event.node)
  console.log('State:', event.state)
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
*/
