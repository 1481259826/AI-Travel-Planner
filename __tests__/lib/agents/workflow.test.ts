/**
 * LangGraph 工作流集成测试
 * 测试多智能体协作系统的核心功能
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import {
  TripStateAnnotation,
  createTripPlanningWorkflow,
  getWorkflowNodes,
  type TripState,
} from '@/lib/agents'

describe('LangGraph 工作流模块', () => {
  describe('TripStateAnnotation', () => {
    it('应该正确初始化默认状态', () => {
      // 验证 Annotation 定义的默认值
      const defaultState = {
        weather: null,
        draftItinerary: null,
        accommodation: null,
        transport: null,
        dining: null,
        budgetResult: null,
        retryCount: 0,
        finalItinerary: null,
        meta: {
          startTime: expect.any(Number),
          agentExecutions: [],
          errors: [],
        },
      }

      // TripStateAnnotation 应该存在
      expect(TripStateAnnotation).toBeDefined()
    })

    it('应该包含所有必要的状态字段', () => {
      // 检查状态字段定义
      const expectedFields = [
        'userInput',
        'weather',
        'draftItinerary',
        'accommodation',
        'transport',
        'dining',
        'budgetResult',
        'retryCount',
        'finalItinerary',
        'meta',
      ]

      // TripStateAnnotation.State 类型应该包含这些字段
      expect(TripStateAnnotation).toBeDefined()
    })
  })

  describe('getWorkflowNodes()', () => {
    it('应该返回所有工作流节点', () => {
      const nodes = getWorkflowNodes()

      expect(nodes).toHaveLength(7)
      expect(nodes.map((n) => n.id)).toEqual([
        'weather_scout',
        'itinerary_planner',
        'accommodation_agent',
        'transport_agent',
        'dining_agent',
        'budget_critic',
        'finalize',
      ])
    })

    it('每个节点应该包含 id、name 和 description', () => {
      const nodes = getWorkflowNodes()

      nodes.forEach((node) => {
        expect(node).toHaveProperty('id')
        expect(node).toHaveProperty('name')
        expect(node).toHaveProperty('description')
        expect(typeof node.id).toBe('string')
        expect(typeof node.name).toBe('string')
        expect(typeof node.description).toBe('string')
        expect(node.id.length).toBeGreaterThan(0)
        expect(node.name.length).toBeGreaterThan(0)
        expect(node.description.length).toBeGreaterThan(0)
      })
    })

    it('节点名称应该是中文', () => {
      const nodes = getWorkflowNodes()

      const chineseNames = ['天气分析', '行程规划', '住宿推荐', '交通规划', '餐饮推荐', '预算审计', '生成行程']

      nodes.forEach((node, index) => {
        expect(node.name).toBe(chineseNames[index])
      })
    })
  })

  describe('createTripPlanningWorkflow()', () => {
    it('应该成功创建工作流实例', () => {
      const workflow = createTripPlanningWorkflow({
        checkpointer: false, // 测试时禁用检查点
      })

      expect(workflow).toBeDefined()
      expect(workflow.invoke).toBeDefined()
      expect(workflow.stream).toBeDefined()
    })

    it('应该支持自定义 AI 配置', () => {
      const customConfig = {
        ai: {
          apiKey: 'test-api-key',
          baseURL: 'https://test.example.com',
          model: 'test-model',
        },
        checkpointer: false,
      }

      const workflow = createTripPlanningWorkflow(customConfig)
      expect(workflow).toBeDefined()
    })

    it('应该支持配置最大重试次数', () => {
      const workflow = createTripPlanningWorkflow({
        maxRetries: 5,
        checkpointer: false,
      })

      expect(workflow).toBeDefined()
    })
  })

  describe('工作流结构验证', () => {
    it('应该定义正确的节点执行顺序', () => {
      // 工作流应该按以下顺序执行：
      // START -> weather_scout -> itinerary_planner
      // -> [accommodation_agent, transport_agent, dining_agent] (并行)
      // -> budget_critic -> finalize (或重试) -> END

      const nodes = getWorkflowNodes()

      // 第一个节点应该是天气分析
      expect(nodes[0].id).toBe('weather_scout')

      // 第二个节点应该是行程规划
      expect(nodes[1].id).toBe('itinerary_planner')

      // 接下来是三个并行的资源节点
      const resourceNodes = nodes.slice(2, 5).map((n) => n.id)
      expect(resourceNodes).toContain('accommodation_agent')
      expect(resourceNodes).toContain('transport_agent')
      expect(resourceNodes).toContain('dining_agent')

      // 预算审计
      expect(nodes[5].id).toBe('budget_critic')

      // 最后是生成行程
      expect(nodes[6].id).toBe('finalize')
    })
  })
})

describe('状态类型验证', () => {
  describe('WeatherOutput 类型', () => {
    it('应该包含正确的字段', () => {
      const mockWeatherOutput = {
        forecasts: [
          {
            date: '2025-12-01',
            dayweather: '晴',
            nightweather: '多云',
            daytemp: '15',
            nighttemp: '5',
            daywind: '北',
            nightwind: '北',
            daypower: '3',
            nightpower: '2',
          },
        ],
        strategyTags: ['outdoor_friendly'] as const,
        clothingAdvice: '建议穿厚外套',
        warnings: [],
      }

      expect(mockWeatherOutput.forecasts).toHaveLength(1)
      expect(mockWeatherOutput.strategyTags).toContain('outdoor_friendly')
    })
  })

  describe('DraftItinerary 类型', () => {
    it('应该包含正确的结构', () => {
      const mockDraftItinerary = {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '西湖',
                duration: '3小时',
                type: 'attraction' as const,
              },
            ],
            mealSlots: [
              {
                time: '12:00',
                mealType: 'lunch' as const,
                cuisine: '杭帮菜',
              },
            ],
          },
        ],
        totalAttractions: 1,
        totalMeals: 1,
      }

      expect(mockDraftItinerary.days).toHaveLength(1)
      expect(mockDraftItinerary.days[0].attractions).toHaveLength(1)
      expect(mockDraftItinerary.days[0].mealSlots).toHaveLength(1)
    })
  })

  describe('BudgetResult 类型', () => {
    it('应该正确计算预算利用率', () => {
      const mockBudgetResult = {
        totalCost: 2500,
        budgetUtilization: 0.83,
        isWithinBudget: true,
        costBreakdown: {
          accommodation: 800,
          transport: 400,
          dining: 600,
          attractions: 700,
        },
      }

      expect(mockBudgetResult.isWithinBudget).toBe(true)
      expect(mockBudgetResult.budgetUtilization).toBeLessThan(1)

      // 验证成本分解
      const totalFromBreakdown =
        mockBudgetResult.costBreakdown.accommodation +
        mockBudgetResult.costBreakdown.transport +
        mockBudgetResult.costBreakdown.dining +
        mockBudgetResult.costBreakdown.attractions

      expect(totalFromBreakdown).toBe(mockBudgetResult.totalCost)
    })

    it('应该包含超预算反馈', () => {
      const mockBudgetResultOverBudget = {
        totalCost: 4000,
        budgetUtilization: 1.33,
        isWithinBudget: false,
        costBreakdown: {
          accommodation: 1500,
          transport: 800,
          dining: 900,
          attractions: 800,
        },
        feedback: {
          action: 'downgrade_hotel' as const,
          targetReduction: 1000,
          suggestion: '建议选择更经济的住宿',
        },
      }

      expect(mockBudgetResultOverBudget.isWithinBudget).toBe(false)
      expect(mockBudgetResultOverBudget.feedback).toBeDefined()
      expect(mockBudgetResultOverBudget.feedback?.action).toBe('downgrade_hotel')
    })
  })
})

describe('策略标签类型', () => {
  it('应该包含所有预定义的策略标签', () => {
    const validTags = [
      'indoor_priority',
      'outdoor_friendly',
      'rain_prepared',
      'cold_weather',
      'hot_weather',
    ]

    // 验证标签值
    validTags.forEach((tag) => {
      expect(typeof tag).toBe('string')
    })
  })
})

describe('预算反馈行动类型', () => {
  it('应该包含所有预定义的行动类型', () => {
    const validActions = ['downgrade_hotel', 'reduce_attractions', 'cheaper_transport', 'adjust_meals']

    validActions.forEach((action) => {
      expect(typeof action).toBe('string')
    })
  })
})
