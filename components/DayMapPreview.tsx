'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity } from '@/types'
import { AmapWeatherForecast } from '@/lib/amap-weather'
import { Maximize2, MapPin, Cloud, Loader2 } from 'lucide-react'
import { useAMapLoader } from '@/hooks/useAMapLoader'
import { getActivityEmoji, getDayColor } from '@/lib/ui-helpers'

interface DayMapPreviewProps {
  activities: Activity[]
  weather?: AmapWeatherForecast | null
  dayNumber: number
  onExpandMap?: () => void
}

/**
 * 每日地图预览组件
 * 显示当天景点位置的小地图预览，整合天气信息
 */
export default function DayMapPreview({ activities, weather, dayNumber, onExpandMap }: DayMapPreviewProps) {
  // 使用统一的地图加载 Hook
  const { loading, error: loadError, isLoaded } = useAMapLoader()

  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [markers, setMarkers] = useState<any[]>([])

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || loading || loadError || error || !isLoaded) return

    // 检查是否已加载高德地图
    if (!window.AMap) {
      setError('地图API未加载')
      return
    }

    // 过滤出有位置信息的活动（景点、餐厅等）
    const locatedActivities = activities.filter(
      activity => activity.location &&
      typeof activity.location.lat === 'number' &&
      typeof activity.location.lng === 'number' &&
      !isNaN(activity.location.lat) &&
      !isNaN(activity.location.lng)
    )

    if (locatedActivities.length === 0) {
      setError('当天无位置信息')
      return
    }

    // 创建地图实例
    const mapInstance = new window.AMap.Map(mapRef.current, {
      zoom: 13,
      mapStyle: 'amap://styles/normal',
      viewMode: '2D',
      features: ['bg', 'road', 'building', 'point'], // 添加 point 以显示周边建筑 POI
      zoomEnable: false, // 禁用缩放
      dragEnable: true,  // 保持拖动功能
      doubleClickZoom: false, // 禁用双击缩放
      scrollWheel: false, // 禁用滚轮缩放
    })

    setMap(mapInstance)

    // 创建标记点
    const newMarkers: any[] = []

    locatedActivities.forEach((activity, index) => {
      // 创建自定义的SVG标记图标（数字直接绘制在SVG中）
      const svgIcon = `
        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-day-${index}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="grad-day-${index}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#2563eb;stop-opacity:0.9" />
            </linearGradient>
          </defs>
          <!-- 标记主体 -->
          <path
            d="M15 2 C8.373 2 3 7.373 3 14 C3 22 15 38 15 38 S27 22 27 14 C27 7.373 21.627 2 15 2 Z"
            fill="url(#grad-day-${index})"
            stroke="white"
            stroke-width="2"
            filter="url(#shadow-day-${index})"
          />
          <!-- 内圆 -->
          <circle cx="15" cy="14" r="7" fill="white" opacity="0.9"/>
          <!-- 数字背景 -->
          <circle cx="15" cy="14" r="6" fill="#3b82f6"/>
          <!-- 数字文本 -->
          <text x="15" y="14" text-anchor="middle" dominant-baseline="central"
                fill="white" font-size="10" font-weight="bold" font-family="Arial, sans-serif">
            ${index + 1}
          </text>
        </svg>
      `

      const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon)

      const marker = new window.AMap.Marker({
        position: [activity.location!.lng, activity.location!.lat],
        title: activity.name,
        icon: iconUrl,
        offset: { x: -15, y: -38 } as any,
      })

      marker.setMap(mapInstance)

      // 添加信息窗口 - 增强版，包含图片、评分、价格、tips
      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 250px; max-width: 300px;">
            ${activity.photos && activity.photos.length > 0 ? `
              <img
                src="${activity.photos[0]}"
                alt="${activity.name}"
                style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;"
                onerror="this.style.display='none'"
              />
            ` : ''}
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 18px;">${getActivityEmoji(activity.type)}</span>
              <h4 style="margin: 0; font-size: 15px; font-weight: bold; flex: 1; color: #1f2937;">${activity.name}</h4>
            </div>
            ${activity.rating ? `
              <div style="color: #f59e0b; font-size: 12px; margin-bottom: 4px;">
                ${'★'.repeat(Math.floor(activity.rating))}${'☆'.repeat(5 - Math.floor(activity.rating))} ${activity.rating.toFixed(1)}
              </div>
            ` : ''}
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${activity.location?.address || ''}</p>
            ${activity.time ? `<p style="margin: 4px 0; font-size: 12px; color: #3b82f6;">⏰ ${activity.time}</p>` : ''}
            ${activity.duration ? `<p style="margin: 4px 0; font-size: 12px; color: #6b7280;">🕐 游玩时长：${activity.duration}</p>` : ''}
            ${activity.ticket_price !== undefined && activity.ticket_price !== null ? `
              <p style="margin: 4px 0; font-size: 12px; color: #10b981; font-weight: 500;">
                💰 门票：${activity.ticket_price === 0 ? '免费' : '¥' + activity.ticket_price}
              </p>
            ` : ''}
            ${activity.tips ? `
              <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
                <p style="margin: 0; font-size: 11px; color: #92400e; line-height: 1.4;">💡 ${activity.tips}</p>
              </div>
            ` : ''}
          </div>
        `as any,
        offset: { x: 0, y: -34 } as any,
      })

      marker.on('click', () => {
        infoWindow.open(mapInstance, marker.getPosition())
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)

    // 自动适应视野
    if (locatedActivities.length > 1) {
      mapInstance.setFitView(newMarkers, false, [50, 50, 50, 50])
    } else {
      mapInstance.setCenter([locatedActivities[0].location!.lng, locatedActivities[0].location!.lat])
    }

    // 清理函数
    return () => {
      if (mapInstance) {
        mapInstance.destroy()
      }
    }
  }, [activities, loading, error])

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span className="text-sm">加载地图中...</span>
        </div>
      </div>
    )
  }

  // 显示加载错误或业务逻辑错误
  const displayError = loadError || error
  if (displayError) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <MapPin className="w-5 h-5 mr-2" />
          <span className="text-sm">{displayError}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* 地图容器 - 正方形 */}
      <div
        ref={mapRef}
        className="w-full aspect-square max-h-[500px]"
        style={{ minHeight: '400px' }}
      />

      {/* 顶部信息栏 */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">第 {dayNumber} 天行程</span>
            <span className="text-xs opacity-80">
              {activities.filter(a => a.location && a.location.lat && a.location.lng).length} 个景点
            </span>
          </div>

          {weather && (
            <div className="flex items-center gap-2 text-white text-xs bg-black/30 px-2 py-1 rounded-full">
              <Cloud className="w-3 h-3" />
              <span>{weather.dayweather}</span>
              <span className="font-medium">{weather.daytemp}°/{weather.nighttemp}°</span>
            </div>
          )}
        </div>
      </div>

      {/* 放大按钮 */}
      {onExpandMap && (
        <button
          onClick={onExpandMap}
          className="absolute bottom-3 right-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
          title="查看大地图"
        >
          <Maximize2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* 景点列表（底部） */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {activities
            .filter(a => a.location && typeof a.location.lat === 'number' && typeof a.location.lng === 'number')
            .map((activity, index) => (
              <div
                key={index}
                className="flex-shrink-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs"
              >
                <span className="font-bold text-blue-600 dark:text-blue-400 mr-1">
                  {index + 1}
                </span>
                <span className="text-gray-800 dark:text-gray-200">
                  {activity.name}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 隐藏高德地图默认的label */}
      <style jsx global>{`
        .amap-marker-label {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
