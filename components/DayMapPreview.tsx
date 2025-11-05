'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity } from '@/types/trip'
import { WeatherDaily } from '@/lib/weather'
import { Maximize2, MapPin, Cloud, Loader2 } from 'lucide-react'
import config from '@/lib/config'

// 声明高德地图全局类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
  }
}

interface DayMapPreviewProps {
  activities: Activity[]
  weather?: WeatherDaily | null
  dayNumber: number
  onExpandMap?: () => void
}

/**
 * 每日地图预览组件
 * 显示当天景点位置的小地图预览，整合天气信息
 */
export default function DayMapPreview({ activities, weather, dayNumber, onExpandMap }: DayMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [markers, setMarkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 加载高德地图API
  useEffect(() => {
    const apiKey = config.map.apiKey

    if (!apiKey) {
      setError('未配置地图 API Key')
      setLoading(false)
      return
    }

    // 检查是否已加载
    if (window.AMap) {
      setLoading(false)
      return
    }

    // 设置安全密钥（必须在加载脚本之前设置）
    const securityKey = process.env.NEXT_PUBLIC_MAP_SECURITY_KEY
    if (securityKey) {
      window._AMapSecurityConfig = {
        securityJsCode: securityKey,
      }
    }

    // 动态加载高德地图脚本
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`
    script.async = true

    script.onload = () => {
      setLoading(false)
    }

    script.onerror = () => {
      setError('地图加载失败')
      setLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      // 不移除script，因为其他地图组件可能还在使用
    }
  }, [])

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || loading || error) return

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
      features: ['bg', 'road', 'building'],
      showLabel: true,
    })

    setMap(mapInstance)

    // 创建标记点
    const newMarkers: any[] = []

    locatedActivities.forEach((activity, index) => {
      const marker = new window.AMap.Marker({
        position: [activity.location!.lng, activity.location!.lat],
        map: mapInstance,
        title: activity.name,
        label: {
          content: `<div style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${index + 1}</div>`,
          offset: new window.AMap.Pixel(0, -35),
        },
        icon: new window.AMap.Icon({
          image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
          size: new window.AMap.Size(25, 34),
          imageSize: new window.AMap.Size(25, 34),
        }),
      })

      // 添加信息窗口
      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 150px;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${activity.name}</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">${activity.location?.address || ''}</p>
            ${activity.time ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #3b82f6;">${activity.time}</p>` : ''}
          </div>
        `,
        offset: new window.AMap.Pixel(0, -34),
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

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <MapPin className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* 地图容器 */}
      <div
        ref={mapRef}
        className="w-full h-64"
        style={{ minHeight: '256px' }}
      />

      {/* 顶部信息栏 */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">第 {dayNumber} 天行程</span>
            <span className="text-xs opacity-80">
              {activities.filter(a => a.location?.coordinates).length} 个景点
            </span>
          </div>

          {weather && (
            <div className="flex items-center gap-2 text-white text-xs bg-black/30 px-2 py-1 rounded-full">
              <Cloud className="w-3 h-3" />
              <span>{weather.textDay}</span>
              <span className="font-medium">{weather.tempMax}°/{weather.tempMin}°</span>
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
    </div>
  )
}
