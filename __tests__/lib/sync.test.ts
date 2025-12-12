/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  startSync,
  stopAutoSync,
  startAutoSync,
  startNetworkMonitoring,
  stopNetworkMonitoring,
  onSyncStatusChange,
  getSyncStats,
  cacheTripsFromServer,
  cacheExpensesFromServer,
  forceFullSync,
  type SyncStatus,
} from '@/lib/sync'
import type { Trip, Expense } from '@/types'

// Mock dependencies
vi.mock('@/lib/database', () => ({
  db: {
    trips: {
      getAll: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expenses: {
      getById: vi.fn(),
      getByTrip: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/offline', () => ({
  offlineTrips: {
    save: vi.fn(),
    saveMany: vi.fn(),
    getAll: vi.fn(),
  },
  offlineExpenses: {
    save: vi.fn(),
    saveMany: vi.fn(),
  },
  syncQueue: {
    getPending: vi.fn(),
    updateStatus: vi.fn(),
    clearSynced: vi.fn(),
    getAll: vi.fn(),
  },
  resolveConflict: vi.fn((local, remote) => {
    // Simple mock: return the one with later updated_at
    const localTime = new Date(local.updated_at || 0).getTime()
    const remoteTime = new Date(remote.updated_at || 0).getTime()
    return localTime > remoteTime ? local : remote
  }),
}))

import { db } from '@/lib/database'
import { syncQueue, offlineTrips, offlineExpenses } from '@/lib/offline'

describe('sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset navigator.onLine to true by default
    vi.stubGlobal('navigator', { onLine: true })
  })

  afterEach(() => {
    stopAutoSync()
    stopNetworkMonitoring()
  })

  describe('startSync', () => {
    it('应该在离线时不执行同步', async () => {
      vi.stubGlobal('navigator', { onLine: false })
      vi.mocked(syncQueue.getPending).mockResolvedValue([])

      await startSync()

      // 应该不会调用 syncQueue 的方法
      expect(syncQueue.getPending).not.toHaveBeenCalled()
    })

    it('应该在没有待同步项时成功完成', async () => {
      vi.mocked(syncQueue.getPending).mockResolvedValue([])

      await startSync()

      expect(syncQueue.getPending).toHaveBeenCalled()
      expect(syncQueue.clearSynced).toHaveBeenCalled()
    })

    it('应该上传待同步的行程更新', async () => {
      const mockTrip: Trip = {
        id: 'trip-1',
        user_id: 'user-1',
        destination: '北京',
        start_date: '2025-01-20',
        end_date: '2025-01-22',
        status: 'planned',
        created_at: '2025-01-18T10:00:00Z',
        updated_at: '2025-01-18T11:00:00Z',
      }

      vi.mocked(syncQueue.getPending).mockResolvedValue([
        {
          id: 1,
          entity: 'trip',
          entityId: 'trip-1',
          type: 'update',
          data: mockTrip,
          status: 'pending',
          createdAt: new Date(),
        },
      ])

      vi.mocked(db.trips.getById).mockResolvedValue({ data: null, error: null })
      vi.mocked(db.trips.update).mockResolvedValue({ data: mockTrip, error: null })

      await startSync()

      expect(syncQueue.updateStatus).toHaveBeenCalledWith(1, 'syncing')
      expect(db.trips.update).toHaveBeenCalledWith('trip-1', mockTrip)
      expect(syncQueue.updateStatus).toHaveBeenCalledWith(1, 'synced')
    })

    it('应该处理同步失败的情况', async () => {
      vi.mocked(syncQueue.getPending).mockResolvedValue([
        {
          id: 1,
          entity: 'trip',
          entityId: 'trip-1',
          type: 'update',
          data: {},
          status: 'pending',
          createdAt: new Date(),
        },
      ])

      const error = new Error('Network error')
      vi.mocked(db.trips.getById).mockRejectedValue(error)

      await startSync()

      expect(syncQueue.updateStatus).toHaveBeenCalledWith(1, 'failed', 'Network error')
    })

    it('应该解决冲突（使用 Last-Write-Wins 策略）', async () => {
      const localTrip: Trip = {
        id: 'trip-1',
        user_id: 'user-1',
        destination: '北京',
        start_date: '2025-01-20',
        end_date: '2025-01-22',
        status: 'planned',
        created_at: '2025-01-18T10:00:00Z',
        updated_at: '2025-01-18T12:00:00Z', // 更新的本地版本
      }

      const remoteTrip: Trip = {
        id: 'trip-1',
        user_id: 'user-1',
        destination: '北京',
        start_date: '2025-01-20',
        end_date: '2025-01-22',
        status: 'ongoing',
        created_at: '2025-01-18T10:00:00Z',
        updated_at: '2025-01-18T11:00:00Z', // 较旧的远程版本
      }

      vi.mocked(syncQueue.getPending).mockResolvedValue([
        {
          id: 1,
          entity: 'trip',
          entityId: 'trip-1',
          type: 'update',
          data: localTrip,
          status: 'pending',
          createdAt: new Date(),
        },
      ])

      vi.mocked(db.trips.getById).mockResolvedValue({ data: remoteTrip, error: null })
      vi.mocked(db.trips.update).mockResolvedValue({ data: localTrip, error: null })

      await startSync()

      // 应该上传本地版本（因为它更新）
      expect(db.trips.update).toHaveBeenCalledWith('trip-1', expect.objectContaining({
        updated_at: '2025-01-18T12:00:00Z',
      }))
    })

    it('应该处理删除操作', async () => {
      vi.mocked(syncQueue.getPending).mockResolvedValue([
        {
          id: 1,
          entity: 'trip',
          entityId: 'trip-1',
          type: 'delete',
          data: null,
          status: 'pending',
          createdAt: new Date(),
        },
      ])

      vi.mocked(db.trips.delete).mockResolvedValue({ error: null })

      await startSync()

      expect(db.trips.delete).toHaveBeenCalledWith('trip-1')
      expect(syncQueue.updateStatus).toHaveBeenCalledWith(1, 'synced')
    })

    it('应该处理费用同步', async () => {
      const mockExpense: Expense = {
        id: 'expense-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        amount: 100,
        category: 'food',
        description: '午餐',
        date: '2025-01-20',
        created_at: '2025-01-18T10:00:00Z',
        updated_at: '2025-01-18T11:00:00Z',
      }

      vi.mocked(syncQueue.getPending).mockResolvedValue([
        {
          id: 1,
          entity: 'expense',
          entityId: 'expense-1',
          type: 'update',
          data: mockExpense,
          status: 'pending',
          createdAt: new Date(),
        },
      ])

      vi.mocked(db.expenses.getById).mockResolvedValue({ data: null })
      vi.mocked(db.expenses.update).mockResolvedValue({ data: mockExpense, error: null })

      await startSync()

      expect(db.expenses.update).toHaveBeenCalledWith('expense-1', mockExpense)
    })
  })

  describe('onSyncStatusChange', () => {
    it('应该注册和调用监听器', async () => {
      const listener = vi.fn()
      const unsubscribe = onSyncStatusChange(listener)

      vi.mocked(syncQueue.getPending).mockResolvedValue([])

      await startSync()

      expect(listener).toHaveBeenCalledWith('syncing', undefined)
      expect(listener).toHaveBeenCalledWith('synced', '数据同步成功')

      unsubscribe()
    })

    it('应该在取消订阅后不再调用监听器', async () => {
      const listener = vi.fn()
      const unsubscribe = onSyncStatusChange(listener)

      unsubscribe()

      vi.mocked(syncQueue.getPending).mockResolvedValue([])
      await startSync()

      expect(listener).not.toHaveBeenCalled()
    })

    it('应该支持多个监听器', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      onSyncStatusChange(listener1)
      onSyncStatusChange(listener2)

      vi.mocked(syncQueue.getPending).mockResolvedValue([])
      await startSync()

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('startAutoSync / stopAutoSync', () => {
    it('应该启动定期自动同步', async () => {
      vi.useFakeTimers()
      vi.mocked(syncQueue.getPending).mockResolvedValue([])

      startAutoSync(1000) // 1 秒间隔

      // Fast-forward 1 second
      await vi.advanceTimersByTimeAsync(1000)

      expect(syncQueue.getPending).toHaveBeenCalled()

      vi.useRealTimers()
      stopAutoSync()
    })

    it('应该停止自动同步', async () => {
      vi.useFakeTimers()
      vi.mocked(syncQueue.getPending).mockResolvedValue([])

      startAutoSync(1000)
      stopAutoSync()

      await vi.advanceTimersByTimeAsync(2000)

      // 应该只在启动时调用一次，停止后不再调用
      expect(syncQueue.getPending).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('应该防止重复启动自动同步', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      startAutoSync(1000)
      startAutoSync(1000)

      expect(consoleSpy).toHaveBeenCalledWith('Auto-sync already started')

      stopAutoSync()
      consoleSpy.mockRestore()
    })
  })

  describe('startNetworkMonitoring / stopNetworkMonitoring', () => {
    it('应该监听网络上线事件并触发同步', async () => {
      vi.mocked(syncQueue.getPending).mockResolvedValue([])

      startNetworkMonitoring()

      // 模拟网络上线事件
      window.dispatchEvent(new Event('online'))

      // 等待异步同步完成
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(syncQueue.getPending).toHaveBeenCalled()

      stopNetworkMonitoring()
    })

    it('应该监听网络离线事件', () => {
      const listener = vi.fn()
      onSyncStatusChange(listener)

      startNetworkMonitoring()

      // 模拟网络离线事件
      window.dispatchEvent(new Event('offline'))

      expect(listener).toHaveBeenCalledWith('idle', '离线模式')

      stopNetworkMonitoring()
    })

    it('应该在初始化时检查网络状态', () => {
      const listener = vi.fn()
      onSyncStatusChange(listener)

      vi.stubGlobal('navigator', { onLine: true })
      startNetworkMonitoring()

      expect(listener).toHaveBeenCalledWith('idle', undefined)

      stopNetworkMonitoring()
    })

    it('应该停止网络监听', () => {
      vi.mocked(syncQueue.getPending).mockResolvedValue([])

      startNetworkMonitoring()
      stopNetworkMonitoring()

      window.dispatchEvent(new Event('online'))

      // 不应该再触发同步
      expect(syncQueue.getPending).not.toHaveBeenCalled()
    })
  })

  describe('getSyncStats', () => {
    it('应该返回同步队列统计信息', async () => {
      vi.mocked(syncQueue.getAll).mockResolvedValue([
        {
          id: 1,
          entity: 'trip',
          entityId: 'trip-1',
          type: 'update',
          data: {},
          status: 'pending',
          createdAt: new Date(),
        },
        {
          id: 2,
          entity: 'trip',
          entityId: 'trip-2',
          type: 'update',
          data: {},
          status: 'syncing',
          createdAt: new Date(),
        },
        {
          id: 3,
          entity: 'trip',
          entityId: 'trip-3',
          type: 'update',
          data: {},
          status: 'synced',
          createdAt: new Date(),
        },
        {
          id: 4,
          entity: 'trip',
          entityId: 'trip-4',
          type: 'update',
          data: {},
          status: 'failed',
          createdAt: new Date(),
        },
      ])

      const stats = await getSyncStats()

      expect(stats).toEqual({
        pending: 1,
        syncing: 1,
        synced: 1,
        failed: 1,
      })
    })

    it('应该正确处理空队列', async () => {
      vi.mocked(syncQueue.getAll).mockResolvedValue([])

      const stats = await getSyncStats()

      expect(stats).toEqual({
        pending: 0,
        syncing: 0,
        synced: 0,
        failed: 0,
      })
    })
  })

  describe('cacheTripsFromServer', () => {
    it('应该从服务器缓存行程数据', async () => {
      const mockTrips: Trip[] = [
        {
          id: 'trip-1',
          user_id: 'user-1',
          destination: '北京',
          start_date: '2025-01-20',
          end_date: '2025-01-22',
          status: 'planned',
          created_at: '2025-01-18T10:00:00Z',
          updated_at: '2025-01-18T11:00:00Z',
        },
        {
          id: 'trip-2',
          user_id: 'user-1',
          destination: '上海',
          start_date: '2025-02-10',
          end_date: '2025-02-12',
          status: 'draft',
          created_at: '2025-01-18T10:00:00Z',
          updated_at: '2025-01-18T11:00:00Z',
        },
      ]

      vi.mocked(db.trips.getAll).mockResolvedValue({ data: mockTrips, error: null })

      await cacheTripsFromServer('user-1')

      expect(db.trips.getAll).toHaveBeenCalledWith('user-1')
      expect(offlineTrips.saveMany).toHaveBeenCalledWith(mockTrips)
    })

    it('应该处理服务器错误', async () => {
      const error = new Error('Server error')
      vi.mocked(db.trips.getAll).mockResolvedValue({ data: null, error })

      await expect(cacheTripsFromServer('user-1')).rejects.toThrow('Server error')
    })

    it('应该处理空数据', async () => {
      vi.mocked(db.trips.getAll).mockResolvedValue({ data: [], error: null })

      await cacheTripsFromServer('user-1')

      expect(offlineTrips.saveMany).not.toHaveBeenCalled()
    })
  })

  describe('cacheExpensesFromServer', () => {
    it('应该从服务器缓存费用数据', async () => {
      const mockExpenses: Expense[] = [
        {
          id: 'expense-1',
          trip_id: 'trip-1',
          user_id: 'user-1',
          amount: 100,
          category: 'food',
          description: '午餐',
          date: '2025-01-20',
          created_at: '2025-01-18T10:00:00Z',
          updated_at: '2025-01-18T11:00:00Z',
        },
      ]

      vi.mocked(db.expenses.getByTrip).mockResolvedValue({ data: mockExpenses, error: null })

      await cacheExpensesFromServer('trip-1')

      expect(db.expenses.getByTrip).toHaveBeenCalledWith('trip-1')
      expect(offlineExpenses.saveMany).toHaveBeenCalledWith(mockExpenses)
    })

    it('应该处理服务器错误', async () => {
      const error = new Error('Server error')
      vi.mocked(db.expenses.getByTrip).mockResolvedValue({ data: null, error })

      await expect(cacheExpensesFromServer('trip-1')).rejects.toThrow('Server error')
    })
  })

  describe('forceFullSync', () => {
    it('应该执行完整的全量同步', async () => {
      const mockTrips: Trip[] = [
        {
          id: 'trip-1',
          user_id: 'user-1',
          destination: '北京',
          start_date: '2025-01-20',
          end_date: '2025-01-22',
          status: 'planned',
          created_at: '2025-01-18T10:00:00Z',
          updated_at: '2025-01-18T11:00:00Z',
        },
      ]

      vi.mocked(syncQueue.getPending).mockResolvedValue([])
      vi.mocked(db.trips.getAll).mockResolvedValue({ data: mockTrips, error: null })
      vi.mocked(db.trips.getById).mockResolvedValue({ data: mockTrips[0], error: null })
      vi.mocked(offlineTrips.getAll).mockResolvedValue(mockTrips)
      vi.mocked(db.expenses.getByTrip).mockResolvedValue({ data: [], error: null })

      const listener = vi.fn()
      onSyncStatusChange(listener)

      await forceFullSync('user-1')

      expect(listener).toHaveBeenCalledWith('syncing', '正在同步所有数据...')
      expect(listener).toHaveBeenCalledWith('synced', '全量同步完成')
      expect(syncQueue.clearSynced).toHaveBeenCalled()
    })

    it('应该处理全量同步失败', async () => {
      const error = new Error('Sync failed')
      vi.mocked(syncQueue.getPending).mockRejectedValue(error)

      const listener = vi.fn()
      onSyncStatusChange(listener)

      await expect(forceFullSync('user-1')).rejects.toThrow('Sync failed')
      expect(listener).toHaveBeenCalledWith('error', '同步失败')
    })
  })
})
