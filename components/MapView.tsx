'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type AMap from '@/types/amap'
import type { Activity, Meal } from '@/types'
import { useAMapLoader } from '@/hooks/useAMapLoader'
import { calculateMapCenter, createMapInfoWindowContent, type MapLocation } from '@/lib/map-markers'
import MapLegend from './map/MapLegend'

export type { MapLocation } from '@/lib/map-markers'

interface MapViewProps {
  locations: MapLocation[]
  center?: { lat: number; lng: number }
  zoom?: number
  showRoute?: boolean
  className?: string
}

export default function MapView({
  locations,
  center,
  zoom = 13,
  showRoute = false,
  className = ''
}: MapViewProps) {
  // 使用统一的地图加载 Hook（从环境变量获取 API Key）
  const { loading: mapLoading, error: mapLoadError, isLoaded } = useAMapLoader({ apiKeySource: 'env' })

  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<AMap.Map | null>(null)
  const markers = useRef<AMap.Marker[]>([])
  const drivingInstance = useRef<AMap.plugin.Driving | null>(null)
  const routePolylines = useRef<AMap.Polyline[]>([])
  const routePlanningCancelled = useRef(false) // 标记是否取消路线规划
  const initialFitViewDone = useRef(false) // 标记是否已经完成初始视野调整
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)

  // 初始化地图（当 SDK 加载完成后）
  useEffect(() => {
    if (!isLoaded) return
    initMap()

    return () => {
      // 清理地图实例
      if (mapInstance.current) {
        mapInstance.current.destroy()
      }
    }
  }, [isLoaded])

  // 初始化地图
  const initMap = () => {
    if (!mapContainer.current) {
      console.error('地图容器未准备好')
      setError('地图容器未准备好，请刷新页面重试')
      return
    }

    if (!window.AMap) {
      console.error('高德地图 SDK 未加载')
      setError('高德地图 SDK 未加载，请刷新页面重试')
      return
    }

    try {
      // 计算地图中心点
      const mapCenter = center || calculateMapCenter(locations)

      // 创建地图实例
      const map = new window.AMap.Map(mapContainer.current, {
        zoom,
        center: [mapCenter.lng, mapCenter.lat],
        viewMode: '3D', // 3D视图
        pitch: 40, // 俯仰角
      })

      mapInstance.current = map

      // 添加控件 - 使用 AMap.plugin 加载控件
      if (window.AMap && typeof (window.AMap as any).plugin === 'function') {
        (window.AMap as any).plugin(['AMap.Scale', 'AMap.ToolBar'], () => {
          try {
            // 检查构造函数是否存在
            if ((window.AMap as any).Scale && (window.AMap as any).ToolBar) {
              const scale = new (window.AMap as any).Scale()
              const toolbar = new (window.AMap as any).ToolBar();
              (map as any).addControl(scale);
              (map as any).addControl(toolbar)
            } else {
              console.warn('地图控件类不存在，跳过控件添加')
            }
          } catch (err) {
            console.warn('地图控件添加失败:', err)
            // 控件添加失败不影响地图显示，继续运行
          }
        })
      } else {
        console.warn('AMap.plugin 方法不存在，跳过控件加载')
      }
    } catch (err) {
      console.error('地图初始化失败:', err)
      setError(`地图初始化失败：${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  // 添加标记点
  useEffect(() => {
    if (!mapInstance.current || !window.AMap || locations.length === 0) return

    // 清除现有标记
    markers.current.forEach(marker => marker.setMap(null))
    markers.current = []

    // 添加新标记
    locations.forEach((location, index) => {
      const marker = new window.AMap.Marker({
        position: [location.lng, location.lat],
        title: location.name,
        label: {
          content: `<div class="map-label">${index + 1}</div>`,
          direction: 'top'
        },
        extData: location
      })

      // 点击标记显示信息窗口
      marker.on('click', () => {
        setSelectedLocation(location)

        const infoWindow = new window.AMap.InfoWindow({
          content: createMapInfoWindowContent(location, index + 1) as any,
          offset: { x: 0, y: -30 } as any
        })

        infoWindow.open(mapInstance.current!, marker.getPosition())
      })

      marker.setMap(mapInstance.current!)
      markers.current.push(marker)
    })

    // 只在初始加载时自动调整视野，之后保持用户的缩放级别
    if (locations.length > 1 && !initialFitViewDone.current) {
      mapInstance.current.setFitView()
      initialFitViewDone.current = true
    }
  }, [locations])

  // 绘制路线
  useEffect(() => {
    if (!mapInstance.current || !window.AMap || locations.length < 2) {
      return
    }

    // 清除现有路线和驾车实例
    const clearRoutes = () => {
      // 取消正在进行的路线规划
      routePlanningCancelled.current = true

      // 清除驾车实例
      if (drivingInstance.current) {
        drivingInstance.current.clear()
        drivingInstance.current = null
      }

      // 清除所有路线
      routePolylines.current.forEach(polyline => {
        if (polyline && mapInstance.current) {
          mapInstance.current.remove(polyline)
        }
      })
      routePolylines.current = []
    }

    clearRoutes()

    // 如果不显示路线，只清除
    if (!showRoute) {
      return
    }

    // 准备显示路线，重置取消标志
    routePlanningCancelled.current = false

    const waypoints = locations.map(loc => [loc.lng, loc.lat])

    // 使用 plugin 加载驾车路线规划插件
    if (!window.AMap || typeof (window.AMap as any).plugin !== 'function') {
      console.warn('AMap.plugin 不可用，跳过路线规划')
      return
    }

    (window.AMap as any).plugin('AMap.Driving', () => {
      try {
        // 检查 Driving 类是否存在
        if (!(window.AMap as any).Driving) {
          console.warn('AMap.Driving 类不存在，跳过路线规划')
          return
        }

        // 创建驾车路线规划实例（不自动在地图上显示）
        const driving = new (window.AMap as any).Driving({
          policy: (window.AMap as any).DrivingPolicy?.LEAST_TIME || 0, // 最快捷路线
          hideMarkers: true, // 隐藏起终点标记，使用我们自己的标记
        })

        drivingInstance.current = driving

        // 依次规划每段路线（添加延迟避免并发限制）
        let completedSegments = 0
        const totalSegments = waypoints.length - 1

        // 串行请求路线规划，避免并发超限
        const planRoute = async (index: number) => {
          // 检查是否已取消
          if (routePlanningCancelled.current || index >= totalSegments) return

          // 添加延迟避免 API 限流
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 300)) // 每个请求间隔300ms
          }

          // 再次检查是否已取消（延迟期间可能被取消）
          if (routePlanningCancelled.current) return

          driving.search(
            waypoints[index] as [number, number],
            waypoints[index + 1] as [number, number],
            async (status: string, result: any) => {
              // 检查是否已取消
              if (routePlanningCancelled.current) return

              if (status === 'complete' && result.routes && result.routes.length > 0) {
                console.log(`路线 ${index + 1}/${totalSegments} 规划成功`)

                // 提取路径坐标
                const route = result.routes[0]
                const path: any[] = []

                route.steps.forEach((step: any) => {
                  step.path.forEach((point: any) => {
                    path.push([point.lng, point.lat])
                  })
                })

                // 创建折线显示路线
                const polyline = new window.AMap.Polyline({
                  path: path,
                  strokeColor: '#3b82f6', // 亮蓝色
                  strokeWeight: 8, // 增加线宽
                  strokeOpacity: 0.95, // 提高不透明度
                  lineJoin: 'round',
                  lineCap: 'round',
                  zIndex: 50,
                  showDir: true, // 显示方向箭头
                  borderWeight: 2, // 添加边框
                })

                polyline.setMap(mapInstance.current)
                routePolylines.current.push(polyline)

                completedSegments++

                // 所有路段绘制完成
                if (completedSegments === totalSegments) {
                  console.log('所有路线绘制完成')
                }
              } else {
                console.warn(`路线 ${index + 1}/${totalSegments} 规划失败:`, status, result)
              }

              // 继续规划下一段
              await planRoute(index + 1)
            }
          )
        }

        // 开始规划第一段路线
        planRoute(0)
      } catch (err) {
        console.error('路线规划失败:', err)
      }
    })

    // 清理函数
    return () => {
      clearRoutes()
    }
  }, [showRoute, locations])

  // 计算所有位置的中心点
  // 显示加载错误或业务逻辑错误
  const displayError = mapLoadError || error
  if (displayError) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 text-red-700">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">地图加载失败</h3>
            <p className="text-sm">{displayError}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">加载地图中...</p>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />

      {/* 图例 */}
      {!mapLoading && locations.length > 0 && <MapLegend showRoute={showRoute} />}

      {/* 样式 */}
      <style jsx global>{`
        .map-label {
          background-color: #2563eb;
          color: white;
          font-weight: bold;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .amap-info-content {
          border-radius: 8px;
          overflow: hidden;
        }

        .amap-marker-label {
          border: none;
          background-color: transparent;
        }
      `}</style>
    </div>
  )
}

// 辅助函数：从行程数据提取位置信息
export function extractLocationsFromItinerary(
  activities: Activity[] = [],
  meals: Meal[] = []
): MapLocation[] {
  const locations: MapLocation[] = []

  // 添加活动景点
  activities.forEach(activity => {
    if (activity.location?.lat && activity.location?.lng) {
      locations.push({
        name: activity.name,
        lat: activity.location.lat,
        lng: activity.location.lng,
        type: 'activity',
        description: activity.description,
        time: activity.time
      })
    }
  })

  // 添加餐饮地点
  meals.forEach(meal => {
    if (meal.location?.lat && meal.location?.lng) {
      locations.push({
        name: meal.restaurant,
        lat: meal.location.lat,
        lng: meal.location.lng,
        type: 'meal',
        description: `${meal.cuisine} · 人均 ¥${meal.avg_price}`,
        time: meal.time
      })
    }
  })

  // 按时间排序
  return locations.sort((a, b) => {
    if (!a.time || !b.time) return 0
    return a.time.localeCompare(b.time)
  })
}
