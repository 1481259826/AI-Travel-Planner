/**
 * TripState 状态模块单元测试
 * 测试状态类型定义和 Annotation 配置
 */

import { describe, it, expect } from 'vitest'
import { TripStateAnnotation } from '@/lib/agents/state'
import type {
  TripState,
  TripStateUpdate,
  WeatherOutput,
  DraftItinerary,
  AccommodationResult,
  TransportResult,
  DiningResult,
  BudgetResult,
  StrategyTag,
  BudgetFeedbackAction,
} from '@/lib/agents/state'

describe('TripState Annotation Tests', () => {
  describe('TripStateAnnotation 定义', () => {
    it('应该成功导出 TripStateAnnotation', () => {
      expect(TripStateAnnotation).toBeDefined()
    })

    it('应该有正确的状态字段', () => {
      // TripStateAnnotation.State 类型应该包含所有字段
      // 这里我们通过创建一个符合类型的对象来验证
      const validState: TripState = {
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
        draftItinerary: null,
        accommodation: null,
        transport: null,
        dining: null,
        budgetResult: null,
        retryCount: 0,
        finalItinerary: null,
        meta: {
          startTime: Date.now(),
          agentExecutions: [],
          errors: [],
        },
      }

      expect(validState).toBeDefined()
      expect(validState.userInput.destination).toBe('杭州')
    })
  })

  describe('StrategyTag 类型', () => {
    it('应该支持所有有效的策略标签', () => {
      const validTags: StrategyTag[] = [
        'indoor_priority',
        'outdoor_friendly',
        'rain_prepared',
        'cold_weather',
        'hot_weather',
      ]

      expect(validTags).toHaveLength(5)
      validTags.forEach(tag => {
        expect(typeof tag).toBe('string')
      })
    })
  })

  describe('WeatherOutput 类型', () => {
    it('应该支持完整的天气输出结构', () => {
      const weatherOutput: WeatherOutput = {
        forecasts: [
          {
            date: '2025-12-01',
            dayweather: '晴',
            nightweather: '晴',
            daytemp: '15',
            nighttemp: '5',
            daywind: '东风',
            nightwind: '东风',
            daypower: '3',
            nightpower: '3',
          },
        ],
        strategyTags: ['outdoor_friendly'],
        clothingAdvice: '天气适宜出行',
        warnings: [],
      }

      expect(weatherOutput.forecasts).toHaveLength(1)
      expect(weatherOutput.strategyTags).toContain('outdoor_friendly')
    })
  })

  describe('DraftItinerary 类型', () => {
    it('应该支持完整的草稿行程结构', () => {
      const draft: DraftItinerary = {
        days: [
          {
            day: 1,
            date: '2025-12-01',
            attractions: [
              {
                time: '09:00',
                name: '西湖',
                duration: '3小时',
                type: 'attraction',
              },
            ],
            mealSlots: [
              {
                time: '12:00',
                mealType: 'lunch',
                cuisine: '杭帮菜',
              },
            ],
          },
        ],
        totalAttractions: 1,
        totalMeals: 1,
        estimatedAttractionCost: 50,
      }

      expect(draft.days).toHaveLength(1)
      expect(draft.days[0].attractions[0].name).toBe('西湖')
    })
  })

  describe('AccommodationResult 类型', () => {
    it('应该支持完整的住宿结果结构', () => {
      const accommodation: AccommodationResult = {
        recommendations: [
          {
            name: '测试酒店',
            address: '杭州市西湖区',
            price_per_night: 500,
            star_rating: 4,
            location: {
              name: '测试酒店',
              address: '杭州市西湖区',
              lat: 30.25,
              lng: 120.16,
            },
            nights: 2,
            distanceFromCenter: 2.5,
            matchScore: 0.85,
          },
        ],
        selected: null,
        totalCost: 1000,
        centroidLocation: {
          name: '行程中心',
          address: '杭州市',
          lat: 30.25,
          lng: 120.16,
        },
      }

      expect(accommodation.totalCost).toBe(1000)
      expect(accommodation.recommendations).toHaveLength(1)
    })
  })

  describe('TransportResult 类型', () => {
    it('应该支持完整的交通结果结构', () => {
      const transport: TransportResult = {
        segments: [
          {
            from: { name: '酒店', address: '地址A', lat: 30.25, lng: 120.16 },
            to: { name: '西湖', address: '地址B', lat: 30.26, lng: 120.15 },
            mode: 'transit',
            duration: 30,
            distance: 5000,
            cost: 4,
          },
        ],
        totalTime: 30,
        totalDistance: 5000,
        totalCost: 4,
        recommendedModes: ['transit', 'walking'],
      }

      expect(transport.segments).toHaveLength(1)
      expect(transport.totalCost).toBe(4)
    })
  })

  describe('DiningResult 类型', () => {
    it('应该支持完整的餐饮结果结构', () => {
      const dining: DiningResult = {
        recommendations: [
          {
            name: '外婆家',
            cuisine: '杭帮菜',
            price_range: '人均80元',
            location: {
              name: '外婆家',
              address: '杭州市西湖区',
              lat: 30.25,
              lng: 120.16,
            },
            rating: 4.5,
            photos: ['photo1.jpg'],
            openHours: '10:00-22:00',
          },
        ],
        totalCost: 200,
      }

      expect(dining.recommendations).toHaveLength(1)
      expect(dining.totalCost).toBe(200)
    })
  })

  describe('BudgetResult 类型', () => {
    it('应该支持完整的预算结果结构（通过）', () => {
      const budgetResult: BudgetResult = {
        totalCost: 2000,
        budgetUtilization: 0.67,
        isWithinBudget: true,
        costBreakdown: {
          accommodation: 800,
          transport: 300,
          dining: 500,
          attractions: 400,
        },
      }

      expect(budgetResult.isWithinBudget).toBe(true)
      expect(budgetResult.feedback).toBeUndefined()
    })

    it('应该支持完整的预算结果结构（超支）', () => {
      const budgetResult: BudgetResult = {
        totalCost: 5000,
        budgetUtilization: 1.67,
        isWithinBudget: false,
        costBreakdown: {
          accommodation: 2000,
          transport: 1000,
          dining: 1200,
          attractions: 800,
        },
        feedback: {
          action: 'downgrade_hotel',
          targetReduction: 2000,
          suggestion: '建议选择更经济的住宿，可节省约 20-30%',
        },
      }

      expect(budgetResult.isWithinBudget).toBe(false)
      expect(budgetResult.feedback).toBeDefined()
      expect(budgetResult.feedback?.action).toBe('downgrade_hotel')
    })
  })

  describe('BudgetFeedbackAction 类型', () => {
    it('应该支持所有有效的反馈行动', () => {
      const validActions: BudgetFeedbackAction[] = [
        'downgrade_hotel',
        'reduce_attractions',
        'cheaper_transport',
        'adjust_meals',
      ]

      expect(validActions).toHaveLength(4)
    })
  })

  describe('TripStateUpdate 类型', () => {
    it('应该支持部分状态更新', () => {
      const weatherUpdate: TripStateUpdate = {
        weather: {
          forecasts: [],
          strategyTags: ['outdoor_friendly'],
          clothingAdvice: '天气适宜',
          warnings: [],
        },
      }

      expect(weatherUpdate.weather).toBeDefined()
    })

    it('应该支持多个字段同时更新', () => {
      const multiUpdate: TripStateUpdate = {
        budgetResult: {
          totalCost: 1000,
          budgetUtilization: 0.5,
          isWithinBudget: true,
          costBreakdown: {
            accommodation: 400,
            transport: 200,
            dining: 300,
            attractions: 100,
          },
        },
        retryCount: 0,
      }

      expect(multiUpdate.budgetResult).toBeDefined()
      expect(multiUpdate.retryCount).toBe(0)
    })
  })

  describe('Meta 字段结构', () => {
    it('应该支持 Agent 执行记录', () => {
      const meta: TripState['meta'] = {
        startTime: Date.now(),
        agentExecutions: [
          {
            agent: 'weather_scout',
            startTime: Date.now() - 1000,
            endTime: Date.now(),
            duration: 1000,
            status: 'success',
            toolCalls: [
              {
                tool: 'getWeatherForecast',
                input: { city: '杭州' },
                output: { forecasts: [] },
                duration: 500,
                timestamp: Date.now() - 500,
              },
            ],
          },
        ],
        errors: [],
      }

      expect(meta.agentExecutions).toHaveLength(1)
      expect(meta.agentExecutions[0].status).toBe('success')
    })

    it('应该支持错误记录', () => {
      const meta: TripState['meta'] = {
        startTime: Date.now(),
        agentExecutions: [],
        errors: [
          {
            agent: 'transport_agent',
            error: 'API 请求超时',
            timestamp: Date.now(),
          },
        ],
      }

      expect(meta.errors).toHaveLength(1)
      expect(meta.errors[0].agent).toBe('transport_agent')
    })
  })
})

describe('类型兼容性测试', () => {
  it('TripState 应该与 TripFormData 兼容', () => {
    // userInput 应该能接受 TripFormData 类型
    const formData = {
      destination: '杭州',
      start_date: '2025-12-01',
      end_date: '2025-12-03',
      budget: 3000,
      travelers: 2,
      adult_count: 2,
      child_count: 0,
      preferences: ['文化历史'],
    }

    const state: Partial<TripState> = {
      userInput: formData,
    }

    expect(state.userInput?.destination).toBe('杭州')
  })

  it('finalItinerary 应该与 Itinerary 类型兼容', () => {
    // 这个测试确保 finalItinerary 可以存储完整的行程数据
    const itinerary = {
      days: [
        {
          day: 1,
          date: '2025-12-01',
          activities: [],
          meals: [],
        },
      ],
      accommodation: [],
      transportation: {
        to_destination: { method: '高铁', details: 'G1次', cost: 200 },
        from_destination: { method: '高铁', details: 'G2次', cost: 200 },
        local: { method: '公共交通', daily_cost: 30 },
      },
      estimated_cost: {
        accommodation: 800,
        transportation: 430,
        food: 500,
        attractions: 200,
        shopping: 0,
        other: 0,
        total: 1930,
      },
      summary: '为期3天的杭州之旅',
    }

    const state: Partial<TripState> = {
      finalItinerary: itinerary,
    }

    expect(state.finalItinerary?.summary).toBe('为期3天的杭州之旅')
  })
})
