/**
 * Budget Critic Agent 单元测试
 * 测试预算审计逻辑、溢价计算、反馈策略生成
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { TripState, BudgetResult, BudgetFeedback } from '@/lib/agents/state'
import { createBudgetCriticAgent } from '@/lib/agents/nodes/budget-critic'

describe('Budget Critic Agent Unit Tests', () => {
  // 基础测试状态
  const createMockState = (overrides: Partial<TripState> = {}): TripState => ({
    userInput: {
      destination: '杭州',
      start_date: '2025-12-01',
      end_date: '2025-12-03',
      budget: 3000,
      travelers: 2,
      adult_count: 2,
      child_count: 0,
      preferences: [],
    },
    weather: null,
    draftItinerary: {
      days: [],
      totalAttractions: 5,
      totalMeals: 6,
      estimatedAttractionCost: 200,
    },
    accommodation: {
      recommendations: [],
      selected: null,
      totalCost: 800,
    },
    transport: {
      segments: [],
      totalTime: 120,
      totalDistance: 50000,
      totalCost: 300,
      recommendedModes: ['transit'],
    },
    dining: {
      recommendations: [],
      totalCost: 500,
    },
    budgetResult: null,
    retryCount: 0,
    finalItinerary: null,
    meta: { startTime: Date.now(), agentExecutions: [], errors: [] },
    ...overrides,
  })

  let budgetCriticAgent: ReturnType<typeof createBudgetCriticAgent>

  beforeEach(() => {
    budgetCriticAgent = createBudgetCriticAgent()
  })

  describe('createBudgetCriticAgent', () => {
    it('应该成功创建 Agent', () => {
      expect(budgetCriticAgent).toBeDefined()
      expect(typeof budgetCriticAgent).toBe('function')
    })
  })

  describe('成本汇总', () => {
    it('应该正确汇总所有成本', async () => {
      const state = createMockState()
      const result = await budgetCriticAgent(state)

      // 800 + 300 + 500 + 200 = 1800
      expect(result.budgetResult?.totalCost).toBe(1800)
    })

    it('缺失的成本项应该按 0 计算', async () => {
      const state = createMockState({
        accommodation: null,
        transport: null,
      })
      const result = await budgetCriticAgent(state)

      // 0 + 0 + 500 + 200 = 700
      expect(result.budgetResult?.totalCost).toBe(700)
    })

    it('应该正确计算成本明细', async () => {
      const state = createMockState()
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.costBreakdown).toEqual({
        accommodation: 800,
        transport: 300,
        dining: 500,
        attractions: 200,
      })
    })
  })

  describe('预算利用率', () => {
    it('应该正确计算预算利用率', async () => {
      const state = createMockState()
      const result = await budgetCriticAgent(state)

      // 1800 / 3000 = 0.6
      expect(result.budgetResult?.budgetUtilization).toBeCloseTo(0.6, 2)
    })

    it('超预算时利用率应该大于 1', async () => {
      const state = createMockState({
        userInput: {
          ...createMockState().userInput,
          budget: 1000, // 低预算
        },
      })
      const result = await budgetCriticAgent(state)

      // 1800 / 1000 = 1.8
      expect(result.budgetResult?.budgetUtilization).toBeCloseTo(1.8, 2)
    })
  })

  describe('预算判断 (isWithinBudget)', () => {
    it('成本在预算内应该返回 true', async () => {
      const state = createMockState() // 预算 3000，成本 1800
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })

    it('成本正好等于预算应该返回 true', async () => {
      const state = createMockState({
        userInput: {
          ...createMockState().userInput,
          budget: 1800,
        },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })

    it('成本在 10% 溢价内应该返回 true', async () => {
      const state = createMockState({
        userInput: {
          ...createMockState().userInput,
          budget: 1700, // 1800 / 1700 = 1.058，在 10% 内
        },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })

    it('成本超过 10% 溢价应该返回 false', async () => {
      const state = createMockState({
        userInput: {
          ...createMockState().userInput,
          budget: 1500, // 1800 / 1500 = 1.2，超过 10%
        },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.isWithinBudget).toBe(false)
    })
  })

  describe('动态溢价允许范围', () => {
    it('retryCount=0 时允许 10% 溢价', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1640 },
        retryCount: 0,
      })
      const result = await budgetCriticAgent(state)

      // 1800 / 1640 = 1.097，在 10% 内
      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })

    it('retryCount=1 时允许 15% 溢价', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1600 },
        retryCount: 1,
      })
      const result = await budgetCriticAgent(state)

      // 1800 / 1600 = 1.125，在 15% 内
      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })

    it('retryCount=2 时允许 20% 溢价', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1550 },
        retryCount: 2,
      })
      const result = await budgetCriticAgent(state)

      // 1800 / 1550 = 1.16，在 20% 内
      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })
  })

  describe('retryCount 更新', () => {
    it('预算通过时 retryCount 应该返回 0', async () => {
      const state = createMockState()
      const result = await budgetCriticAgent(state)

      expect(result.retryCount).toBe(0)
    })

    it('预算超支时 retryCount 应该返回 1（触发累加）', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1000 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.retryCount).toBe(1)
    })
  })

  describe('反馈策略生成', () => {
    it('预算通过时不应该有 feedback', async () => {
      const state = createMockState()
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.feedback).toBeUndefined()
    })

    it('预算超支时应该有 feedback', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1000 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.feedback).toBeDefined()
      expect(result.budgetResult?.feedback?.action).toBeDefined()
      expect(result.budgetResult?.feedback?.targetReduction).toBeDefined()
      expect(result.budgetResult?.feedback?.suggestion).toBeDefined()
    })

    it('住宿成本最高时应该建议降级酒店', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1000 },
        accommodation: { recommendations: [], selected: null, totalCost: 1000 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 100, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 200 },
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 100 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.feedback?.action).toBe('downgrade_hotel')
    })

    it('餐饮成本最高时应该建议调整用餐', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1000 },
        accommodation: { recommendations: [], selected: null, totalCost: 200 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 100, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 1000 },
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 100 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.feedback?.action).toBe('adjust_meals')
    })

    it('交通成本最高时应该建议更便宜的交通', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1000 },
        accommodation: { recommendations: [], selected: null, totalCost: 200 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 1000, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 200 },
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 100 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.feedback?.action).toBe('cheaper_transport')
    })

    it('景点成本最高时应该建议减少景点', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1000 },
        accommodation: { recommendations: [], selected: null, totalCost: 200 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 100, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 200 },
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 1000 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.feedback?.action).toBe('reduce_attractions')
    })

    it('重试时应该尝试不同的策略', async () => {
      const baseState = {
        userInput: { ...createMockState().userInput, budget: 1000 },
        accommodation: { recommendations: [], selected: null, totalCost: 500 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 400, recommendedModes: [] as any },
        dining: { recommendations: [], totalCost: 300 },
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 200 },
      }

      // 第一次：应该选择住宿（最高 500）
      const result0 = await budgetCriticAgent(createMockState({ ...baseState, retryCount: 0 }))
      expect(result0.budgetResult?.feedback?.action).toBe('downgrade_hotel')

      // 第二次：应该选择交通（第二高 400）
      const result1 = await budgetCriticAgent(createMockState({ ...baseState, retryCount: 1 }))
      expect(result1.budgetResult?.feedback?.action).toBe('cheaper_transport')

      // 第三次：应该选择餐饮（第三高 300）
      const result2 = await budgetCriticAgent(createMockState({ ...baseState, retryCount: 2 }))
      expect(result2.budgetResult?.feedback?.action).toBe('adjust_meals')
    })

    it('targetReduction 应该等于超支金额', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 1500 },
      })
      const result = await budgetCriticAgent(state)

      // 1800 - 1500 = 300
      expect(result.budgetResult?.feedback?.targetReduction).toBe(300)
    })
  })

  describe('边界情况', () => {
    it('预算为 0 时应该正确处理', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 0 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.isWithinBudget).toBe(false)
      expect(result.budgetResult?.budgetUtilization).toBe(Infinity)
    })

    it('所有成本为 0 时应该通过', async () => {
      const state = createMockState({
        accommodation: { recommendations: [], selected: null, totalCost: 0 },
        transport: { segments: [], totalTime: 0, totalDistance: 0, totalCost: 0, recommendedModes: [] },
        dining: { recommendations: [], totalCost: 0 },
        draftItinerary: { days: [], totalAttractions: 0, totalMeals: 0, estimatedAttractionCost: 0 },
      })
      const result = await budgetCriticAgent(state)

      expect(result.budgetResult?.totalCost).toBe(0)
      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })

    it('高预算低成本时应该显示低利用率', async () => {
      const state = createMockState({
        userInput: { ...createMockState().userInput, budget: 100000 },
      })
      const result = await budgetCriticAgent(state)

      // 1800 / 100000 = 0.018
      expect(result.budgetResult?.budgetUtilization).toBeCloseTo(0.018, 3)
      expect(result.budgetResult?.isWithinBudget).toBe(true)
    })
  })
})
