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

// 获取景点类型对应的 emoji
function getTypeEmoji(type: Activity['type']): string {
  const emojiMap = {
    'attraction': '🎯',
    'shopping': '🛍️',
    'entertainment': '🎭',
    'relaxation': '🧘'
  }
  return emojiMap[type] || '📍'
}

// 交通站点关键词列表
const TRANSPORTATION_KEYWORDS = [
  '站', '机场', '火车站', '高铁站', '动车站',
  '地铁站', '汽车站', '客运站', '码头', '港口',
  'station', 'airport', 'railway', 'terminal', 'port'
]

// 判断是否为交通站点
function isTransportationActivity(activity: Activity): boolean {
  return TRANSPORTATION_KEYWORDS.some(keyword =>
    activity.name.includes(keyword)
  )
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

    // 过滤出有位置信息的活动（排除交通站点）
    const locatedActivities = activities.filter(
      activity => !isTransportationActivity(activity) &&  // 过滤掉交通站点
      activity.location &&
      typeof activity.location.lat === 'number' &&
      typeof activity.location.lng === 'number' &&
      !isNaN(activity.location.lat) &&
      !isNaN(activity.location.lng)
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
        position: [activity.location!.lng, activity.location!.lat],
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
              <span style="font-size: 18px;">${getTypeEmoji(activity.type)}</span>
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
            ${activity.description ? `<p style="margin: 8px 0 4px 0; font-size: 12px; color: #4b5563; line-height: 1.4;">${activity.description}</p>` : ''}
            ${activity.tips ? `
              <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
                <p style="margin: 0; font-size: 11px; color: #92400e; line-height: 1.4;">💡 ${activity.tips}</p>
              </div>
            ` : ''}
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
      mapInstance.setCenter([locatedActivities[0].location!.lng, locatedActivities[0].location!.lat])
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
      activity => !isTransportationActivity(activity) &&  // 过滤掉交通站点
      activity.location &&
      typeof activity.location.lat === 'number' &&
      typeof activity.location.lng === 'number'
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
      const path = locatedActivities.map(a => [a.location!.lng, a.location!.lat])

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
                {activities.filter(a => a.location && typeof a.location.lat === 'number' && typeof a.location.lng === 'number').length} 个景点
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
              .filter(a => a.location && typeof a.location.lat === 'number' && typeof a.location.lng === 'number')
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
