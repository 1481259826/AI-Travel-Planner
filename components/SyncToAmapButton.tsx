'use client'

import { useState } from 'react'
import { Map, Loader2, ExternalLink, Smartphone } from 'lucide-react'
import { useAmapApp } from '@/hooks/useAmapApp'
import { Trip } from '@/types'

interface SyncToAmapButtonProps {
  trip: Trip
}

/**
 * 同步到高德地图按钮
 *
 * 将行程中的所有景点同步到高德地图 APP，生成专属地图
 */
export default function SyncToAmapButton({ trip }: SyncToAmapButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const { syncToAmap, loading, error } = useAmapApp()

  // 从行程中提取所有景点作为途经点
  const getWaypoints = () => {
    const waypoints: Array<{ name: string; location: string }> = []

    if (!trip.itinerary?.days) {
      return waypoints
    }

    trip.itinerary.days.forEach(day => {
      day.activities?.forEach(activity => {
        if (activity.location?.lng && activity.location?.lat) {
          waypoints.push({
            name: activity.name,
            location: `${activity.location.lng},${activity.location.lat}`
          })
        }
      })
    })

    return waypoints
  }

  const handleSync = async () => {
    const waypoints = getWaypoints()

    if (waypoints.length === 0) {
      alert('行程中没有可同步的景点')
      return
    }

    const mapName = `${trip.destination}之旅`
    await syncToAmap(mapName, waypoints)
    setShowModal(false)
  }

  const waypointsCount = getWaypoints().length

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={waypointsCount === 0}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        title="同步到高德地图"
      >
        <Map className="w-4 h-4" />
        <span className="hidden sm:inline">同步到高德</span>
      </button>

      {/* 确认模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Map className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  同步到高德地图
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  将行程同步到高德地图 APP
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">行程名称</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {trip.destination}之旅
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">景点数量</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {waypointsCount} 个
                </span>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  点击确认后将打开高德地图，在移动端会唤起高德地图 APP
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSync}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    确认同步
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
