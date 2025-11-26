/**
 * LangGraph 工作流测试
 * 验证工作流可以正常执行
 */

import { describe, it, expect } from 'vitest'
import { executeTripPlanningWorkflow } from '../workflow'
import type { TripFormData } from '@/types'

describe('LangGraph Workflow', () => {
  it('should execute workflow with valid input', async () => {
    // 准备测试数据
    const userInput: TripFormData = {
      destination: '杭州',
      start_date: '2025-12-01',
      end_date: '2025-12-03',
      budget: 3000,
      travelers: 2,
      adult_count: 2,
      child_count: 0,
      preferences: ['文化历史', '自然风光'],
    }

    // 执行工作流
    const result = await executeTripPlanningWorkflow(userInput)

    // 验证结果
    expect(result).toBeDefined()
    expect(result.userInput).toEqual(userInput)
    expect(result.weather).toBeDefined()
    expect(result.draftItinerary).toBeDefined()
    expect(result.accommodation).toBeDefined()
    expect(result.transport).toBeDefined()
    expect(result.dining).toBeDefined()
    expect(result.budgetResult).toBeDefined()
    expect(result.finalItinerary).toBeDefined()
  }, 30000) // 30 秒超时

  it('should have correct state structure', async () => {
    const userInput: TripFormData = {
      destination: '北京',
      start_date: '2025-12-10',
      end_date: '2025-12-12',
      budget: 2000,
      travelers: 1,
      adult_count: 1,
      child_count: 0,
      preferences: ['美食'],
    }

    const result = await executeTripPlanningWorkflow(userInput)

    // 验证状态结构
    expect(result.meta).toBeDefined()
    expect(result.meta.startTime).toBeGreaterThan(0)
    expect(Array.isArray(result.meta.agentExecutions)).toBe(true)
    expect(Array.isArray(result.meta.errors)).toBe(true)
  }, 30000)

  it('should handle budget constraint', async () => {
    const userInput: TripFormData = {
      destination: '上海',
      start_date: '2025-12-15',
      end_date: '2025-12-17',
      budget: 100, // 极低预算，应该触发重试
      travelers: 1,
      adult_count: 1,
      child_count: 0,
      preferences: [],
    }

    const result = await executeTripPlanningWorkflow(userInput)

    // 验证预算结果
    expect(result.budgetResult).toBeDefined()
    expect(result.budgetResult?.totalCost).toBeGreaterThanOrEqual(0)
    expect(result.budgetResult?.budgetUtilization).toBeDefined()

    // 如果预算超支，应该有重试计数
    if (!result.budgetResult?.isWithinBudget) {
      expect(result.retryCount).toBeGreaterThan(0)
    }
  }, 30000)
})
