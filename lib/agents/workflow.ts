/**
 * LangGraph 工作流定义
 * 定义多智能体协作的状态图
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'
import {
  TripStateAnnotation,
  type TripState,
  type TripStateUpdate,
} from './state'

// 导入 Agent 节点
import { createWeatherScoutAgent } from './nodes/weather-scout'
import { createItineraryPlannerAgent } from './nodes/itinerary-planner'
import { createAccommodationAgent } from './nodes/accommodation'
import { createTransportAgent } from './nodes/transport'
import { createDiningAgent } from './nodes/dining'
import { createBudgetCriticAgent } from './nodes/budget-critic'
import { createFinalizeAgent } from './nodes/finalize'

// ============================================================================
// AI 配置类型
// ============================================================================

/**
 * AI 客户端配置
 */
export interface AIClientConfig {
  apiKey: string
  baseURL: string
  model?: string
}

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  ai?: Partial<AIClientConfig>
  checkpointer?: boolean
  maxRetries?: number
}

// ============================================================================
// 工作流构建
// ============================================================================

/**
 * 创建 LangGraph 状态图工作流
 * @param config 可选配置
 */
export function createTripPlanningWorkflow(config?: WorkflowConfig) {
  const aiConfig = config?.ai
  const enableCheckpointer = config?.checkpointer !== false
  const maxRetries = config?.maxRetries ?? 3

  // 创建 Agent 实例
  const weatherScoutAgent = createWeatherScoutAgent(aiConfig)
  const itineraryPlannerAgent = createItineraryPlannerAgent(aiConfig)
  const accommodationAgent = createAccommodationAgent(aiConfig)
  const transportAgent = createTransportAgent(aiConfig)
  const diningAgent = createDiningAgent(aiConfig)
  const budgetCriticAgent = createBudgetCriticAgent()
  const finalizeAgent = createFinalizeAgent(aiConfig)

  // 1. 创建状态图
  const workflow = new StateGraph(TripStateAnnotation)

  // 2. 添加节点（每个节点是一个 Agent）
  workflow.addNode('weather_scout' as any, weatherScoutAgent)
  workflow.addNode('itinerary_planner' as any, itineraryPlannerAgent)
  workflow.addNode('accommodation_agent' as any, accommodationAgent)
  workflow.addNode('transport_agent' as any, transportAgent)
  workflow.addNode('dining_agent' as any, diningAgent)
  workflow.addNode('budget_critic' as any, budgetCriticAgent)
  workflow.addNode('finalize' as any, finalizeAgent)

  // 3. 定义边（执行顺序）
  // 入口 → 天气
  workflow.addEdge(START, 'weather_scout' as any)
  // 天气 → 规划
  workflow.addEdge('weather_scout' as any, 'itinerary_planner' as any)
  // 规划 → 资源 (并行扇出)
  workflow.addEdge('itinerary_planner' as any, 'accommodation_agent' as any)
  workflow.addEdge('itinerary_planner' as any, 'transport_agent' as any)
  workflow.addEdge('itinerary_planner' as any, 'dining_agent' as any)
  // 资源 → 预算 (扇入汇合)
  workflow.addEdge('accommodation_agent' as any, 'budget_critic' as any)
  workflow.addEdge('transport_agent' as any, 'budget_critic' as any)
  workflow.addEdge('dining_agent' as any, 'budget_critic' as any)

  // 4. 条件边：预算审计后的决策
  workflow.addConditionalEdges(
    'budget_critic' as any,
    (state: TripState) => {
      // 通过审计
      if (state.budgetResult?.isWithinBudget) {
        console.log('[Workflow] Budget check passed, proceeding to finalize')
        return 'finalize'
      }
      // 超过最大重试次数，强制结束
      if (state.retryCount >= maxRetries) {
        console.warn(
          `[Workflow] Exceeded max retries (${state.retryCount}), proceeding anyway`
        )
        return 'finalize'
      }
      // 超预算，返回重新规划
      console.log(
        `[Workflow] Budget exceeded, retry ${state.retryCount + 1}/${maxRetries}`
      )
      return 'retry'
    },
    {
      finalize: 'finalize' as any,
      retry: 'itinerary_planner' as any, // 循环回规划节点
    }
  )

  // 5. 结束边
  workflow.addEdge('finalize' as any, END)

  // 6. 配置检查点存储（可选）
  let checkpointer = undefined
  if (enableCheckpointer) {
    checkpointer = new MemorySaver()
  }

  // 7. 编译工作流
  const app = workflow.compile({ checkpointer })

  return app
}

// ============================================================================
// 导出编译好的工作流
// ============================================================================

/**
 * 全局工作流实例（单例）
 */
let workflowInstance: ReturnType<typeof createTripPlanningWorkflow> | null = null
let workflowConfig: WorkflowConfig | undefined = undefined

/**
 * 获取工作流实例
 * 使用单例模式避免重复编译
 * @param config 可选配置（仅在首次创建时生效）
 */
export function getTripPlanningWorkflow(config?: WorkflowConfig) {
  // 如果配置变化，重新创建实例
  if (config && JSON.stringify(config) !== JSON.stringify(workflowConfig)) {
    workflowInstance = null
    workflowConfig = config
  }

  if (!workflowInstance) {
    workflowInstance = createTripPlanningWorkflow(workflowConfig)
  }
  return workflowInstance
}

/**
 * 重置工作流实例
 * 用于测试或配置变更
 */
export function resetTripPlanningWorkflow() {
  workflowInstance = null
  workflowConfig = undefined
}

/**
 * 执行工作流
 * @param userInput - 用户输入的行程表单数据
 * @param options - 执行选项
 */
export async function executeTripPlanningWorkflow(
  userInput: TripState['userInput'],
  options?: {
    thread_id?: string
    config?: WorkflowConfig
  }
) {
  const app = getTripPlanningWorkflow(options?.config)

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  console.log('[Workflow] Starting trip planning workflow...')
  console.log(`[Workflow] Destination: ${userInput.destination}`)
  console.log(`[Workflow] Date: ${userInput.start_date} - ${userInput.end_date}`)
  console.log(`[Workflow] Budget: ¥${userInput.budget}`)

  const startTime = Date.now()

  // 执行工作流
  const finalState = await app.invoke(initialState, {
    configurable: { thread_id: options?.thread_id || `trip-${Date.now()}` },
  })

  const duration = Date.now() - startTime
  console.log(`[Workflow] Completed in ${duration}ms`)

  return finalState
}

/**
 * 流式执行工作流
 * 用于实时进度反馈
 * @param userInput - 用户输入的行程表单数据
 * @param options - 执行选项
 */
export async function* streamTripPlanningWorkflow(
  userInput: TripState['userInput'],
  options?: {
    thread_id?: string
    config?: WorkflowConfig
  }
) {
  const app = getTripPlanningWorkflow(options?.config)

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  console.log('[Workflow] Starting trip planning workflow (streaming)...')

  // 流式执行
  const stream = await app.stream(initialState, {
    configurable: { thread_id: options?.thread_id || `trip-${Date.now()}` },
  })

  for await (const event of stream) {
    // 提取节点名称
    const nodeName = Object.keys(event)[0]
    console.log(`[Workflow] Completed node: ${nodeName}`)

    yield {
      node: nodeName,
      state: (event as Record<string, unknown>)[nodeName],
      timestamp: Date.now(),
    }
  }
}

/**
 * 获取工作流节点列表
 * 用于进度显示
 */
export function getWorkflowNodes(): Array<{
  id: string
  name: string
  description: string
}> {
  return [
    {
      id: 'weather_scout',
      name: '天气分析',
      description: '获取目的地天气预报并生成策略建议',
    },
    {
      id: 'itinerary_planner',
      name: '行程规划',
      description: '根据用户需求和天气策略生成行程框架',
    },
    {
      id: 'accommodation_agent',
      name: '住宿推荐',
      description: '推荐合适的酒店住宿',
    },
    {
      id: 'transport_agent',
      name: '交通规划',
      description: '计算景点间的交通路线和费用',
    },
    {
      id: 'dining_agent',
      name: '餐饮推荐',
      description: '推荐当地特色餐厅',
    },
    {
      id: 'budget_critic',
      name: '预算审计',
      description: '审核总成本是否在预算范围内',
    },
    {
      id: 'finalize',
      name: '生成行程',
      description: '整合所有信息生成完整行程',
    },
  ]
}
