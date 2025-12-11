/**
 * LangGraph 工作流单元测试
 * 测试工作流结构、条件边逻辑、单例模式等
 * 使用 mock 隔离外部依赖
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TripState, BudgetResult } from '@/lib/agents/state'
import type { TripFormData } from '@/types'

// Mock 所有 Agent 节点
vi.mock('@/lib/agents/nodes/weather-scout', () => ({
  createWeatherScoutAgent: vi.fn(() => async (state: TripState) => ({
    weather: {
      forecasts: [],
      strategyTags: ['outdoor_friendly'],
      clothingAdvice: '天气适宜',
      warnings: [],
    },
  })),
}))

vi.mock('@/lib/agents/nodes/itinerary-planner', () => ({
  createItineraryPlannerAgent: vi.fn(() => async (state: TripState) => ({
    draftItinerary: {
      days: [{
        day: 1,
        date: '2025-12-01',
        attractions: [{ time: '09:00', name: '测试景点', duration: '2小时' }],
        mealSlots: [],
      }],
      totalAttractions: 1,
      totalMeals: 0,
      estimatedAttractionCost: 100,
    },
  })),
}))

vi.mock('@/lib/agents/nodes/accommodation', () => ({
  createAccommodationAgent: vi.fn(() => async (state: TripState) => ({
    accommodation: {
      recommendations: [],
      selected: null,
      totalCost: 500,
    },
  })),
}))

vi.mock('@/lib/agents/nodes/transport', () => ({
  createTransportAgent: vi.fn(() => async (state: TripState) => ({
    transport: {
      segments: [],
      totalTime: 60,
      totalDistance: 10000,
      totalCost: 100,
      recommendedModes: ['transit'],
    },
  })),
}))

vi.mock('@/lib/agents/nodes/dining', () => ({
  createDiningAgent: vi.fn(() => async (state: TripState) => ({
    dining: {
      recommendations: [],
      totalCost: 200,
    },
  })),
}))

vi.mock('@/lib/agents/nodes/finalize', () => ({
  createFinalizeAgent: vi.fn(() => async (state: TripState) => ({
    finalItinerary: {
      days: [],
      accommodation: [],
      transportation: {
        to_destination: { method: '高铁', details: 'G1次', cost: 200 },
        from_destination: { method: '高铁', details: 'G2次', cost: 200 },
        local: { method: '公共交通', daily_cost: 30 },
      },
      estimated_cost: {
        accommodation: 500,
        transportation: 500,
        food: 200,
        attractions: 100,
        shopping: 0,
        other: 0,
        total: 1300,
      },
      summary: '测试行程',
    },
  })),
}))

// Mock logger 避免测试输出
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock tracer 和 metrics
vi.mock('@/lib/agents/tracer', () => ({
  getTracer: vi.fn(() => ({
    startTrace: vi.fn(() => 'trace-id'),
    endTrace: vi.fn(),
    startSpan: vi.fn(() => 'span-id'),
    endSpan: vi.fn(),
  })),
}))

vi.mock('@/lib/agents/metrics', () => ({
  getMetricsCollector: vi.fn(() => ({
    recordWorkflowExecution: vi.fn(),
    setActiveWorkflows: vi.fn(),
    getMetricsSummary: vi.fn(() => ({ gauges: [] })),
  })),
  createTimer: vi.fn(() => ({
    stop: vi.fn(() => 1000),
  })),
}))

// 延迟导入被测试模块（在 mock 之后）
import {
  createTripPlanningWorkflow,
  getTripPlanningWorkflow,
  resetTripPlanningWorkflow,
  getWorkflowNodes,
  executeTripPlanningWorkflow,
} from '@/lib/agents/workflow'
import { createBudgetCriticAgent } from '@/lib/agents/nodes/budget-critic'

describe('LangGraph Workflow Unit Tests', () => {
  // 测试数据
  const mockUserInput: TripFormData = {
    destination: '杭州',
    start_date: '2025-12-01',
    end_date: '2025-12-03',
    budget: 3000,
    travelers: 2,
    adult_count: 2,
    child_count: 0,
    preferences: ['文化历史'],
  }

  beforeEach(() => {
    // 重置工作流单例
    resetTripPlanningWorkflow()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetTripPlanningWorkflow()
  })

  describe('getWorkflowNodes', () => {
    it('应该返回正确的节点列表', () => {
      const nodes = getWorkflowNodes()

      expect(nodes).toHaveLength(8)
      expect(nodes.map(n => n.id)).toEqual([
        'weather_scout',
        'itinerary_planner',
        'attraction_enricher',
        'accommodation_agent',
        'transport_agent',
        'dining_agent',
        'budget_critic',
        'finalize',
      ])
    })

    it('每个节点应该有 id、name 和 description', () => {
      const nodes = getWorkflowNodes()

      nodes.forEach(node => {
        expect(node).toHaveProperty('id')
        expect(node).toHaveProperty('name')
        expect(node).toHaveProperty('description')
        expect(node.id).toBeTruthy()
        expect(node.name).toBeTruthy()
        expect(node.description).toBeTruthy()
      })
    })

    it('节点名称应该是中文', () => {
      const nodes = getWorkflowNodes()

      // 验证中文名称
      expect(nodes.find(n => n.id === 'weather_scout')?.name).toBe('天气分析')
      expect(nodes.find(n => n.id === 'itinerary_planner')?.name).toBe('行程规划')
      expect(nodes.find(n => n.id === 'budget_critic')?.name).toBe('预算审计')
      expect(nodes.find(n => n.id === 'finalize')?.name).toBe('生成行程')
    })
  })

  describe('createTripPlanningWorkflow', () => {
    it('应该成功创建工作流', () => {
      const workflow = createTripPlanningWorkflow()
      expect(workflow).toBeDefined()
    })

    it('应该接受配置参数', () => {
      const workflow = createTripPlanningWorkflow({
        maxRetries: 5,
        checkpointer: false,
      })
      expect(workflow).toBeDefined()
    })

    it('应该接受 AI 配置参数', () => {
      const workflow = createTripPlanningWorkflow({
        ai: {
          apiKey: 'test-api-key',
          baseURL: 'https://test.api.com',
          model: 'test-model',
        },
      })
      expect(workflow).toBeDefined()
    })
  })

  describe('getTripPlanningWorkflow (单例模式)', () => {
    it('多次调用应该返回同一个实例', () => {
      const instance1 = getTripPlanningWorkflow()
      const instance2 = getTripPlanningWorkflow()

      expect(instance1).toBe(instance2)
    })

    it('配置变化后应该返回新实例', () => {
      const instance1 = getTripPlanningWorkflow({ maxRetries: 3 })
      const instance2 = getTripPlanningWorkflow({ maxRetries: 5 })

      expect(instance1).not.toBe(instance2)
    })

    it('resetTripPlanningWorkflow 应该清除单例', () => {
      const instance1 = getTripPlanningWorkflow()
      resetTripPlanningWorkflow()
      const instance2 = getTripPlanningWorkflow()

      // 重置后应该是新实例（虽然功能相同）
      expect(instance1).not.toBe(instance2)
    })
  })

  describe('Budget Critic 条件边逻辑', () => {
    // 这里我们直接测试 Budget Critic Agent 的逻辑
    const budgetCriticAgent = createBudgetCriticAgent()

    it('预算充足时应该返回 isWithinBudget: true', async () => {
      const state: TripState = {
        userInput: { ...mockUserInput, budget: 5000 },
        weather: null,
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 100 },
        accommodation: { recommendations: [], selected: null, totalCost: 500 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 100, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 200 },
        budgetResult: null,
        retryCount: 0,
        finalItinerary: null,
        meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
      }

      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.isWithinBudget).toBe(true)
      expect(result.budgetResult?.totalCost).toBe(900) // 500 + 100 + 200 + 100
      expect(result.retryCount).toBe(0)
    })

    it('预算超支时应该返回 isWithinBudget: false 和 feedback', async () => {
      const state: TripState = {
        userInput: { ...mockUserInput, budget: 500 }, // 低预算
        weather: null,
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 100 },
        accommodation: { recommendations: [], selected: null, totalCost: 800 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 200, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 300 },
        budgetResult: null,
        retryCount: 0,
        finalItinerary: null,
        meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
      }

      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.isWithinBudget).toBe(false)
      expect(result.budgetResult?.totalCost).toBe(1400) // 800 + 200 + 300 + 100
      expect(result.budgetResult?.feedback).toBeDefined()
      expect(result.retryCount).toBe(1) // 触发重试
    })

    it('允许 10% 的预算溢价', async () => {
      const state: TripState = {
        userInput: { ...mockUserInput, budget: 1000 },
        weather: null,
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 0 },
        accommodation: { recommendations: [], selected: null, totalCost: 500 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 200, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 350 }, // 总计 1050，在 10% 溢价内
        budgetResult: null,
        retryCount: 0,
        finalItinerary: null,
        meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
      }

      const result = await budgetCriticAgent(state)

      // 1050 <= 1000 * 1.1 = 1100，应该通过
      expect(result.budgetResult?.isWithinBudget).toBe(true)
      expect(result.budgetResult?.totalCost).toBe(1050)
    })

    it('重试次数增加时允许的溢价比例也增加', async () => {
      const baseState: TripState = {
        userInput: { ...mockUserInput, budget: 1000 },
        weather: null,
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 0 },
        accommodation: { recommendations: [], selected: null, totalCost: 600 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 200, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 350 }, // 总计 1150
        budgetResult: null,
        retryCount: 0,
        finalItinerary: null,
        meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
      }

      // retryCount = 0: 允许 10% 溢价，1150 > 1100，不通过
      const result0 = await budgetCriticAgent({ ...baseState, retryCount: 0 })
      expect(result0.budgetResult?.isWithinBudget).toBe(false)

      // retryCount = 1: 允许 15% 溢价，1150 = 1150，刚好通过
      const result1 = await budgetCriticAgent({ ...baseState, retryCount: 1 })
      expect(result1.budgetResult?.isWithinBudget).toBe(true)
    })

    it('应该根据成本占比生成不同的 feedback 策略', async () => {
      // 住宿成本最高的情况
      const state1: TripState = {
        userInput: { ...mockUserInput, budget: 500 },
        weather: null,
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 50 },
        accommodation: { recommendations: [], selected: null, totalCost: 1000 }, // 最高
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 100, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 150 },
        budgetResult: null,
        retryCount: 0,
        finalItinerary: null,
        meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
      }

      const result1 = await budgetCriticAgent(state1)
      expect(result1.budgetResult?.feedback?.action).toBe('downgrade_hotel')

      // 餐饮成本最高的情况
      const state2: TripState = {
        ...state1,
        accommodation: { recommendations: [], selected: null, totalCost: 100 },
        dining: { recommendations: [], totalCost: 1000 }, // 最高
      }

      const result2 = await budgetCriticAgent(state2)
      expect(result2.budgetResult?.feedback?.action).toBe('adjust_meals')
    })
  })

  describe('executeTripPlanningWorkflow (Mock 集成测试)', () => {
    it('应该成功执行完整工作流', async () => {
      // 由于所有 Agent 都被 mock 了，这个测试验证工作流能正确执行
      const result = await executeTripPlanningWorkflow(mockUserInput)

      expect(result).toBeDefined()
      expect(result.userInput).toEqual(mockUserInput)
      expect(result.weather).toBeDefined()
      expect(result.draftItinerary).toBeDefined()
      expect(result.accommodation).toBeDefined()
      expect(result.transport).toBeDefined()
      expect(result.dining).toBeDefined()
      expect(result.finalItinerary).toBeDefined()
    }, 30000)

    it('应该支持自定义 thread_id', async () => {
      const customThreadId = 'test-thread-123'
      const result = await executeTripPlanningWorkflow(mockUserInput, {
        thread_id: customThreadId,
      })

      expect(result).toBeDefined()
    }, 30000)
  })

  describe('工作流状态结构验证', () => {
    it('状态应该包含所有必要字段', async () => {
      const result = await executeTripPlanningWorkflow(mockUserInput)

      // 验证所有状态字段
      expect(result).toHaveProperty('userInput')
      expect(result).toHaveProperty('weather')
      expect(result).toHaveProperty('draftItinerary')
      expect(result).toHaveProperty('accommodation')
      expect(result).toHaveProperty('transport')
      expect(result).toHaveProperty('dining')
      expect(result).toHaveProperty('budgetResult')
      expect(result).toHaveProperty('retryCount')
      expect(result).toHaveProperty('finalItinerary')
      expect(result).toHaveProperty('meta')
    }, 30000)
  })
})

describe('Budget Result 结构验证', () => {
  const budgetCriticAgent = createBudgetCriticAgent()

  it('budgetResult 应该包含完整的成本明细', async () => {
    const state: TripState = {
      userInput: {
        destination: '杭州',
        start_date: '2025-12-01',
        end_date: '2025-12-03',
        budget: 5000,
        travelers: 2,
        adult_count: 2,
        child_count: 0,
        preferences: [],
      },
      weather: null,
      draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 200 },
      accommodation: { recommendations: [], selected: null, totalCost: 1000 },
      transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 500, recommendedModes: [] },
      dining: { recommendations: [], totalCost: 600 },
      budgetResult: null,
      retryCount: 0,
      finalItinerary: null,
      meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    }

    const result = await budgetCriticAgent(state)
    const budgetResult = result.budgetResult as BudgetResult

    expect(budgetResult.costBreakdown).toBeDefined()
    expect(budgetResult.costBreakdown.accommodation).toBe(1000)
    expect(budgetResult.costBreakdown.transport).toBe(500)
    expect(budgetResult.costBreakdown.dining).toBe(600)
    expect(budgetResult.costBreakdown.attractions).toBe(200)

    expect(budgetResult.totalCost).toBe(2300)
    expect(budgetResult.budgetUtilization).toBeCloseTo(0.46, 2) // 2300 / 5000
  })
})
