/**
 * LangGraph 工作流定义
 * 定义多智能体协作的状态图
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'
import {
  TripStateAnnotation,
  type TripState,
  type TripStateUpdate,
} from './state'

// ============================================================================
// Agent 节点函数（占位符，Phase 3 实现）
// ============================================================================

/**
 * 天气感知 Agent
 * 获取天气预报并生成策略标签
 */
async function weatherScoutAgent(
  state: TripState
): Promise<TripStateUpdate> {
  console.log('[Weather Scout] Starting...')
  // TODO: Phase 3 - 实现天气分析逻辑
  return {
    weather: {
      forecasts: [],
      strategyTags: ['outdoor_friendly'],
      clothingAdvice: '建议穿着舒适的休闲服装',
      warnings: [],
    },
  }
}

/**
 * 核心规划 Agent
 * 生成行程骨架（景点顺序）
 */
async function itineraryPlannerAgent(
  state: TripState
): Promise<TripStateUpdate> {
  console.log('[Itinerary Planner] Starting...')
  // TODO: Phase 3 - 实现行程规划逻辑
  return {
    draftItinerary: {
      days: [],
      totalAttractions: 0,
      totalMeals: 0,
    },
  }
}

/**
 * 住宿专家 Agent
 * 推荐酒店
 */
async function accommodationAgent(
  state: TripState
): Promise<TripStateUpdate> {
  console.log('[Accommodation Specialist] Starting...')
  // TODO: Phase 3 - 实现酒店推荐逻辑
  return {
    accommodation: {
      recommendations: [],
      selected: null,
      totalCost: 0,
    },
  }
}

/**
 * 交通调度 Agent
 * 计算路线和费用
 */
async function transportAgent(state: TripState): Promise<TripStateUpdate> {
  console.log('[Transport Logistician] Starting...')
  // TODO: Phase 3 - 实现交通规划逻辑
  return {
    transport: {
      segments: [],
      totalTime: 0,
      totalDistance: 0,
      totalCost: 0,
      recommendedModes: [],
    },
  }
}

/**
 * 餐饮推荐 Agent
 * 推荐餐厅
 */
async function diningAgent(state: TripState): Promise<TripStateUpdate> {
  console.log('[Dining Recommender] Starting...')
  // TODO: Phase 3 - 实现餐饮推荐逻辑
  return {
    dining: {
      recommendations: [],
      totalCost: 0,
    },
  }
}

/**
 * 预算审计 Agent
 * 汇总成本并判断是否通过
 */
async function budgetCriticAgent(
  state: TripState
): Promise<TripStateUpdate> {
  console.log('[Budget Critic] Starting...')

  const { userInput, accommodation, transport, dining, draftItinerary } = state

  // 汇总成本
  const accommodationCost = accommodation?.totalCost || 0
  const transportCost = transport?.totalCost || 0
  const diningCost = dining?.totalCost || 0
  const attractionCost = draftItinerary?.estimatedAttractionCost || 0

  const totalCost =
    accommodationCost + transportCost + diningCost + attractionCost

  // 判断是否在预算内（允许 10% 溢价）
  const isWithinBudget = totalCost <= userInput.budget * 1.1

  const budgetResult = {
    totalCost,
    budgetUtilization: totalCost / userInput.budget,
    isWithinBudget,
    costBreakdown: {
      accommodation: accommodationCost,
      transport: transportCost,
      dining: diningCost,
      attractions: attractionCost,
    },
    feedback: isWithinBudget
      ? undefined
      : {
          action: 'downgrade_hotel' as const,
          targetReduction: totalCost - userInput.budget,
          suggestion: '建议选择更经济的住宿以控制预算',
        },
  }

  return {
    budgetResult,
    retryCount: isWithinBudget ? 0 : 1, // 触发 reducer 累加
  }
}

/**
 * 最终化 Agent
 * 汇总所有数据生成完整行程
 */
async function finalizeAgent(state: TripState): Promise<TripStateUpdate> {
  console.log('[Finalize] Generating final itinerary...')
  // TODO: Phase 3 - 实现最终行程汇总逻辑
  return {
    finalItinerary: {
      days: [],
      accommodation: [],
      transportation: {
        to_destination: { method: '', details: '', cost: 0 },
        from_destination: { method: '', details: '', cost: 0 },
        local: { methods: [], estimated_cost: 0 },
      },
      estimated_cost: {
        accommodation: 0,
        transportation: 0,
        food: 0,
        attractions: 0,
        other: 0,
        total: 0,
      },
      summary: '行程生成完成',
    },
  }
}

// ============================================================================
// 工作流构建
// ============================================================================

/**
 * 创建 LangGraph 状态图工作流
 */
export function createTripPlanningWorkflow() {
  // 1. 创建状态图
  const workflow = new StateGraph(TripStateAnnotation)

  // 2. 添加节点（每个节点是一个 Agent）
  // 注意：节点名称不能与状态字段名称相同
  workflow
    .addNode('weather_scout', weatherScoutAgent)
    .addNode('itinerary_planner', itineraryPlannerAgent)
    .addNode('accommodation_agent', accommodationAgent)
    .addNode('transport_agent', transportAgent)
    .addNode('dining_agent', diningAgent)
    .addNode('budget_critic', budgetCriticAgent)
    .addNode('finalize', finalizeAgent)

  // 3. 定义边（执行顺序）
  workflow
    // 入口 → 天气
    .addEdge(START, 'weather_scout')
    // 天气 → 规划
    .addEdge('weather_scout', 'itinerary_planner')
    // 规划 → 资源 (并行扇出)
    .addEdge('itinerary_planner', 'accommodation_agent')
    .addEdge('itinerary_planner', 'transport_agent')
    .addEdge('itinerary_planner', 'dining_agent')
    // 资源 → 预算 (扇入汇合)
    .addEdge('accommodation_agent', 'budget_critic')
    .addEdge('transport_agent', 'budget_critic')
    .addEdge('dining_agent', 'budget_critic')

  // 4. 条件边：预算审计后的决策
  workflow.addConditionalEdges(
    'budget_critic',
    (state: TripState) => {
      // 通过审计
      if (state.budgetResult?.isWithinBudget) {
        return 'finalize'
      }
      // 超过最大重试次数，强制结束
      if (state.retryCount >= 3) {
        console.warn(
          `[Budget Critic] Exceeded max retries (${state.retryCount}), proceeding anyway`
        )
        return 'finalize'
      }
      // 超预算，返回重新规划
      console.log(
        `[Budget Critic] Budget exceeded, retry ${state.retryCount + 1}/3`
      )
      return 'retry'
    },
    {
      finalize: 'finalize',
      retry: 'itinerary_planner', // 循环回规划节点
    }
  )

  // 5. 结束边
  workflow.addEdge('finalize', END)

  // 6. 配置检查点存储（开发环境用内存）
  const checkpointer = new MemorySaver()

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
let workflowInstance: ReturnType<typeof createTripPlanningWorkflow> | null =
  null

/**
 * 获取工作流实例
 * 使用单例模式避免重复编译
 */
export function getTripPlanningWorkflow() {
  if (!workflowInstance) {
    workflowInstance = createTripPlanningWorkflow()
  }
  return workflowInstance
}

/**
 * 执行工作流
 * @param userInput - 用户输入的行程表单数据
 * @param config - 可选配置（如 thread_id 用于检查点恢复）
 */
export async function executeTripPlanningWorkflow(
  userInput: TripState['userInput'],
  config?: { thread_id?: string }
) {
  const app = getTripPlanningWorkflow()

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  // 执行工作流
  const finalState = await app.invoke(initialState, {
    configurable: { thread_id: config?.thread_id || `trip-${Date.now()}` },
  })

  return finalState
}

/**
 * 流式执行工作流
 * 用于实时进度反馈
 * @param userInput - 用户输入的行程表单数据
 * @param config - 可选配置
 */
export async function* streamTripPlanningWorkflow(
  userInput: TripState['userInput'],
  config?: { thread_id?: string }
) {
  const app = getTripPlanningWorkflow()

  // 初始状态
  const initialState: Partial<TripState> = {
    userInput,
  }

  // 流式执行
  const stream = await app.stream(initialState, {
    configurable: { thread_id: config?.thread_id || `trip-${Date.now()}` },
  })

  for await (const event of stream) {
    yield event
  }
}
