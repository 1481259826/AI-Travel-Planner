'use client'

import { useEffect, useRef, useState } from 'react'
import { DayPlan, Activity, Accommodation } from '@/types'
import { Loader2, MapPin } from 'lucide-react'
import { useAMapLoader } from '@/hooks/useAMapLoader'
import { isTransportationActivity, DAY_COLORS } from '@/lib/ui-helpers'
import {
  createActivityMarkerIcon,
  createAccommodationMarkerIcon,
  createActivityInfoWindowContent,
  createAccommodationInfoWindowContent
} from '@/lib/map-markers'
import TripMapToolbar from '@/components/map/TripMapToolbar'

interface TripOverviewMapProps {
  days: DayPlan[]
  accommodation?: Accommodation[]  // 住宿信息
  onHotelClick?: (hotel: Accommodation) => void  // 点击酒店标记的回调
  className?: string
}

/**
 * 全行程总览地图组件
 * 显示所有天数的景点，路线只在每天内的景点之间连接
 */
export default function TripOverviewMap({ days, accommodation = [], onHotelClick, className = '' }: TripOverviewMapProps) {
  // 使用统一的地图加载 Hook
  const { loading, error: loadError, isLoaded } = useAMapLoader()

  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [showRoutes, setShowRoutes] = useState(true)
  const [routeLines, setRouteLines] = useState<any[]>([])
  const [markers, setMarkers] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<number | 'accommodation'>(1) // 默认选中第1天，也可以选择住宿
  const [dayMarkers, setDayMarkers] = useState<Map<number, any[]>>(new Map()) // 存储每天的 markers
  const [accommodationMarkers, setAccommodationMarkers] = useState<any[]>([]) // 存储酒店 markers
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false) // 控制工具栏收起/展开

  // 初始化地图和标记
  useEffect(() => {
    if (!mapRef.current || loading || loadError || error || !isLoaded) return

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
    })

    setMap(mapInstance)

    // 创建标记点
    const newMarkers: any[] = []
    const newDayMarkers = new Map<number, any[]>() // 按天存储 markers

    allActivities.forEach(({ activity, dayNumber, indexInDay }) => {
      // 使用统一的标记图标创建函数
      const iconUrl = createActivityMarkerIcon(dayNumber, indexInDay)

      const marker = new window.AMap.Marker({
        position: [activity.location!.lng, activity.location!.lat],
        title: activity.name,
        icon: iconUrl,
        offset: { x: -16, y: -40 } as any,
      })

      marker.setMap(mapInstance)

      // 使用统一的信息窗口内容创建函数
      const infoWindow = new window.AMap.InfoWindow({
        content: createActivityInfoWindowContent(activity, dayNumber) as any,
        offset: { x: 0, y: -36 } as any,
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
        // 使用统一的酒店标记图标创建函数
        const hotelIconUrl = createAccommodationMarkerIcon()

        const hotelMarker = new window.AMap.Marker({
          position: [hotel.location.lng, hotel.location.lat],
          title: hotel.name,
          icon: hotelIconUrl,
          offset: { x: -18, y: -44 } as any,
        })

        hotelMarker.setMap(mapInstance)

        // 使用统一的酒店信息窗口内容创建函数
        const hotelInfoWindow = new window.AMap.InfoWindow({
          content: createAccommodationInfoWindowContent(hotel) as any,
          offset: { x: 0, y: -40 } as any,
        })

        hotelMarker.on('click', () => {
          if (onHotelClick) {
            onHotelClick(hotel)
          }
          hotelInfoWindow.open(mapInstance, hotelMarker.getPosition())
        })

        newMarkers.push(hotelMarker)
        newAccommodationMarkers.push(hotelMarker)
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
        const path = dayActivities.map((a) => [a.location!.lng, a.location!.lat] as [number, number])
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

  // 显示加载错误或业务逻辑错误
  const displayError = loadError || error
  if (displayError) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
          <MapPin className="w-8 h-8 mb-2" />
          <span className="text-sm">{displayError}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {/* 顶部工具栏 - 使用提取的 TripMapToolbar 组件 */}
      <TripMapToolbar
        days={days}
        accommodation={accommodation}
        selectedDay={selectedDay}
        showRoutes={showRoutes}
        routeLines={routeLines}
        toolbarCollapsed={toolbarCollapsed}
        onDayChange={switchToDay}
        onAccommodationClick={switchToAccommodation}
        onToggleRoutes={toggleRoutes}
        onToggleCollapse={setToolbarCollapsed}
      />

      {/* 地图容器 - 移至工具栏下方 */}
      <div ref={mapRef} className="w-full h-[600px]" />

      {/* 隐藏高德地图默认的label */}
      <style jsx global>{`
        .amap-marker-label {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
