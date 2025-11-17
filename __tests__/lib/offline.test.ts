/**
 * lib/offline.ts 单元测试
 * 测试 IndexedDB 离线数据管理功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { offlineTrips, offlineExpenses } from '@/lib/offline'
import type { Trip, Expense } from '@/types'

// 模拟数据
const mockTrip: Trip = {
  id: 'trip-1',
  user_id: 'user-123',
  origin: '北京',
  destination: '上海',
  start_date: '2025-02-01',
  end_date: '2025-02-05',
  start_time: '09:00:00',
  end_time: '18:00:00',
  budget: 5000,
  travelers: 2,
  adult_count: 2,
  child_count: 0,
  preferences: ['美食', '文化'],
  itinerary: null,
  status: 'planned',
  share_token: null,
  is_public: false,
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
}

const mockExpense: Expense = {
  id: 'expense-1',
  trip_id: 'trip-1',
  category: 'food',
  amount: 150.5,
  description: '午餐',
  date: '2025-02-01',
  receipt_url: null,
  created_at: '2025-02-01T12:00:00Z',
  updated_at: '2025-02-01T12:00:00Z',
}

describe('Offline Storage Module', () => {
  beforeEach(() => {
    // 每个测试前重置 IndexedDB
    globalThis.indexedDB = new IDBFactory()
  })

  afterEach(() => {
    // 清理
    globalThis.indexedDB = new IDBFactory()
  })

  describe('offlineTrips.save() 和 getById()', () => {
    it('应该能够保存并读取行程数据', async () => {
      await offlineTrips.save(mockTrip)
      const retrieved = await offlineTrips.getById(mockTrip.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(mockTrip.id)
      expect(retrieved?.destination).toBe('上海')
      expect(retrieved?.budget).toBe(5000)
    })

    it('应该能够更新已存在的行程', async () => {
      // 先保存
      await offlineTrips.save(mockTrip)

      // 更新
      const updatedTrip = {
        ...mockTrip,
        budget: 6000,
        updated_at: '2025-01-16T10:00:00Z',
      }
      await offlineTrips.save(updatedTrip)

      // 验证更新
      const retrieved = await offlineTrips.getById(mockTrip.id)
      expect(retrieved?.budget).toBe(6000)
      expect(retrieved?.updated_at).toBe('2025-01-16T10:00:00Z')
    })

    it('查询不存在的 ID 应该返回 undefined', async () => {
      const result = await offlineTrips.getById('non-existent-id')
      expect(result).toBeUndefined()
    })
  })

  describe('offlineTrips.getAll()', () => {
    it('应该能够根据 user_id 获取所有行程', async () => {
      const trip1 = { ...mockTrip, id: 'trip-1', user_id: 'user-123' }
      const trip2 = { ...mockTrip, id: 'trip-2', user_id: 'user-123' }
      const trip3 = { ...mockTrip, id: 'trip-3', user_id: 'user-456' }

      await offlineTrips.saveMany([trip1, trip2, trip3])

      const user123Trips = await offlineTrips.getAll('user-123')
      expect(user123Trips).toHaveLength(2)
      expect(user123Trips.map(t => t.id)).toContain('trip-1')
      expect(user123Trips.map(t => t.id)).toContain('trip-2')
    })

    it('查询没有行程的用户应该返回空数组', async () => {
      const trips = await offlineTrips.getAll('user-with-no-trips')
      expect(trips).toEqual([])
    })
  })

  describe('offlineTrips.saveMany()', () => {
    it('应该能够批量保存多个行程', async () => {
      const trips = [
        { ...mockTrip, id: 'trip-1' },
        { ...mockTrip, id: 'trip-2' },
        { ...mockTrip, id: 'trip-3' },
      ]

      await offlineTrips.saveMany(trips)

      const allTrips = await offlineTrips.getAll(mockTrip.user_id)
      expect(allTrips).toHaveLength(3)
    })

    it('应该能够处理空数组', async () => {
      await expect(offlineTrips.saveMany([])).resolves.not.toThrow()
    })
  })

  describe('offlineTrips.delete()', () => {
    it('应该能够删除行程', async () => {
      await offlineTrips.save(mockTrip)

      // 确认存在
      let retrieved = await offlineTrips.getById(mockTrip.id)
      expect(retrieved).toBeDefined()

      // 删除
      await offlineTrips.delete(mockTrip.id)

      // 确认已删除
      retrieved = await offlineTrips.getById(mockTrip.id)
      expect(retrieved).toBeUndefined()
    })

    it('删除不存在的 ID 不应该抛出错误', async () => {
      await expect(offlineTrips.delete('non-existent-id')).resolves.not.toThrow()
    })
  })

  // 注意：offline.ts 没有 clear 方法，如果需要可以添加
  // describe('offlineTrips.clear()', () => { ... })

  describe('offlineExpenses 操作', () => {
    it('应该能够保存并读取费用数据', async () => {
      await offlineExpenses.save(mockExpense)
      const retrieved = await offlineExpenses.getById(mockExpense.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(mockExpense.id)
      expect(retrieved?.category).toBe('food')
      expect(retrieved?.amount).toBe(150.5)
    })

    it('应该能够根据 trip_id 获取所有费用', async () => {
      const expense1 = { ...mockExpense, id: 'expense-1', trip_id: 'trip-1' }
      const expense2 = { ...mockExpense, id: 'expense-2', trip_id: 'trip-1' }
      const expense3 = { ...mockExpense, id: 'expense-3', trip_id: 'trip-2' }

      await offlineExpenses.saveMany([expense1, expense2, expense3])

      const trip1Expenses = await offlineExpenses.getByTrip('trip-1')
      expect(trip1Expenses).toHaveLength(2)
      expect(trip1Expenses.map(e => e.id)).toContain('expense-1')
      expect(trip1Expenses.map(e => e.id)).toContain('expense-2')
    })

    it('应该能够删除费用', async () => {
      await offlineExpenses.save(mockExpense)
      await offlineExpenses.delete(mockExpense.id)

      const retrieved = await offlineExpenses.getById(mockExpense.id)
      expect(retrieved).toBeUndefined()
    })

    // 注意：offline.ts 没有 clearByTrip 方法，如果需要可以添加
    // it('应该能够清空行程的所有费用', async () => { ... })
  })

  describe('数据完整性测试', () => {
    it('应该正确存储复杂的 itinerary JSONB 数据', async () => {
      const tripWithItinerary = {
        ...mockTrip,
        itinerary: {
          days: [
            {
              day: 1,
              date: '2025-02-01',
              activities: [
                {
                  time: '09:00',
                  name: '外滩',
                  type: 'attraction' as const,
                  location: {
                    name: '外滩',
                    address: '上海市黄浦区中山东一路',
                    lat: 31.2397,
                    lng: 121.4912,
                  },
                  duration: '2小时',
                  description: '欣赏黄浦江美景',
                },
              ],
              meals: [],
            },
          ],
          accommodation: [],
          transportation: {
            to_destination: {
              method: '高铁',
              details: 'G1次',
              cost: 553,
            },
            from_destination: {
              method: '高铁',
              details: 'G2次',
              cost: 553,
            },
            local: {
              method: '地铁',
              daily_cost: 20,
            },
          },
          estimated_cost: {
            accommodation: 1000,
            transportation: 1126,
            food: 800,
            attractions: 500,
            shopping: 500,
            other: 74,
            total: 4000,
          },
          summary: '为期5天的上海之旅',
        },
      }

      await offlineTrips.save(tripWithItinerary)
      const retrieved = await offlineTrips.getById(tripWithItinerary.id)

      expect(retrieved?.itinerary).toBeDefined()
      expect(retrieved?.itinerary?.days).toHaveLength(1)
      expect(retrieved?.itinerary?.days[0].activities[0].name).toBe('外滩')
      expect(retrieved?.itinerary?.transportation.to_destination.cost).toBe(553)
    })

    it('应该保持 Date 字符串格式不变', async () => {
      const dateString = '2025-02-01'
      const tripWithDate = { ...mockTrip, start_date: dateString }

      await offlineTrips.save(tripWithDate)
      const retrieved = await offlineTrips.getById(tripWithDate.id)

      expect(retrieved?.start_date).toBe(dateString)
      expect(typeof retrieved?.start_date).toBe('string')
    })

    it('应该正确存储包含特殊字符的文本', async () => {
      const expenseWithSpecialChars = {
        ...mockExpense,
        description: '午餐@外滩·上海本帮菜（￥150.50）',
      }

      await offlineExpenses.save(expenseWithSpecialChars)
      const retrieved = await offlineExpenses.getById(expenseWithSpecialChars.id)

      expect(retrieved?.description).toBe('午餐@外滩·上海本帮菜（￥150.50）')
    })
  })

  describe('并发操作测试', () => {
    it('应该能够处理并发保存操作', async () => {
      const trips = Array.from({ length: 10 }, (_, i) => ({
        ...mockTrip,
        id: `trip-${i}`,
      }))

      // 并发保存
      await Promise.all(trips.map(trip => offlineTrips.save(trip)))

      const allTrips = await offlineTrips.getAll(mockTrip.user_id)
      expect(allTrips).toHaveLength(10)
    })

    it('应该能够处理并发读取操作', async () => {
      await offlineTrips.save(mockTrip)

      // 并发读取
      const results = await Promise.all(
        Array.from({ length: 10 }, () => offlineTrips.getById(mockTrip.id))
      )

      results.forEach(result => {
        expect(result?.id).toBe(mockTrip.id)
      })
    })
  })

  describe('边界情况测试', () => {
    it('应该能够存储 budget 为 0 的行程', async () => {
      const zeroBudgetTrip = { ...mockTrip, budget: 0 }
      await offlineTrips.save(zeroBudgetTrip)

      const retrieved = await offlineTrips.getById(zeroBudgetTrip.id)
      expect(retrieved?.budget).toBe(0)
    })

    it('应该能够存储 amount 为负数的费用（退款）', async () => {
      const refundExpense = { ...mockExpense, amount: -50 }
      await offlineExpenses.save(refundExpense)

      const retrieved = await offlineExpenses.getById(refundExpense.id)
      expect(retrieved?.amount).toBe(-50)
    })

    it('应该能够存储空 preferences 数组', async () => {
      const tripWithEmptyPreferences = { ...mockTrip, preferences: [] }
      await offlineTrips.save(tripWithEmptyPreferences)

      const retrieved = await offlineTrips.getById(tripWithEmptyPreferences.id)
      expect(retrieved?.preferences).toEqual([])
    })

    it('应该能够存储 null 值字段', async () => {
      const tripWithNulls = {
        ...mockTrip,
        origin: null,
        share_token: null,
        itinerary: null,
      }
      await offlineTrips.save(tripWithNulls)

      const retrieved = await offlineTrips.getById(tripWithNulls.id)
      expect(retrieved?.origin).toBeNull()
      expect(retrieved?.share_token).toBeNull()
      expect(retrieved?.itinerary).toBeNull()
    })
  })
})
