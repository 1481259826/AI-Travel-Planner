/**
 * useMapRoutes Hook
 * 管理地图路线的绘制和管理
 */

import { useState, useCallback, useEffect } from 'react'
import type AMap from '@/types/amap'
import { logger } from '@/lib/logger'

export interface RouteConfig {
  id: string
  path: AMap.LngLat[]
  strokeColor?: string
  strokeWeight?: number
  strokeOpacity?: number
  strokeStyle?: 'solid' | 'dashed'
  showDir?: boolean
  extData?: Record<string, unknown>
}

export interface UseMapRoutesOptions {
  /** 地图实例 */
  map: AMap.Map | null
}

export interface UseMapRoutesResult {
  /** 所有路线 */
  routes: Map<string, AMap.Polyline>
  /** 添加路线 */
  addRoute: (config: RouteConfig) => AMap.Polyline | null
  /** 批量添加路线 */
  addRoutes: (configs: RouteConfig[]) => AMap.Polyline[]
  /** 删除路线 */
  removeRoute: (id: string) => void
  /** 清除所有路线 */
  clearRoutes: () => void
  /** 显示/隐藏路线 */
  toggleRoute: (id: string, visible: boolean) => void
  /** 显示/隐藏所有路线 */
  toggleAllRoutes: (visible: boolean) => void
  /** 使地图适配路线范围 */
  fitRouteBounds: (id: string) => void
}

/**
 * 使用地图路线的 Hook
 */
export function useMapRoutes(options: UseMapRoutesOptions): UseMapRoutesResult {
  const { map } = options

  const [routes, setRoutes] = useState<Map<string, AMap.Polyline>>(new Map())

  // 添加单条路线
  const addRoute = useCallback(
    (config: RouteConfig): AMap.Polyline | null => {
      if (!map) {
        logger.warn('useMapRoutes: Cannot add route without map instance')
        return null
      }

      if (!config.path || config.path.length < 2) {
        logger.warn('useMapRoutes: Route must have at least 2 points', { id: config.id })
        return null
      }

      try {
        const polyline = new window.AMap.Polyline({
          map,
          path: config.path,
          strokeColor: config.strokeColor || '#3b82f6',
          strokeWeight: config.strokeWeight || 5,
          strokeOpacity: config.strokeOpacity || 0.8,
          strokeStyle: config.strokeStyle || 'solid',
          showDir: config.showDir !== false,
          extData: { ...config.extData, id: config.id },
        })

        setRoutes((prev) => {
          const newRoutes = new Map(prev)
          // 如果已存在，先移除旧路线
          if (newRoutes.has(config.id)) {
            newRoutes.get(config.id)?.setMap(null)
          }
          newRoutes.set(config.id, polyline)
          return newRoutes
        })

        logger.debug('useMapRoutes: Route added', { id: config.id, pointCount: config.path.length })

        return polyline
      } catch (error) {
        logger.error('useMapRoutes: Failed to add route', error as Error, { id: config.id })
        return null
      }
    },
    [map]
  )

  // 批量添加路线
  const addRoutes = useCallback(
    (configs: RouteConfig[]): AMap.Polyline[] => {
      const newRoutes: AMap.Polyline[] = []

      for (const config of configs) {
        const route = addRoute(config)
        if (route) {
          newRoutes.push(route)
        }
      }

      logger.debug('useMapRoutes: Batch routes added', { count: newRoutes.length })

      return newRoutes
    },
    [addRoute]
  )

  // 删除路线
  const removeRoute = useCallback((id: string) => {
    setRoutes((prev) => {
      const route = prev.get(id)
      if (route) {
        route.setMap(null)
        logger.debug('useMapRoutes: Route removed', { id })
      }

      const newRoutes = new Map(prev)
      newRoutes.delete(id)
      return newRoutes
    })
  }, [])

  // 清除所有路线
  const clearRoutes = useCallback(() => {
    routes.forEach((route) => {
      route.setMap(null)
    })

    setRoutes(new Map())

    logger.debug('useMapRoutes: All routes cleared')
  }, [routes])

  // 显示/隐藏路线
  const toggleRoute = useCallback(
    (id: string, visible: boolean) => {
      const route = routes.get(id)
      if (route) {
        if (visible) {
          route.show()
        } else {
          route.hide()
        }
        logger.debug('useMapRoutes: Route visibility toggled', { id, visible })
      }
    },
    [routes]
  )

  // 显示/隐藏所有路线
  const toggleAllRoutes = useCallback(
    (visible: boolean) => {
      routes.forEach((route) => {
        if (visible) {
          route.show()
        } else {
          route.hide()
        }
      })

      logger.debug('useMapRoutes: All routes visibility toggled', { visible, count: routes.size })
    },
    [routes]
  )

  // 使地图适配路线范围
  const fitRouteBounds = useCallback(
    (id: string) => {
      if (!map) return

      const route = routes.get(id)
      if (route) {
        const path = route.getPath()
        map.setFitView([route], true, [50, 50, 50, 50])

        logger.debug('useMapRoutes: Map fitted to route bounds', {
          id,
          pointCount: (path as AMap.LngLat[]).length,
        })
      }
    },
    [map, routes]
  )

  // 清理：组件卸载时移除所有路线
  useEffect(() => {
    return () => {
      routes.forEach((route) => {
        route.setMap(null)
      })
    }
  }, [routes])

  return {
    routes,
    addRoute,
    addRoutes,
    removeRoute,
    clearRoutes,
    toggleRoute,
    toggleAllRoutes,
    fitRouteBounds,
  }
}
