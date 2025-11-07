'use client'

import { useEffect, useRef, useState } from 'react'
import { DayPlan, Activity, Accommodation } from '@/types'
import { Loader2, MapPin, Navigation } from 'lucide-react'
import config from '@/lib/config'

// 声明高德地图全局类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
  }
}

interface TripOverviewMapProps {
  days: DayPlan[]
  accommodation?: Accommodation[]  // 住宿信息
  onHotelClick?: (hotel: Accommodation) => void  // 点击酒店标记的回调
  className?: string
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

// 为每一天分配不同的颜色
const DAY_COLORS = [
  '#3b82f6', // blue-600
  '#10b981', // green-600
  '#f59e0b', // amber-600
  '#ef4444', // red-600
  '#8b5cf6', // violet-600
  '#ec4899', // pink-600
  '#14b8a6', // teal-600
  '#f97316', // orange-600
]

/**
 * 全行程总览地图组件
 * 显示所有天数的景点，路线只在每天内的景点之间连接
 */
export default function TripOverviewMap({ days, accommodation = [], onHotelClick, className = '' }: TripOverviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [routeLines, setRouteLines] = useState<any[]>([])
  const [markers, setMarkers] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<number | 'accommodation'>(1) // 默认选中第1天，也可以选择住宿
  const [dayMarkers, setDayMarkers] = useState<Map<number, any[]>>(new Map()) // 存储每天的 markers
  const [accommodationMarkers, setAccommodationMarkers] = useState<any[]>([]) // 存储酒店 markers

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
  }, [])

  // 初始化地图和标记
  useEffect(() => {
    if (!mapRef.current || loading || error || !window.AMap) return

    // 收集所有有位置信息的景点
    const allActivities: { activity: Activity; dayNumber: number; indexInDay: number }[] = []
    let globalIndex = 0

    days.forEach((day) => {
      day.activities?.forEach((activity, indexInDay) => {
        if (
          !isTransportationActivity(activity) &&  // 过滤掉交通站点
          activity.location &&
          typeof activity.location.lat === 'number' &&
          typeof activity.location.lng === 'number' &&
          !isNaN(activity.location.lat) &&
          !isNaN(activity.location.lng)
        ) {
          allActivities.push({ activity, dayNumber: day.day, indexInDay })
        }
      })
    })

    if (allActivities.length === 0) {
      setError('当前行程无位置信息')
      return
    }

    // 创建地图实例
    const mapInstance = new window.AMap.Map(mapRef.current, {
      zoom: 15, // 提高 zoom 级别，显示更详细的路线
      mapStyle: 'amap://styles/normal',
      viewMode: '2D',
      features: ['bg', 'road', 'building', 'point'],
      showLabel: true,
    })

    setMap(mapInstance)

    // 创建标记点
    const newMarkers: any[] = []
    const newDayMarkers = new Map<number, any[]>() // 按天存储 markers

    allActivities.forEach(({ activity, dayNumber, indexInDay }, globalIdx) => {
      const dayColor = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]

      const marker = new window.AMap.Marker({
        position: [activity.location!.lng, activity.location!.lat],
        map: mapInstance,
        title: activity.name,
        label: {
          content: `<div style="background: ${dayColor}; color: white; padding: 3px 9px; border-radius: 14px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${dayNumber}-${indexInDay + 1}</div>`,
          offset: new window.AMap.Pixel(0, -38),
        },
        icon: new window.AMap.Icon({
          image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
          size: new window.AMap.Size(28, 36),
          imageSize: new window.AMap.Size(28, 36),
        }),
      })

      // 添加信息窗口 - 增强版
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
              <span style="background: ${dayColor}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">第${dayNumber}天</span>
              <span style="font-size: 16px;">${getTypeEmoji(activity.type)}</span>
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
        offset: new window.AMap.Pixel(0, -36),
      })

      marker.on('click', () => {
        infoWindow.open(mapInstance, marker.getPosition())
      })

      newMarkers.push(marker)

      // 按天存储 markers
      if (!newDayMarkers.has(dayNumber)) {
        newDayMarkers.set(dayNumber, [])
      }
      newDayMarkers.get(dayNumber)!.push(marker)
    })

    setMarkers(newMarkers)
    setDayMarkers(newDayMarkers)

    // 创建酒店标记
    const newAccommodationMarkers: any[] = []

    accommodation.forEach((hotel) => {
      if (
        hotel.location &&
        typeof hotel.location.lat === 'number' &&
        typeof hotel.location.lng === 'number' &&
        !isNaN(hotel.location.lat) &&
        !isNaN(hotel.location.lng)
      ) {
        const hotelMarker = new window.AMap.Marker({
          position: [hotel.location.lng, hotel.location.lat],
          map: mapInstance,
          title: hotel.name,
          label: {
            content: `<div style="background: #dc2626; color: white; padding: 3px 9px; border-radius: 14px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🏨</div>`,
            offset: new window.AMap.Pixel(0, -38),
          },
          icon: new window.AMap.Icon({
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
            size: new window.AMap.Size(28, 36),
            imageSize: new window.AMap.Size(28, 36),
          }),
        })

        // 创建酒店信息窗口
        const hotelTypeMap: Record<string, string> = {
          hotel: '酒店',
          hostel: '青年旅舍',
          apartment: '公寓',
          resort: '度假村',
        }

        const hotelInfoWindow = new window.AMap.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 260px; max-width: 320px;">
              ${hotel.photos && hotel.photos.length > 0 ? `
                <img
                  src="${hotel.photos[0]}"
                  alt="${hotel.name}"
                  style="width: 100%; height: 140px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;"
                  onerror="this.style.display='none'"
                />
              ` : ''}
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 18px;">🏨</span>
                <h4 style="margin: 0; font-size: 15px; font-weight: bold; flex: 1; color: #1f2937;">${hotel.name}</h4>
              </div>
              <div style="display: inline-block; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-bottom: 6px;">
                ${hotelTypeMap[hotel.type] || hotel.type}
              </div>
              ${hotel.rating ? `
                <div style="color: #f59e0b; font-size: 12px; margin-bottom: 4px;">
                  ${'★'.repeat(Math.floor(hotel.rating))}${'☆'.repeat(5 - Math.floor(hotel.rating))} ${hotel.rating.toFixed(1)}
                </div>
              ` : ''}
              <p style="margin: 4px 0; font-size: 12px; color: #666;">${hotel.location.address}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #10b981; font-weight: 500;">
                💰 ¥${hotel.price_per_night}/晚（总计 ¥${hotel.total_price}）
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #3b82f6;">
                📅 入住：${new Date(hotel.check_in).toLocaleDateString('zh-CN')}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #3b82f6;">
                📅 退房：${new Date(hotel.check_out).toLocaleDateString('zh-CN')}
              </p>
              ${hotel.amenities && hotel.amenities.length > 0 ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; font-weight: 500;">设施</p>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${hotel.amenities.slice(0, 6).map(amenity => `
                      <span style="font-size: 10px; padding: 2px 6px; background: #f3f4f6; border-radius: 8px; color: #4b5563;">${amenity}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              ${hotel.description ? `
                <p style="margin: 8px 0 4px 0; font-size: 12px; color: #4b5563; line-height: 1.4;">${hotel.description}</p>
              ` : ''}
            </div>
          `,
          offset: new window.AMap.Pixel(0, -36),
        })

        hotelMarker.on('click', () => {
          if (onHotelClick) {
            onHotelClick(hotel)  // 触发跳转回调
          }
          hotelInfoWindow.open(mapInstance, hotelMarker.getPosition())
        })

        newMarkers.push(hotelMarker)
        newAccommodationMarkers.push(hotelMarker)  // 保存到酒店标记数组
      }
    })

    setAccommodationMarkers(newAccommodationMarkers)  // 更新酒店标记状态

    // 创建每天的路线
    const newRouteLines: any[] = []

    days.forEach((day) => {
      const dayActivities = day.activities?.filter(
        (a) =>
          a.location &&
          typeof a.location.lat === 'number' &&
          typeof a.location.lng === 'number' &&
          !isNaN(a.location.lat) &&
          !isNaN(a.location.lng)
      ) || []

      if (dayActivities.length >= 2) {
        const path = dayActivities.map((a) => [a.location!.lng, a.location!.lat])
        const dayColor = DAY_COLORS[(day.day - 1) % DAY_COLORS.length]

        const polyline = new window.AMap.Polyline({
          path: path,
          strokeColor: dayColor,
          strokeWeight: 4,
          strokeOpacity: 0.7,
          strokeStyle: 'solid',
          lineJoin: 'round',
          lineCap: 'round',
        })

        if (showRoutes) {
          mapInstance.add(polyline)
        }

        newRouteLines.push({ polyline, dayNumber: day.day, color: dayColor })
      }
    })

    setRouteLines(newRouteLines)

    // 自动适应视野 - 默认聚焦到第1天的景点
    const day1Markers = newDayMarkers.get(1)
    if (day1Markers && day1Markers.length > 0) {
      if (day1Markers.length > 1) {
        mapInstance.setFitView(day1Markers, false, [80, 80, 80, 80])
      } else {
        mapInstance.setCenter(day1Markers[0].getPosition())
      }
    } else if (allActivities.length > 0) {
      // 如果没有第1天的数据，则显示所有景点
      mapInstance.setCenter([allActivities[0].activity.location!.lng, allActivities[0].activity.location!.lat])
    }

    // 清理函数
    return () => {
      if (mapInstance) {
        mapInstance.destroy()
      }
    }
  }, [days, accommodation, loading, error])

  // 切换天数，聚焦到对应天的景点区域
  const switchToDay = (dayNumber: number) => {
    if (!map || !dayMarkers.has(dayNumber)) return

    setSelectedDay(dayNumber)

    const markers = dayMarkers.get(dayNumber)!
    if (markers.length > 1) {
      // 多个景点，适应视野
      map.setFitView(markers, false, [80, 80, 80, 80])
    } else if (markers.length === 1) {
      // 单个景点，居中显示
      map.setCenter(markers[0].getPosition())
      map.setZoom(15)
    }
  }

  // 切换到住宿视图，聚焦到酒店位置
  const switchToAccommodation = () => {
    if (!map || accommodationMarkers.length === 0) return

    setSelectedDay('accommodation')

    if (accommodationMarkers.length > 1) {
      // 多个酒店，适应视野显示所有酒店
      map.setFitView(accommodationMarkers, false, [80, 80, 80, 80])
    } else {
      // 单个酒店，居中显示
      map.setCenter(accommodationMarkers[0].getPosition())
      map.setZoom(15)
    }
  }

  // 切换路线显示
  const toggleRoutes = () => {
    if (!map || routeLines.length === 0) return

    if (showRoutes) {
      // 隐藏路线
      routeLines.forEach(({ polyline }) => {
        map.remove(polyline)
      })
    } else {
      // 显示路线
      routeLines.forEach(({ polyline }) => {
        map.add(polyline)
      })
    }

    setShowRoutes(!showRoutes)
  }

  if (loading) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 mb-2 animate-spin" />
          <span className="text-sm">加载地图中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
          <MapPin className="w-8 h-8 mb-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {/* 地图容器 */}
      <div ref={mapRef} className="w-full h-[600px]" />

      {/* 顶部工具栏 */}
      <div className="absolute top-3 left-3 right-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">景点地图</span>
          </div>

          {routeLines.length > 0 && (
            <button
              onClick={toggleRoutes}
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
                  onClick={() => switchToDay(day.day)}
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
                onClick={switchToAccommodation}
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
