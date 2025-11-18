'use client'

import { MapPin } from 'lucide-react'

interface MapLegendProps {
  /** 是否显示路线说明 */
  showRoute?: boolean
}

/**
 * 地图图例组件
 * 显示地图上各种标记的含义
 */
export default function MapLegend({ showRoute = false }: MapLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm z-10">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-blue-600" />
        <span className="font-semibold">图例</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-gray-700">活动景点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🍽️</span>
          <span className="text-gray-700">餐饮推荐</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🏨</span>
          <span className="text-gray-700">推荐住宿</span>
        </div>
      </div>
      {showRoute && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          蓝色线路为推荐路线
        </div>
      )}
    </div>
  )
}
