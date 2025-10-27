'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, Meal } from '@/types'
import { MapPin, AlertCircle } from 'lucide-react'

// 声明高德地图全局类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
  }
}

export interface MapLocation {
  name: string
  lat: number
  lng: number
  type: 'activity' | 'meal'
  description?: string
  time?: string
}

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
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markers = useRef<any[]>([])
  const drivingInstance = useRef<any>(null)
  const routePolylines = useRef<any[]>([])
  const routePlanningCancelled = useRef(false) // 标记是否取消路线规划
  const initialFitViewDone = useRef(false) // 标记是否已经完成初始视野调整
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)

  // 加载高德地图API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_MAP_API_KEY

    if (!apiKey) {
      setError('地图 API Key 未配置，请在环境变量中设置 NEXT_PUBLIC_MAP_API_KEY')
      setLoading(false)
      return
    }

    // 检查是否已加载
    if (window.AMap) {
      initMap()
      return
    }

    // 设置安全密钥（必须在加载脚本之前设置）
    if (process.env.NEXT_PUBLIC_MAP_SECURITY_KEY) {
      window._AMapSecurityConfig = {
        securityJsCode: process.env.NEXT_PUBLIC_MAP_SECURITY_KEY,
      }
    }

    // 动态加载高德地图脚本
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`
    script.async = true
    script.onerror = () => {
      setError('地图加载失败，请检查网络连接或 API Key 是否正确')
      setLoading(false)
    }
    script.onload = () => {
      initMap()
    }

    document.head.appendChild(script)

    return () => {
      // 清理地图实例
      if (mapInstance.current) {
        mapInstance.current.destroy()
      }
    }
  }, [])

  // 初始化地图
  const initMap = () => {
    if (!mapContainer.current) {
      console.error('地图容器未准备好')
      return
    }

    if (!window.AMap) {
      console.error('高德地图 SDK 未加载')
      return
    }

    try {
      console.log('开始初始化地图，位置数量:', locations.length)

      // 计算地图中心点
      const mapCenter = center || calculateCenter(locations)
      console.log('地图中心点:', mapCenter)

      // 创建地图实例
      const map = new window.AMap.Map(mapContainer.current, {
        zoom,
        center: [mapCenter.lng, mapCenter.lat],
        viewMode: '3D', // 3D视图
        pitch: 40, // 俯仰角
        showIndoorMap: false,
      })

      mapInstance.current = map

      console.log('地图实例创建成功')

      // 添加控件 - 使用 AMap.plugin 加载控件
      window.AMap.plugin(['AMap.Scale', 'AMap.ToolBar'], () => {
        try {
          const scale = new window.AMap.Scale()
          const toolbar = new window.AMap.ToolBar()
          map.addControl(scale)
          map.addControl(toolbar)
          console.log('地图控件添加成功')
        } catch (err) {
          console.warn('地图控件添加失败:', err)
          // 控件添加失败不影响地图显示，继续运行
        }
      })

      setLoading(false)
    } catch (err) {
      console.error('地图初始化失败详细错误:', err)
      setError(`地图初始化失败：${err instanceof Error ? err.message : '未知错误'}`)
      setLoading(false)
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
          content: createInfoWindowContent(location, index + 1),
          offset: new window.AMap.Pixel(0, -30)
        })

        infoWindow.open(mapInstance.current, marker.getPosition())
      })

      marker.setMap(mapInstance.current)
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
    window.AMap.plugin('AMap.Driving', () => {
      try {
        // 创建驾车路线规划实例（不自动在地图上显示）
        const driving = new window.AMap.Driving({
          policy: window.AMap.DrivingPolicy.LEAST_TIME, // 最快捷路线
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
            new window.AMap.LngLat(waypoints[index][0], waypoints[index][1]),
            new window.AMap.LngLat(waypoints[index + 1][0], waypoints[index + 1][1]),
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
                  outlineColor: '#1e40af', // 深蓝色边框
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
  const calculateCenter = (locs: MapLocation[]) => {
    if (locs.length === 0) {
      return { lat: 39.9042, lng: 116.4074 } // 默认北京
    }

    const sum = locs.reduce(
      (acc, loc) => ({
        lat: acc.lat + loc.lat,
        lng: acc.lng + loc.lng
      }),
      { lat: 0, lng: 0 }
    )

    return {
      lat: sum.lat / locs.length,
      lng: sum.lng / locs.length
    }
  }

  // 创建信息窗口内容
  const createInfoWindowContent = (location: MapLocation, index: number) => {
    const icon = location.type === 'activity' ? '🎯' : '🍽️'
    const typeText = location.type === 'activity' ? '活动' : '餐饮'

    return `
      <div style="padding: 12px; min-width: 200px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">${icon}</span>
          <div>
            <div style="font-weight: bold; font-size: 16px; color: #1f2937;">${location.name}</div>
            <div style="font-size: 12px; color: #6b7280;">${typeText} · 第 ${index} 站</div>
          </div>
        </div>
        ${location.time ? `<div style="font-size: 14px; color: #4b5563; margin-top: 4px;">⏰ ${location.time}</div>` : ''}
        ${location.description ? `<div style="font-size: 14px; color: #4b5563; margin-top: 4px;">${location.description}</div>` : ''}
      </div>
    `
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 text-red-700">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">地图加载失败</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
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
      {!loading && locations.length > 0 && (
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
          </div>
          {showRoute && (
            <div className="mt-2 pt-2 border-t text-xs text-gray-500">
              蓝色线路为推荐路线
            </div>
          )}
        </div>
      )}

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
