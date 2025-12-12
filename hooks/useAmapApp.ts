/**
 * 高德 APP 集成 Hook
 *
 * 提供与高德地图 APP 联动的功能
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/database'

interface UseAmapAppOptions {
  onError?: (error: string) => void
  onSuccess?: (url: string) => void
}

interface Waypoint {
  name: string
  location: string // "lng,lat" 格式
}

export function useAmapApp(options?: UseAmapAppOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 调用 API
   */
  const callApi = useCallback(async (action: string, params: Record<string, any>) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('未登录')
      }

      const response = await fetch('/api/amap-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, ...params }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '请求失败')
      }

      const url = result.data?.url
      if (url) {
        options?.onSuccess?.(url)
      }

      return url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      options?.onError?.(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  /**
   * 生成专属地图（同步到高德地图 APP）
   * @param name 行程名称
   * @param waypoints 途经点列表
   * @param city 城市名称（用于限定 POI 搜索范围）
   */
  const generateCustomMap = useCallback(async (name: string, waypoints: Waypoint[], city?: string) => {
    return callApi('custom-map', { name, waypoints, city })
  }, [callApi])

  /**
   * 获取导航链接
   * @param destination 目的地坐标，格式为 "lng,lat"
   */
  const getNavigationLink = useCallback(async (destination: string) => {
    return callApi('navigation', { destination })
  }, [callApi])

  /**
   * 获取打车链接
   * @param origin 起点坐标，格式为 "lng,lat"
   * @param destination 终点坐标，格式为 "lng,lat"
   */
  const getTaxiLink = useCallback(async (origin: string, destination: string) => {
    return callApi('taxi', { origin, destination })
  }, [callApi])

  /**
   * 打开链接（在新窗口或唤起 APP）
   */
  const openLink = useCallback((url: string) => {
    // 现在返回的已经是 HTTPS 链接，可以直接打开
    // 在移动端会自动尝试唤起高德地图 APP（通过 callnative=1 参数）
    // 在桌面端会打开网页版地图
    window.open(url, '_blank')
  }, [])

  /**
   * 导航到目的地（获取链接并打开）
   */
  const navigateTo = useCallback(async (destination: string) => {
    const url = await getNavigationLink(destination)
    if (url) {
      openLink(url)
    }
    return url
  }, [getNavigationLink, openLink])

  /**
   * 打车到目的地（获取链接并打开）
   */
  const callTaxi = useCallback(async (origin: string, destination: string) => {
    const url = await getTaxiLink(origin, destination)
    if (url) {
      openLink(url)
    }
    return url
  }, [getTaxiLink, openLink])

  /**
   * 同步行程到高德地图（获取链接并打开）
   * @param name 行程名称
   * @param waypoints 途经点列表
   * @param city 城市名称（用于限定 POI 搜索范围）
   */
  const syncToAmap = useCallback(async (name: string, waypoints: Waypoint[], city?: string) => {
    const url = await generateCustomMap(name, waypoints, city)
    if (url) {
      openLink(url)
    }
    return url
  }, [generateCustomMap, openLink])

  return {
    loading,
    error,
    generateCustomMap,
    getNavigationLink,
    getTaxiLink,
    openLink,
    navigateTo,
    callTaxi,
    syncToAmap,
  }
}

export default useAmapApp
