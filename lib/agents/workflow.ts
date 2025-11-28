/**
 * LangGraph 工作流定义
 * 定义多智能体协作的状态图
 * Phase 5.3: 添加追踪支持
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import {
  TripStateAnnotation,
  type TripState,
  type TripStateUpdate,
} from './state'
import {
  getCheckpointer,
  type CheckpointerType,
} from './checkpointer'
import { logger } from '@/lib/logger'
import {
  getTracer,
  type Tracer,
  type TracerConfig,
  type TracerType,
} from './tracer'

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
  /** 是否启用检查点（默认 true） */
  checkpointer?: boolean
  /** 检查点存储类型（默认根据环境自动选择） */
  checkpointerType?: CheckpointerType
  /** PostgreSQL 连接字符串（仅 postgres 类型需要） */
  checkpointerConnectionString?: string
  maxRetries?: number
  /** 追踪配置 */
  tracer?: Partial<TracerConfig>
  /** 追踪器类型（快捷配置） */
  tracerType?: TracerType
}

// ============================================================================
// 工作流构建
// ============================================================================

/**
 * 创建 LangGraph 状态图工作流（同步版本，使用 MemorySaver）
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
        logger.info('[Workflow] Budget check passed, proceeding to finalize')
        return 'finalize'
      }
      // 超过最大重试次数，强制结束
      if (state.retryCount >= maxRetries) {
        logger.warn(
          `[Workflow] Exceeded max retries (${state.retryCount}), proceeding anyway`
        )
        return 'finalize'
      }
      // 超预算，返回重新规划
      logger.info(
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

  // 6. 配置检查点存储
  let checkpointer: MemorySaver | undefined = undefined
  if (enableCheckpointer) {
    // 同步版本始终使用 MemorySaver
    checkpointer = new MemorySaver()
  }

  // 7. 编译工作流
  const app = workflow.compile({ checkpointer })

  return app
}

/**
 * 创建 LangGraph 状态图工作流（异步版本，支持 PostgreSQL）
 * @param config 可选配置
 */
export async function createTripPlanningWorkflowAsync(config?: WorkflowConfig) {
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
        logger.info('[Workflow] Budget check passed, proceeding to finalize')
        return 'finalize'
      }
      // 超过最大重试次数，强制结束
      if (state.retryCount >= maxRetries) {
        logger.warn(
          `[Workflow] Exceeded max retries (${state.retryCount}), proceeding anyway`
        )
        return 'finalize'
      }
      // 超预算，返回重新规划
      logger.info(
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

  // 6. 配置检查点存储（异步获取）
  let checkpointer: PostgresSaver | MemorySaver | undefined = undefined
  if (enableCheckpointer) {
    try {
      checkpointer = await getCheckpointer({
        type: config?.checkpointerType,
        connectionString: config?.checkpointerConnectionString,
      })
      logger.info(`[Workflow] Using ${config?.checkpointerType || 'auto'} checkpointer`)
    } catch (error) {
      logger.warn('[Workflow] Failed to initialize checkpointer, falling back to memory', {
        error: (error as Error).message,
      })
      checkpointer = new MemorySaver()
    }
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
let workflowInstanceAsync: Awaited<ReturnType<typeof createTripPlanningWorkflowAsync>> | null = null
let workflowConfig: WorkflowConfig | undefined = undefined

/**
 * 获取工作流实例（同步版本，使用 MemorySaver）
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
 * 获取工作流实例（异步版本，支持 PostgreSQL）
 * 使用单例模式避免重复编译
 * @param config 可选配置
 */
export async function getTripPlanningWorkflowAsync(config?: WorkflowConfig) {
  // 如果配置变化，重新创建实例
  if (config && JSON.stringify(config) !== JSON.stringify(workflowConfig)) {
    workflowInstanceAsync = null
    workflowConfig = config
  }

  if (!workflowInstanceAsync) {
    workflowInstanceAsync = await createTripPlanningWorkflowAsync(workflowConfig)
  }
  return workflowInstanceAsync
}

/**
 * 重置工作流实例
 * 用于测试或配置变更
 */
export function resetTripPlanningWorkflow() {
  workflowInstance = null
  workflowInstanceAsync = null
  workflowConfig = undefined
}

/**
 * 执行工作流（使用 MemorySaver）
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

  // 获取追踪器
  const tracer = getTracer({
    ...options?.config?.tracer,
    type: options?.config?.tracerType || options?.config?.tracer?.type,
  })

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  logger.info('[Workflow] Starting trip planning workflow...', {
    destination: userInput.destination,
    dateRange: `${userInput.start_date} - ${userInput.end_date}`,
    budget: userInput.budget,
  })

  const startTime = Date.now()
  const traceId = tracer.startTrace('TripPlanningWorkflow', userInput, {
    thread_id: options?.thread_id,
    destination: userInput.destination,
  })

  try {
    // 执行工作流
    const finalState = await app.invoke(initialState, {
      configurable: { thread_id: options?.thread_id || `trip-${Date.now()}` },
    })

    const duration = Date.now() - startTime
    logger.info(`[Workflow] Completed in ${duration}ms`)

    // 结束追踪
    tracer.endTrace(traceId, {
      success: true,
      duration,
      hasItinerary: !!finalState.finalItinerary,
    })

    return finalState
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`[Workflow] Failed after ${duration}ms`, error as Error)

    // 记录错误
    tracer.endTrace(traceId, undefined, (error as Error).message)

    throw error
  }
}

/**
 * 执行工作流（支持 PostgreSQL Checkpointer）
 * @param userInput - 用户输入的行程表单数据
 * @param options - 执行选项
 */
export async function executeTripPlanningWorkflowWithPersistence(
  userInput: TripState['userInput'],
  options?: {
    thread_id?: string
    config?: WorkflowConfig
  }
) {
  const app = await getTripPlanningWorkflowAsync(options?.config)

  // 获取追踪器
  const tracer = getTracer({
    ...options?.config?.tracer,
    type: options?.config?.tracerType || options?.config?.tracer?.type,
  })

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  const threadId = options?.thread_id || `trip-${Date.now()}`

  logger.info('[Workflow] Starting trip planning workflow (with persistence)...', {
    destination: userInput.destination,
    dateRange: `${userInput.start_date} - ${userInput.end_date}`,
    budget: userInput.budget,
    threadId,
  })

  const startTime = Date.now()
  const traceId = tracer.startTrace('TripPlanningWorkflow', userInput, {
    thread_id: threadId,
    destination: userInput.destination,
    persistence: true,
  })

  try {
    // 执行工作流
    const finalState = await app.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const duration = Date.now() - startTime
    logger.info(`[Workflow] Completed in ${duration}ms`)

    // 结束追踪
    tracer.endTrace(traceId, {
      success: true,
      duration,
      hasItinerary: !!finalState.finalItinerary,
    })

    return finalState
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`[Workflow] Failed after ${duration}ms`, error as Error)

    // 记录错误
    tracer.endTrace(traceId, undefined, (error as Error).message)

    throw error
  }
}

/**
 * 流式执行工作流（使用 MemorySaver）
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

  // 获取追踪器
  const tracer = getTracer({
    ...options?.config?.tracer,
    type: options?.config?.tracerType || options?.config?.tracer?.type,
  })

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  const threadId = options?.thread_id || `trip-${Date.now()}`

  logger.info('[Workflow] Starting trip planning workflow (streaming)...')

  // 开始追踪
  const traceId = tracer.startTrace('TripPlanningWorkflow', userInput, {
    thread_id: threadId,
    destination: userInput.destination,
    streaming: true,
  })

  // 记录每个节点的 span
  const nodeSpans: Map<string, string> = new Map()

  try {
    // 流式执行
    const stream = await app.stream(initialState, {
      configurable: { thread_id: threadId },
    })

    for await (const event of stream) {
      // 提取节点名称
      const nodeName = Object.keys(event)[0]
      logger.debug(`[Workflow] Completed node: ${nodeName}`)

      // 结束上一个节点的 span（如果存在）
      const prevSpanId = nodeSpans.get(nodeName)
      if (prevSpanId) {
        tracer.endSpan(prevSpanId, (event as Record<string, unknown>)[nodeName])
      }

      // 开始新节点的 span
      const spanId = tracer.startSpan(traceId, nodeName, 'node')
      nodeSpans.set(nodeName, spanId)

      yield {
        node: nodeName,
        state: (event as Record<string, unknown>)[nodeName],
        timestamp: Date.now(),
        traceId,
        spanId,
      }

      // 立即结束 span（因为节点已完成）
      tracer.endSpan(spanId, (event as Record<string, unknown>)[nodeName])
    }

    // 结束追踪
    tracer.endTrace(traceId, { success: true })
  } catch (error) {
    // 记录错误
    tracer.endTrace(traceId, undefined, (error as Error).message)
    throw error
  }
}

/**
 * 流式执行工作流（支持 PostgreSQL Checkpointer）
 * 用于实时进度反馈，支持中断恢复
 * @param userInput - 用户输入的行程表单数据
 * @param options - 执行选项
 */
export async function* streamTripPlanningWorkflowWithPersistence(
  userInput: TripState['userInput'],
  options?: {
    thread_id?: string
    config?: WorkflowConfig
  }
) {
  const app = await getTripPlanningWorkflowAsync(options?.config)

  // 获取追踪器
  const tracer = getTracer({
    ...options?.config?.tracer,
    type: options?.config?.tracerType || options?.config?.tracer?.type,
  })

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  const threadId = options?.thread_id || `trip-${Date.now()}`

  logger.info('[Workflow] Starting trip planning workflow (streaming with persistence)...', {
    threadId,
  })

  // 开始追踪
  const traceId = tracer.startTrace('TripPlanningWorkflow', userInput, {
    thread_id: threadId,
    destination: userInput.destination,
    streaming: true,
    persistence: true,
  })

  try {
    // 流式执行
    const stream = await app.stream(initialState, {
      configurable: { thread_id: threadId },
    })

    for await (const event of stream) {
      // 提取节点名称
      const nodeName = Object.keys(event)[0]
      logger.debug(`[Workflow] Completed node: ${nodeName}`)

      // 开始并立即结束 span（节点已完成）
      const spanId = tracer.startSpan(traceId, nodeName, 'node')
      tracer.endSpan(spanId, (event as Record<string, unknown>)[nodeName])

      yield {
        node: nodeName,
        state: (event as Record<string, unknown>)[nodeName],
        timestamp: Date.now(),
        traceId,
        spanId,
      }
    }

    // 结束追踪
    tracer.endTrace(traceId, { success: true })
  } catch (error) {
    // 记录错误
    tracer.endTrace(traceId, undefined, (error as Error).message)
    throw error
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
