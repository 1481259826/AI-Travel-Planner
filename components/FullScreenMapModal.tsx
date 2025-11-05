'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity } from '@/types/trip'
import { X, MapPin, Navigation, Loader2 } from 'lucide-react'
import config from '@/lib/config'

// 声明高德地图全局类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
  }
}

interface FullScreenMapModalProps {
  isOpen: boolean
  onClose: () => void
  activities: Activity[]
  dayNumber: number
}

/**
 * 全屏地图模态框
 * 显示当天所有景点的详细地图和路线规划
 */
export default function FullScreenMapModal({ isOpen, onClose, activities, dayNumber }: FullScreenMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [showRoute, setShowRoute] = useState(false)
  const [routeLine, setRouteLine] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // 加载高德地图API
  useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen])

  // 初始化地图
  useEffect(() => {
    if (!isOpen || !mapRef.current || loading || error) return

    // 检查是否已加载高德地图
    if (!window.AMap) {
      setError('地图API未加载')
      return
    }

    // 过滤出有位置信息的活动
    const locatedActivities = activities.filter(
      activity => activity.location?.coordinates &&
      activity.location.coordinates.length === 2 &&
      !isNaN(activity.location.coordinates[0]) &&
      !isNaN(activity.location.coordinates[1])
    )

    if (locatedActivities.length === 0) return

    // 创建地图实例
    const mapInstance = new window.AMap.Map(mapRef.current, {
      zoom: 13,
      mapStyle: 'amap://styles/normal',
      viewMode: '2D',
      features: ['bg', 'road', 'building', 'point'],
      showLabel: true,
    })

    setMap(mapInstance)

    // 创建标记点
    const markers: any[] = []

    locatedActivities.forEach((activity, index) => {
      const marker = new window.AMap.Marker({
        position: activity.location!.coordinates,
        map: mapInstance,
        title: activity.name,
        label: {
          content: `<div style="background: #3b82f6; color: white; padding: 4px 10px; border-radius: 16px; font-size: 13px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${index + 1}</div>`,
          offset: new window.AMap.Pixel(0, -40),
        },
        icon: new window.AMap.Icon({
          image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
          size: new window.AMap.Size(30, 40),
          imageSize: new window.AMap.Size(30, 40),
        }),
      })

      // 添加信息窗口
      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">${activity.name}</h4>
            <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">
              ${activity.location?.address ? `<p style="margin: 4px 0;">${activity.location.address}</p>` : ''}
              ${activity.time ? `<p style="margin: 4px 0; color: #3b82f6;"><strong>时间：</strong>${activity.time}</p>` : ''}
              ${activity.duration ? `<p style="margin: 4px 0; color: #3b82f6;"><strong>时长：</strong>${activity.duration}</p>` : ''}
              ${activity.description ? `<p style="margin: 8px 0 4px 0; color: #4b5563;">${activity.description}</p>` : ''}
            </div>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -40),
      })

      marker.on('click', () => {
        infoWindow.open(mapInstance, marker.getPosition())
      })

      markers.push(marker)
    })

    // 自动适应视野
    if (locatedActivities.length > 1) {
      mapInstance.setFitView(markers, false, [100, 100, 100, 100])
    } else {
      mapInstance.setCenter(locatedActivities[0].location!.coordinates)
    }

    // 清理函数
    return () => {
      if (mapInstance) {
        mapInstance.destroy()
      }
    }
  }, [isOpen, activities, loading, error])

  // 切换路线显示
  const toggleRoute = () => {
    if (!map) return

    const locatedActivities = activities.filter(
      activity => activity.location?.coordinates &&
      activity.location.coordinates.length === 2
    )

    if (locatedActivities.length < 2) {
      alert('至少需要2个景点才能规划路线')
      return
    }

    if (showRoute && routeLine) {
      // 隐藏路线
      map.remove(routeLine)
      setRouteLine(null)
      setShowRoute(false)
    } else {
      // 显示路线
      const path = locatedActivities.map(a => a.location!.coordinates)

      const polyline = new window.AMap.Polyline({
        path: path,
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
        lineJoin: 'round',
        lineCap: 'round',
      })

      map.add(polyline)
      setRouteLine(polyline)
      setShowRoute(true)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="bg-white dark:bg-gray-900 shadow-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                第 {dayNumber} 天行程地图
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activities.filter(a => a.location?.coordinates).length} 个景点
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleRoute}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showRoute
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span className="text-sm font-medium">
                {showRoute ? '隐藏路线' : '显示路线'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* 地图容器 */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">加载地图中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="flex-1" />
        )}

        {/* 底部景点列表 */}
        <div className="bg-white dark:bg-gray-900 shadow-lg p-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {activities
              .filter(a => a.location?.coordinates)
              .map((activity, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.name}
                      </p>
                      {activity.time && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.time}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
