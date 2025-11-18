'use client'

import { DayPlan, Accommodation } from '@/types'
import { MapPin, Navigation, ChevronDown, ChevronUp } from 'lucide-react'
import { DAY_COLORS } from '@/lib/ui-helpers'

interface TripMapToolbarProps {
  days: DayPlan[]
  accommodation?: Accommodation[]
  selectedDay: number | 'accommodation'
  showRoutes: boolean
  routeLines: Array<{ dayNumber: number; color: string }>
  toolbarCollapsed: boolean
  onDayChange: (day: number) => void
  onAccommodationClick: () => void
  onToggleRoutes: () => void
  onToggleCollapse: (collapsed: boolean) => void
}

/**
 * 行程地图工具栏组件
 * 提供天数切换、路线控制、视图折叠等功能
 */
export default function TripMapToolbar({
  days,
  accommodation = [],
  selectedDay,
  showRoutes,
  routeLines,
  toolbarCollapsed,
  onDayChange,
  onAccommodationClick,
  onToggleRoutes,
  onToggleCollapse
}: TripMapToolbarProps) {
  if (toolbarCollapsed) {
    // 收起状态：紧凑视图
    return (
      <div className="bg-white dark:bg-gray-800 rounded-t-lg transition-all border-b border-gray-200 dark:border-gray-700">
        <div className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">景点地图</span>
              {/* 显示当前选中的天数 */}
              {selectedDay === 'accommodation' ? (
                <span className="text-xs text-gray-600 dark:text-gray-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                  🏨 住宿
                </span>
              ) : (
                <span className="text-xs text-gray-600 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                  第{selectedDay}天
                </span>
              )}
            </div>
            <button
              onClick={() => onToggleCollapse(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="展开工具栏"
            >
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 展开状态：完整视图
  return (
    <div className="bg-white dark:bg-gray-800 rounded-t-lg transition-all border-b border-gray-200 dark:border-gray-700">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">景点地图</span>
          </div>

          <div className="flex items-center gap-2">
            {routeLines.length > 0 && (
              <button
                onClick={onToggleRoutes}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showRoutes
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Navigation className="w-4 h-4" />
                {showRoutes ? '隐藏路线' : '显示路线'}
              </button>
            )}
            <button
              onClick={() => onToggleCollapse(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="收起工具栏"
            >
              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* 天数切换按钮 */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex flex-wrap gap-2">
            {days.map((day) => {
              const dayColor = DAY_COLORS[(day.day - 1) % DAY_COLORS.length]
              const isSelected = selectedDay === day.day

              return (
                <button
                  key={day.day}
                  onClick={() => onDayChange(day.day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  style={isSelected ? { backgroundColor: dayColor } : {}}
                >
                  第{day.day}天
                </button>
              )
            })}

            {/* 住宿按钮 */}
            {accommodation.length > 0 && (
              <button
                onClick={onAccommodationClick}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedDay === 'accommodation'
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={selectedDay === 'accommodation' ? { backgroundColor: '#dc2626' } : {}}
              >
                🏨 住宿
              </button>
            )}
          </div>
        </div>

        {/* 路线图例 */}
        {showRoutes && routeLines.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {routeLines.map(({ dayNumber, color }) => (
                <div key={dayNumber} className="flex items-center gap-1.5">
                  <div className="w-8 h-1 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">第{dayNumber}天</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
