/**
 * useMapMarkers Hook
 * 管理地图标记的创建、更新和删除
 */

import { useState, useEffect, useCallback } from 'react'
import type AMap from '@/types/amap'
import { logger } from '@/lib/logger'

export interface MarkerConfig {
  id: string
  position: AMap.LngLat
  title?: string
  content?: string
  icon?: string | AMap.Icon
  offset?: AMap.Pixel
  clickable?: boolean
  draggable?: boolean
  extData?: Record<string, unknown>
}

export interface InfoWindowConfig {
  content: string
  offset?: AMap.Pixel
  autoMove?: boolean
  closeWhenClickMap?: boolean
}

export interface UseMapMarkersOptions {
  /** 地图实例 */
  map: AMap.Map | null
  /** 点击标记时的回调 */
  onMarkerClick?: (markerId: string, marker: AMap.Marker) => void
}

export interface UseMapMarkersResult {
  /** 所有标记 */
  markers: Map<string, AMap.Marker>
  /** 添加标记 */
  addMarker: (config: MarkerConfig) => AMap.Marker | null
  /** 批量添加标记 */
  addMarkers: (configs: MarkerConfig[]) => AMap.Marker[]
  /** 删除标记 */
  removeMarker: (id: string) => void
  /** 删除所有标记 */
  clearMarkers: () => void
  /** 更新标记位置 */
  updateMarkerPosition: (id: string, position: AMap.LngLat) => void
  /** 显示信息窗口 */
  showInfoWindow: (markerId: string, config: InfoWindowConfig) => void
  /** 关闭信息窗口 */
  closeInfoWindow: () => void
  /** 使地图适配所有标记 */
  fitBounds: () => void
}

/**
 * 使用地图标记的 Hook
 */
export function useMapMarkers(options: UseMapMarkersOptions): UseMapMarkersResult {
  const { map, onMarkerClick } = options

  const [markers, setMarkers] = useState<Map<string, AMap.Marker>>(new Map())
  const [infoWindow, setInfoWindow] = useState<AMap.InfoWindow | null>(null)

  // 创建信息窗口实例
  useEffect(() => {
    if (!map || infoWindow) return

    const iw = new window.AMap.InfoWindow({
      offset: { x: 0, y: -30 } as any,
      autoMove: true,
      closeWhenClickMap: true,
    })

    setInfoWindow(iw)

    return () => {
      iw.close()
    }
  }, [map, infoWindow])

  // 添加单个标记
  const addMarker = useCallback(
    (config: MarkerConfig): AMap.Marker | null => {
      if (!map) {
        logger.warn('useMapMarkers: Cannot add marker without map instance')
        return null
      }

      try {
        const marker = new window.AMap.Marker({
          position: config.position,
          title: config.title,
          content: config.content,
          icon: config.icon,
          offset: config.offset as any,
          clickable: config.clickable !== false,
          draggable: config.draggable || false,
          extData: { ...config.extData, id: config.id },
        })

        marker.setMap(map)

        // 添加点击事件
        if (onMarkerClick) {
          marker.on('click', () => {
            onMarkerClick(config.id, marker)
          })
        }

        setMarkers((prev) => {
          const newMarkers = new Map(prev)
          // 如果已存在，先移除旧标记
          if (newMarkers.has(config.id)) {
            newMarkers.get(config.id)?.setMap(null)
          }
          newMarkers.set(config.id, marker)
          return newMarkers
        })

        logger.debug('useMapMarkers: Marker added', { id: config.id })

        return marker
      } catch (error) {
        logger.error('useMapMarkers: Failed to add marker', error as Error, { id: config.id })
        return null
      }
    },
    [map, onMarkerClick]
  )

  // 批量添加标记
  const addMarkers = useCallback(
    (configs: MarkerConfig[]): AMap.Marker[] => {
      const newMarkers: AMap.Marker[] = []

      for (const config of configs) {
        const marker = addMarker(config)
        if (marker) {
          newMarkers.push(marker)
        }
      }

      logger.debug('useMapMarkers: Batch markers added', { count: newMarkers.length })

      return newMarkers
    },
    [addMarker]
  )

  // 删除标记
  const removeMarker = useCallback((id: string) => {
    setMarkers((prev) => {
      const marker = prev.get(id)
      if (marker) {
        marker.setMap(null)
        logger.debug('useMapMarkers: Marker removed', { id })
      }

      const newMarkers = new Map(prev)
      newMarkers.delete(id)
      return newMarkers
    })
  }, [])

  // 清除所有标记
  const clearMarkers = useCallback(() => {
    markers.forEach((marker) => {
      marker.setMap(null)
    })

    setMarkers(new Map())

    logger.debug('useMapMarkers: All markers cleared')
  }, [markers])

  // 更新标记位置
  const updateMarkerPosition = useCallback(
    (id: string, position: AMap.LngLat) => {
      const marker = markers.get(id)
      if (marker) {
        marker.setPosition(position)
        logger.debug('useMapMarkers: Marker position updated', { id })
      }
    },
    [markers]
  )

  // 显示信息窗口
  const showInfoWindow = useCallback(
    (markerId: string, config: InfoWindowConfig) => {
      const marker = markers.get(markerId)

      if (!marker || !infoWindow) {
        logger.warn('useMapMarkers: Cannot show info window', { markerId })
        return
      }

      infoWindow.setContent(config.content)

      if (config.offset) {
        (infoWindow as any).setOffset(config.offset)
      }

      if (config.autoMove !== undefined) {
        (infoWindow as any).setAutoMove(config.autoMove)
      }

      infoWindow.open(map!, marker.getPosition())

      logger.debug('useMapMarkers: Info window shown', { markerId })
    },
    [markers, infoWindow, map]
  )

  // 关闭信息窗口
  const closeInfoWindow = useCallback(() => {
    if (infoWindow) {
      infoWindow.close()
      logger.debug('useMapMarkers: Info window closed')
    }
  }, [infoWindow])

  // 使地图适配所有标记
  const fitBounds = useCallback(() => {
    if (!map || markers.size === 0) {
      return
    }

    const markerArray = Array.from(markers.values())
    map.setFitView(markerArray, true, [50, 50, 50, 50])

    logger.debug('useMapMarkers: Map fitted to markers bounds', { count: markers.size })
  }, [map, markers])

  // 清理：组件卸载时移除所有标记
  useEffect(() => {
    return () => {
      markers.forEach((marker) => {
        marker.setMap(null)
      })

      if (infoWindow) {
        infoWindow.close()
      }
    }
  }, [markers, infoWindow])

  return {
    markers,
    addMarker,
    addMarkers,
    removeMarker,
    clearMarkers,
    updateMarkerPosition,
    showInfoWindow,
    closeInfoWindow,
    fitBounds,
  }
}
