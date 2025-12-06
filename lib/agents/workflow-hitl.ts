/**
 * Human-in-the-Loop 工作流定义
 * 扩展基础工作流，添加 HITL 中断点支持
 */

import { StateGraph, END, START, interrupt, Command } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import {
  HITLTripStateAnnotation,
  type HITLTripState,
  type HITLInterruptType,
  type ItineraryReviewOptions,
  type BudgetDecisionOptions,
  type BudgetAdjustmentOption,
  type HITLUserDecision,
  type ItineraryReviewDecision,
  type BudgetDecision,
  createInterruptUpdate,
} from './state-hitl'
import type { TripState, DraftItinerary, BudgetResult } from './state'
import { getCheckpointer, type CheckpointerType } from './checkpointer'
import { logger } from '@/lib/logger'
import { getTracer, type TracerConfig, type TracerType } from './tracer'
import { getMetricsCollector, createTimer, type MetricsConfig } from './metrics'

// 导入 Agent 节点创建函数
import { createWeatherScoutAgent } from './nodes/weather-scout'
import { createItineraryPlannerAgent } from './nodes/itinerary-planner'
import { createAttractionEnricherAgent } from './nodes/attraction-enricher'
import { createAccommodationAgent } from './nodes/accommodation'
import { createTransportAgent } from './nodes/transport'
import { createDiningAgent } from './nodes/dining'
import { createBudgetCriticAgent } from './nodes/budget-critic'
import { createFinalizeAgent } from './nodes/finalize'

// ============================================================================
// 配置类型
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
 * HITL 工作流配置
 */
export interface HITLWorkflowConfig {
  ai?: Partial<AIClientConfig>
  /** 是否启用检查点（默认 true） */
  checkpointer?: boolean
  /** 检查点存储类型 */
  checkpointerType?: CheckpointerType
  /** PostgreSQL 连接字符串 */
  checkpointerConnectionString?: string
  /** 最大重试次数 */
  maxRetries?: number
  /** 追踪配置 */
  tracer?: Partial<TracerConfig>
  /** 追踪器类型 */
  tracerType?: TracerType
  /** 指标配置 */
  metrics?: Partial<MetricsConfig>
  /** HITL 配置 */
  hitl?: {
    /** 是否启用行程审核中断（默认 true） */
    enableItineraryReview?: boolean
    /** 是否启用预算决策中断（默认 true） */
    enableBudgetDecision?: boolean
    /** 预算超支阈值（超过此百分比才触发中断，默认 0.1 即 10%） */
    budgetOverageThreshold?: number
  }
}

// ============================================================================
// HITL Agent 节点包装器
// ============================================================================

/**
 * 创建带 HITL 支持的行程规划 Agent
 * 在生成行程骨架后触发中断，等待用户审核
 */
function createItineraryPlannerWithHITL(
  baseAgent: (state: TripState) => Promise<Partial<TripState>>,
  enableReview: boolean = true
) {
  return async (state: HITLTripState): Promise<Partial<HITLTripState>> => {
    // 检查是否是恢复执行（用户已做出决策）
    if (state.hitl?.userDecision && state.hitl.interruptType === 'itinerary_review') {
      const decision = state.hitl.userDecision as ItineraryReviewDecision
      logger.info('[HITL] Resuming after itinerary review', { decision: decision.type })

      if (decision.type === 'cancel') {
        throw new Error('用户取消了行程规划')
      }

      if (decision.type === 'modify' && decision.modifications) {
        // 应用用户的修改
        const modifiedItinerary = applyItineraryModifications(
          state.draftItinerary!,
          decision.modifications
        )
        return {
          draftItinerary: modifiedItinerary,
          hitl: {
            ...state.hitl,
            awaitingInput: false,
            interruptType: null,
            options: null,
          },
        }
      }

      // approve 或 retry：清除 HITL 状态，继续执行
      return {
        hitl: {
          ...state.hitl,
          awaitingInput: false,
          interruptType: null,
          options: null,
        },
      }
    }

    // 执行基础 Agent 逻辑
    const result = await baseAgent(state as TripState)

    // 如果不启用审核，直接返回
    if (!enableReview) {
      return result
    }

    // 准备中断选项
    const reviewOptions: ItineraryReviewOptions = {
      draftItinerary: result.draftItinerary!,
      weatherWarnings: state.weather?.warnings,
    }

    // 触发中断，等待用户审核
    logger.info('[HITL] Interrupting for itinerary review')

    // 使用 LangGraph 的 interrupt 函数
    const userDecision = interrupt({
      type: 'itinerary_review' as HITLInterruptType,
      message: '行程骨架已生成，请确认或调整景点选择',
      options: reviewOptions,
      timestamp: Date.now(),
      threadId: state.threadId,
    })

    // 恢复后，userDecision 包含用户选择
    return {
      ...result,
      hitl: {
        ...state.hitl,
        awaitingInput: false,
        userDecision: userDecision as HITLUserDecision,
        resumedAt: Date.now(),
      },
    }
  }
}

/**
 * 创建带 HITL 支持的预算审计 Agent
 * 在预算超支时触发中断，让用户选择调整方案
 */
function createBudgetCriticWithHITL(
  baseAgent: (state: TripState) => Partial<TripState>,
  config?: {
    enableDecision?: boolean
    overageThreshold?: number
  }
) {
  const enableDecision = config?.enableDecision !== false
  const overageThreshold = config?.overageThreshold ?? 0.1 // 默认 10%

  return (state: HITLTripState): Partial<HITLTripState> => {
    // 检查是否是恢复执行
    if (state.hitl?.userDecision && state.hitl.interruptType === 'budget_decision') {
      const decision = state.hitl.userDecision as BudgetDecision
      logger.info('[HITL] Resuming after budget decision', { decision: decision.type })

      if (decision.type === 'cancel') {
        throw new Error('用户取消了行程规划')
      }

      if (decision.acceptOverage) {
        // 用户接受超支，标记预算结果为通过
        return {
          budgetResult: {
            ...state.budgetResult!,
            isWithinBudget: true, // 强制标记为通过
          },
          hitl: {
            ...state.hitl,
            awaitingInput: false,
            interruptType: null,
            options: null,
          },
        }
      }

      if (decision.selectedOptionId) {
        // 应用用户选择的调整方案
        // 这里返回重试标记，让工作流重新规划
        return {
          retryCount: 1, // 触发重试
          hitl: {
            ...state.hitl,
            awaitingInput: false,
            interruptType: null,
            options: null,
          },
        }
      }

      // 清除状态继续
      return {
        hitl: {
          ...state.hitl,
          awaitingInput: false,
          interruptType: null,
          options: null,
        },
      }
    }

    // 执行基础预算审计逻辑
    const result = baseAgent(state as TripState)

    // 如果在预算内或不启用决策中断，直接返回
    if (!enableDecision || result.budgetResult?.isWithinBudget) {
      return result
    }

    // 计算超支比例
    const budget = state.userInput.budget
    const totalCost = result.budgetResult?.totalCost || 0
    const overagePercentage = (totalCost - budget) / budget

    // 如果超支比例低于阈值，不触发中断
    if (overagePercentage < overageThreshold) {
      logger.info('[HITL] Budget overage below threshold, skipping interrupt', {
        overagePercentage: (overagePercentage * 100).toFixed(1) + '%',
        threshold: (overageThreshold * 100) + '%',
      })
      return result
    }

    // 生成调整方案选项
    const adjustmentOptions = generateBudgetAdjustmentOptions(
      result.budgetResult!,
      totalCost - budget
    )

    const decisionOptions: BudgetDecisionOptions = {
      budgetResult: result.budgetResult!,
      adjustmentOptions,
      overageAmount: totalCost - budget,
      overagePercentage,
    }

    // 触发中断
    logger.info('[HITL] Interrupting for budget decision', {
      overage: totalCost - budget,
      percentage: (overagePercentage * 100).toFixed(1) + '%',
    })

    const userDecision = interrupt({
      type: 'budget_decision' as HITLInterruptType,
      message: `预算超支 ¥${(totalCost - budget).toFixed(0)}（${(overagePercentage * 100).toFixed(1)}%），请选择调整方案`,
      options: decisionOptions,
      timestamp: Date.now(),
      threadId: state.threadId,
    })

    return {
      ...result,
      hitl: {
        ...state.hitl,
        awaitingInput: false,
        userDecision: userDecision as HITLUserDecision,
        resumedAt: Date.now(),
      },
    }
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 应用用户的行程修改
 */
function applyItineraryModifications(
  itinerary: DraftItinerary,
  modifications: ItineraryReviewDecision['modifications']
): DraftItinerary {
  if (!modifications || modifications.length === 0) {
    return itinerary
  }

  const newDays = [...itinerary.days]

  for (const mod of modifications) {
    switch (mod.type) {
      case 'remove':
        if (mod.dayIndex !== undefined && mod.attractionIndex !== undefined) {
          newDays[mod.dayIndex] = {
            ...newDays[mod.dayIndex],
            attractions: newDays[mod.dayIndex].attractions.filter(
              (_, i) => i !== mod.attractionIndex
            ),
          }
        }
        break

      case 'add':
        if (mod.dayIndex !== undefined && mod.attraction) {
          newDays[mod.dayIndex] = {
            ...newDays[mod.dayIndex],
            attractions: [...newDays[mod.dayIndex].attractions, mod.attraction],
          }
        }
        break

      case 'reorder':
        if (
          mod.dayIndex !== undefined &&
          mod.fromIndex !== undefined &&
          mod.toIndex !== undefined
        ) {
          const attractions = [...newDays[mod.dayIndex].attractions]
          const [moved] = attractions.splice(mod.fromIndex, 1)
          attractions.splice(mod.toIndex, 0, moved)
          newDays[mod.dayIndex] = {
            ...newDays[mod.dayIndex],
            attractions,
          }
        }
        break

      case 'update':
        if (
          mod.dayIndex !== undefined &&
          mod.attractionIndex !== undefined &&
          mod.attraction
        ) {
          newDays[mod.dayIndex] = {
            ...newDays[mod.dayIndex],
            attractions: newDays[mod.dayIndex].attractions.map((a, i) =>
              i === mod.attractionIndex ? mod.attraction! : a
            ),
          }
        }
        break
    }
  }

  // 重新计算总数
  const totalAttractions = newDays.reduce(
    (sum, day) => sum + day.attractions.length,
    0
  )

  return {
    ...itinerary,
    days: newDays,
    totalAttractions,
  }
}

/**
 * 生成预算调整方案
 */
function generateBudgetAdjustmentOptions(
  budgetResult: BudgetResult,
  overageAmount: number
): BudgetAdjustmentOption[] {
  const options: BudgetAdjustmentOption[] = []
  const { costBreakdown } = budgetResult

  // 方案1：降级酒店
  if (costBreakdown.accommodation > 0) {
    const savings = Math.min(costBreakdown.accommodation * 0.3, overageAmount)
    options.push({
      id: 'downgrade_hotel',
      label: '降级酒店',
      description: '选择更经济的酒店住宿',
      savingsAmount: savings,
      impact: 'medium',
      details: {
        hotelDowngrade: {
          from: '当前酒店',
          to: '经济型酒店',
          priceDiff: savings,
        },
      },
    })
  }

  // 方案2：减少景点
  if (costBreakdown.attractions > 0) {
    const savings = Math.min(costBreakdown.attractions * 0.4, overageAmount)
    options.push({
      id: 'reduce_attractions',
      label: '减少景点',
      description: '删除部分付费景点，保留核心体验',
      savingsAmount: savings,
      impact: 'medium',
    })
  }

  // 方案3：调整交通
  if (costBreakdown.transport > 0) {
    const savings = Math.min(costBreakdown.transport * 0.4, overageAmount)
    options.push({
      id: 'cheaper_transport',
      label: '调整交通',
      description: '使用公共交通替代打车',
      savingsAmount: savings,
      impact: 'low',
      details: {
        transportChange: '使用公交/地铁',
      },
    })
  }

  // 方案4：调整餐饮
  if (costBreakdown.dining > 0) {
    const savings = Math.min(costBreakdown.dining * 0.3, overageAmount)
    options.push({
      id: 'adjust_meals',
      label: '调整餐饮',
      description: '选择更实惠的餐厅',
      savingsAmount: savings,
      impact: 'low',
      details: {
        mealAdjustment: '选择大众点评高性价比餐厅',
      },
    })
  }

  // 排序：按节省金额降序
  options.sort((a, b) => b.savingsAmount - a.savingsAmount)

  return options
}

// ============================================================================
// HITL 工作流创建
// ============================================================================

/**
 * 创建 HITL 工作流（异步版本，支持 PostgreSQL 检查点）
 */
export async function createHITLWorkflow(config?: HITLWorkflowConfig) {
  const aiConfig = config?.ai
  const enableCheckpointer = config?.checkpointer !== false
  const maxRetries = config?.maxRetries ?? 3
  const hitlConfig = config?.hitl ?? {}

  // 创建基础 Agent 实例
  const weatherScoutAgent = createWeatherScoutAgent(aiConfig)
  const baseItineraryPlannerAgent = createItineraryPlannerAgent(aiConfig)
  const attractionEnricherAgent = createAttractionEnricherAgent(aiConfig)
  const accommodationAgent = createAccommodationAgent(aiConfig)
  const transportAgent = createTransportAgent(aiConfig)
  const diningAgent = createDiningAgent(aiConfig)
  const baseBudgetCriticAgent = createBudgetCriticAgent()
  const finalizeAgent = createFinalizeAgent(aiConfig)

  // 包装 HITL Agent
  const itineraryPlannerWithHITL = createItineraryPlannerWithHITL(
    baseItineraryPlannerAgent,
    hitlConfig.enableItineraryReview !== false
  )

  const budgetCriticWithHITL = createBudgetCriticWithHITL(baseBudgetCriticAgent, {
    enableDecision: hitlConfig.enableBudgetDecision !== false,
    overageThreshold: hitlConfig.budgetOverageThreshold,
  })

  // 创建状态图
  const workflow = new StateGraph(HITLTripStateAnnotation)

  // 添加节点
  workflow.addNode('weather_scout' as any, weatherScoutAgent as any)
  workflow.addNode('itinerary_planner' as any, itineraryPlannerWithHITL as any)
  workflow.addNode('attraction_enricher' as any, attractionEnricherAgent as any)
  workflow.addNode('accommodation_agent' as any, accommodationAgent as any)
  workflow.addNode('transport_agent' as any, transportAgent as any)
  workflow.addNode('dining_agent' as any, diningAgent as any)
  workflow.addNode('budget_critic' as any, budgetCriticWithHITL as any)
  workflow.addNode('finalize' as any, finalizeAgent as any)

  // 定义边
  workflow.addEdge(START, 'weather_scout' as any)
  workflow.addEdge('weather_scout' as any, 'itinerary_planner' as any)
  workflow.addEdge('itinerary_planner' as any, 'attraction_enricher' as any)

  // 并行扇出
  workflow.addEdge('attraction_enricher' as any, 'accommodation_agent' as any)
  workflow.addEdge('attraction_enricher' as any, 'transport_agent' as any)
  workflow.addEdge('attraction_enricher' as any, 'dining_agent' as any)

  // 扇入汇合
  workflow.addEdge('accommodation_agent' as any, 'budget_critic' as any)
  workflow.addEdge('transport_agent' as any, 'budget_critic' as any)
  workflow.addEdge('dining_agent' as any, 'budget_critic' as any)

  // 条件边：预算审计后的决策
  workflow.addConditionalEdges(
    'budget_critic' as any,
    (state: HITLTripState) => {
      if (state.budgetResult?.isWithinBudget) {
        logger.info('[HITL Workflow] Budget check passed')
        return 'finalize'
      }
      if (state.retryCount >= maxRetries) {
        logger.warn(`[HITL Workflow] Max retries (${maxRetries}) exceeded`)
        return 'finalize'
      }
      logger.info(`[HITL Workflow] Budget exceeded, retry ${state.retryCount + 1}/${maxRetries}`)
      return 'retry'
    },
    {
      finalize: 'finalize' as any,
      retry: 'itinerary_planner' as any,
    }
  )

  // 结束边
  workflow.addEdge('finalize' as any, END)

  // 配置检查点存储
  let checkpointer: PostgresSaver | MemorySaver | undefined
  if (enableCheckpointer) {
    try {
      checkpointer = await getCheckpointer({
        type: config?.checkpointerType,
        connectionString: config?.checkpointerConnectionString,
      })
      logger.info(`[HITL Workflow] Using ${config?.checkpointerType || 'auto'} checkpointer`)
    } catch (error) {
      logger.warn('[HITL Workflow] Failed to initialize checkpointer', {
        error: (error as Error).message,
      })
      checkpointer = new MemorySaver()
    }
  }

  // 编译工作流，配置中断点
  const app = workflow.compile({
    checkpointer,
    // interruptAfter 配置在哪些节点后自动中断
    // 我们使用代码级 interrupt() 实现更灵活的控制
  })

  return app
}

// ============================================================================
// 工作流执行
// ============================================================================

// 全局实例缓存
let hitlWorkflowInstance: Awaited<ReturnType<typeof createHITLWorkflow>> | null = null
let hitlWorkflowConfig: HITLWorkflowConfig | undefined

/**
 * 获取 HITL 工作流实例（单例）
 */
export async function getHITLWorkflow(config?: HITLWorkflowConfig) {
  if (config && JSON.stringify(config) !== JSON.stringify(hitlWorkflowConfig)) {
    hitlWorkflowInstance = null
    hitlWorkflowConfig = config
  }

  if (!hitlWorkflowInstance) {
    hitlWorkflowInstance = await createHITLWorkflow(hitlWorkflowConfig)
  }

  return hitlWorkflowInstance
}

/**
 * 重置 HITL 工作流实例
 */
export function resetHITLWorkflow() {
  hitlWorkflowInstance = null
  hitlWorkflowConfig = undefined
}

/**
 * 启动 HITL 工作流
 * @returns 工作流执行结果或中断数据
 */
export async function startHITLWorkflow(
  userInput: HITLTripState['userInput'],
  options?: {
    threadId?: string
    config?: HITLWorkflowConfig
  }
) {
  const app = await getHITLWorkflow(options?.config)
  const threadId = options?.threadId || `hitl-trip-${Date.now()}`

  const tracer = getTracer({
    ...options?.config?.tracer,
    type: options?.config?.tracerType,
  })

  const metrics = getMetricsCollector(options?.config?.metrics)

  const initialState: Partial<HITLTripState> = {
    userInput,
    threadId,
  }

  logger.info('[HITL Workflow] Starting...', {
    threadId,
    destination: userInput.destination,
  })

  const timer = createTimer()
  const traceId = tracer.startTrace('HITLTripPlanningWorkflow', userInput, {
    thread_id: threadId,
    destination: userInput.destination,
    hitl: true,
  })

  try {
    const result = await app.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const duration = timer.stop()

    // 检查是否中断
    if (result.hitl?.awaitingInput) {
      logger.info('[HITL Workflow] Interrupted', {
        type: result.hitl.interruptType,
        duration,
      })

      return {
        status: 'interrupted' as const,
        threadId,
        interruptType: result.hitl.interruptType,
        interruptMessage: result.hitl.interruptMessage,
        options: result.hitl.options,
        state: result,
      }
    }

    logger.info('[HITL Workflow] Completed', { duration })

    tracer.endTrace(traceId, {
      success: true,
      duration,
      hasItinerary: !!result.finalItinerary,
    })

    metrics.recordWorkflowExecution({
      workflowName: 'HITLTripPlanningWorkflow',
      status: 'success',
      durationMs: duration,
      agentCount: 8,
      retryCount: result.retryCount || 0,
    })

    return {
      status: 'completed' as const,
      threadId,
      state: result,
    }
  } catch (error) {
    const duration = timer.stop()
    logger.error('[HITL Workflow] Failed', error as Error)

    tracer.endTrace(traceId, undefined, (error as Error).message)

    metrics.recordWorkflowExecution({
      workflowName: 'HITLTripPlanningWorkflow',
      status: 'error',
      durationMs: duration,
      agentCount: 0,
      retryCount: 0,
      errorMessage: (error as Error).message,
    })

    throw error
  }
}

/**
 * 恢复 HITL 工作流
 * @param threadId 工作流线程 ID
 * @param decision 用户决策
 */
export async function resumeHITLWorkflow(
  threadId: string,
  decision: HITLUserDecision,
  config?: HITLWorkflowConfig
) {
  const app = await getHITLWorkflow(config)

  logger.info('[HITL Workflow] Resuming...', {
    threadId,
    decisionType: decision.type,
  })

  const tracer = getTracer({
    ...config?.tracer,
    type: config?.tracerType,
  })

  const timer = createTimer()
  const traceId = tracer.startTrace('HITLWorkflowResume', { decision }, {
    thread_id: threadId,
    resume: true,
  })

  try {
    // 使用 Command 恢复工作流
    const result = await app.invoke(
      new Command({ resume: decision }),
      { configurable: { thread_id: threadId } }
    )

    const duration = timer.stop()

    // 检查是否再次中断
    if (result.hitl?.awaitingInput) {
      logger.info('[HITL Workflow] Interrupted again', {
        type: result.hitl.interruptType,
        duration,
      })

      return {
        status: 'interrupted' as const,
        threadId,
        interruptType: result.hitl.interruptType,
        interruptMessage: result.hitl.interruptMessage,
        options: result.hitl.options,
        state: result,
      }
    }

    logger.info('[HITL Workflow] Resumed and completed', { duration })

    tracer.endTrace(traceId, {
      success: true,
      duration,
      hasItinerary: !!result.finalItinerary,
    })

    return {
      status: 'completed' as const,
      threadId,
      state: result,
    }
  } catch (error) {
    const duration = timer.stop()
    logger.error('[HITL Workflow] Resume failed', error as Error)

    tracer.endTrace(traceId, undefined, (error as Error).message)

    throw error
  }
}

/**
 * 获取工作流状态
 */
export async function getHITLWorkflowState(
  threadId: string,
  config?: HITLWorkflowConfig
) {
  const app = await getHITLWorkflow(config)

  try {
    const state = await app.getState({ configurable: { thread_id: threadId } })

    if (!state.values) {
      return { status: 'not_found' as const }
    }

    const values = state.values as HITLTripState

    if (values.hitl?.awaitingInput) {
      return {
        status: 'interrupted' as const,
        threadId,
        interruptType: values.hitl.interruptType,
        interruptMessage: values.hitl.interruptMessage,
        options: values.hitl.options,
        state: values,
      }
    }

    if (values.finalItinerary) {
      return {
        status: 'completed' as const,
        threadId,
        state: values,
      }
    }

    return {
      status: 'running' as const,
      threadId,
      state: values,
    }
  } catch (error) {
    logger.error('[HITL Workflow] Failed to get state', error as Error)
    return { status: 'error' as const, error: (error as Error).message }
  }
}

/**
 * 流式执行 HITL 工作流
 */
export async function* streamHITLWorkflow(
  userInput: HITLTripState['userInput'],
  options?: {
    threadId?: string
    config?: HITLWorkflowConfig
  }
) {
  const app = await getHITLWorkflow(options?.config)
  const threadId = options?.threadId || `hitl-trip-${Date.now()}`

  const initialState: Partial<HITLTripState> = {
    userInput,
    threadId,
  }

  logger.info('[HITL Workflow] Starting stream...', { threadId })

  yield {
    type: 'start' as const,
    threadId,
    timestamp: Date.now(),
  }

  try {
    const stream = await app.stream(initialState, {
      configurable: { thread_id: threadId },
    })

    for await (const event of stream) {
      const nodeName = Object.keys(event)[0]
      const nodeState = (event as Record<string, unknown>)[nodeName] as Partial<HITLTripState>

      logger.debug('[HITL Workflow] Node completed', { node: nodeName })

      // 检查是否中断
      if (nodeState.hitl?.awaitingInput) {
        yield {
          type: 'interrupt' as const,
          threadId,
          node: nodeName,
          interruptType: nodeState.hitl.interruptType,
          interruptMessage: nodeState.hitl.interruptMessage,
          options: nodeState.hitl.options,
          timestamp: Date.now(),
        }
        return // 中断时停止流
      }

      yield {
        type: 'node_complete' as const,
        threadId,
        node: nodeName,
        state: nodeState,
        timestamp: Date.now(),
      }
    }

    yield {
      type: 'complete' as const,
      threadId,
      timestamp: Date.now(),
    }
  } catch (error) {
    yield {
      type: 'error' as const,
      threadId,
      error: (error as Error).message,
      timestamp: Date.now(),
    }
  }
}

/**
 * 获取 HITL 工作流节点列表
 */
export function getHITLWorkflowNodes(): Array<{
  id: string
  name: string
  description: string
  hitlEnabled: boolean
}> {
  return [
    {
      id: 'weather_scout',
      name: '天气分析',
      description: '获取目的地天气预报并生成策略建议',
      hitlEnabled: false,
    },
    {
      id: 'itinerary_planner',
      name: '行程规划',
      description: '根据用户需求和天气策略生成行程框架',
      hitlEnabled: true, // 可在此节点后中断
    },
    {
      id: 'attraction_enricher',
      name: '景点详情',
      description: '为景点添加门票、开放时间、评分等详细信息',
      hitlEnabled: false,
    },
    {
      id: 'accommodation_agent',
      name: '住宿推荐',
      description: '推荐合适的酒店住宿',
      hitlEnabled: false,
    },
    {
      id: 'transport_agent',
      name: '交通规划',
      description: '计算景点间的交通路线和费用',
      hitlEnabled: false,
    },
    {
      id: 'dining_agent',
      name: '餐饮推荐',
      description: '推荐当地特色餐厅',
      hitlEnabled: false,
    },
    {
      id: 'budget_critic',
      name: '预算审计',
      description: '审核总成本是否在预算范围内',
      hitlEnabled: true, // 超预算时可中断
    },
    {
      id: 'finalize',
      name: '生成行程',
      description: '整合所有信息生成完整行程',
      hitlEnabled: false,
    },
  ]
}
