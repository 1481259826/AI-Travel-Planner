/**
 * useAmapInstance Hook
 * 管理高德地图实例的加载和初始化
 */

import { useEffect, useState, useRef, RefObject } from 'react'
import type AMap from '@/types/amap'
import config from '@/lib/config'
import { logger } from '@/lib/logger'

export interface UseAmapInstanceOptions {
  /** 地图容器的 ref */
  container: RefObject<HTMLDivElement>
  /** 地图中心点 */
  center?: AMap.LngLat
  /** 缩放级别 */
  zoom?: number
  /** 地图视口模式 */
  viewMode?: '2D' | '3D'
  /** 俯仰角 */
  pitch?: number
  /** 顺时针旋转角度 */
  rotation?: number
  /** 是否显示地图文字标记 */
  showLabel?: boolean
  /** 是否支持拖拽平移 */
  dragEnable?: boolean
  /** 是否支持滚轮缩放 */
  scrollWheel?: boolean
}

export interface UseAmapInstanceResult {
  /** 地图实例 */
  map: AMap.Map | null
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: string
  /** 高德地图 API 是否已加载 */
  isAMapLoaded: boolean
}

/**
 * 加载高德地图 API 脚本
 */
function loadAmapScript(apiKey: string, securityKey?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    if (window.AMap) {
      resolve()
      return
    }

    // 设置安全密钥（必须在加载脚本之前设置）
    if (securityKey) {
      window._AMapSecurityConfig = {
        securityJsCode: securityKey,
      }
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&plugin=AMap.Driving,AMap.Walking,AMap.Riding`
    script.async = true

    script.onload = () => {
      logger.debug('useAmapInstance: AMap script loaded successfully')
      resolve()
    }

    script.onerror = () => {
      logger.error('useAmapInstance: Failed to load AMap script')
      reject(new Error('Failed to load AMap script'))
    }

    document.head.appendChild(script)
  })
}

/**
 * 使用高德地图实例的 Hook
 */
export function useAmapInstance(options: UseAmapInstanceOptions): UseAmapInstanceResult {
  const {
    container,
    center = [116.397428, 39.90923], // 默认北京天安门
    zoom = 12,
    viewMode = '2D',
    pitch = 0,
    rotation = 0,
    showLabel = true,
    dragEnable = true,
    scrollWheel = true,
  } = options

  const [map, setMap] = useState<AMap.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAMapLoaded, setIsAMapLoaded] = useState(false)
  const mapInstanceRef = useRef<AMap.Map | null>(null)

  // 加载高德地图 API
  useEffect(() => {
    const apiKey = config.map.apiKey
    const securityKey = process.env.NEXT_PUBLIC_MAP_SECURITY_KEY

    if (!apiKey) {
      setError('未配置地图 API Key')
      setLoading(false)
      return
    }

    loadAmapScript(apiKey, securityKey)
      .then(() => {
        setIsAMapLoaded(true)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // 初始化地图实例
  useEffect(() => {
    if (!isAMapLoaded || !container.current || mapInstanceRef.current) {
      return
    }

    try {
      logger.debug('useAmapInstance: Initializing map instance')

      const mapInstance = new window.AMap.Map(container.current, {
        zoom,
        center,
        viewMode,
        pitch,
        rotation,
        dragEnable,
        scrollWheel,
      })

      mapInstanceRef.current = mapInstance
      setMap(mapInstance)

      logger.info('useAmapInstance: Map instance created successfully')
    } catch (err) {
      logger.error('useAmapInstance: Failed to create map instance', err as Error)
      setError('Failed to create map instance')
    }
  }, [
    isAMapLoaded,
    container,
    center,
    zoom,
    viewMode,
    pitch,
    rotation,
    showLabel,
    dragEnable,
    scrollWheel,
  ])

  // 清理地图实例
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        logger.debug('useAmapInstance: Destroying map instance')
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return {
    map,
    loading,
    error,
    isAMapLoaded,
  }
}
