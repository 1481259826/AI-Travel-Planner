'use client'

import { useState, useEffect } from 'react'
import { Database, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { getCacheSize, clearAllCache } from '@/lib/offline'

interface CacheStats {
  trips: number
  expenses: number
  syncQueue: number
  total: number
}

export default function CacheManager() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadCacheStats = async () => {
    try {
      setIsLoading(true)
      const stats = await getCacheSize()
      setCacheStats(stats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCacheStats()
  }, [])

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      await clearAllCache()

      // Also clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }

      await loadCacheStats()
      setShowConfirm(false)

      // Show success message
      alert('缓存已清除。页面将自动刷新。')

      // Reload the page to get fresh data
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      alert('清除缓存失败，请重试。')
    } finally {
      setIsClearing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">加载缓存信息...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">离线缓存管理</h3>
      </div>

      {/* Stats */}
      {cacheStats && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">缓存的行程:</span>
            <span className="font-medium text-gray-900">{cacheStats.trips} 个</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">缓存的费用:</span>
            <span className="font-medium text-gray-900">{cacheStats.expenses} 个</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">待同步项:</span>
            <span className="font-medium text-gray-900">{cacheStats.syncQueue} 个</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-700 font-medium">总计:</span>
            <span className="font-semibold text-gray-900">{cacheStats.total} 项</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={loadCacheStats}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新统计
        </button>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isClearing || (cacheStats?.total === 0)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            清除所有缓存
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">确认清除缓存？</p>
                <p className="text-xs text-amber-700 mt-1">
                  这将删除所有离线数据。未同步的更改将会丢失。
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? '清除中...' : '确认清除'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isClearing}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      {cacheStats && cacheStats.syncQueue > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            有 {cacheStats.syncQueue} 个待同步更改。清除缓存前请确保已同步。
          </p>
        </div>
      )}
    </div>
  )
}
