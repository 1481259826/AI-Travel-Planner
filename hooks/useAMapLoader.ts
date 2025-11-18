import { useEffect, useState } from 'react'
import { appConfig } from '@/lib/config'

/**
 * 高德地图加载状态
 */
export interface AMapLoaderState {
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  /** 地图 SDK 是否已加载 */
  isLoaded: boolean
}

/**
 * 高德地图加载配置
 */
export interface AMapLoaderOptions {
  /**
   * API Key 来源
   * - 'config': 从 lib/config 获取
   * - 'env': 从环境变量 NEXT_PUBLIC_MAP_API_KEY 获取
   * - 自定义字符串: 直接使用提供的 API Key
   * @default 'config'
   */
  apiKeySource?: 'config' | 'env' | string
  /**
   * 是否在加载失败时自动重试
   * @default false
   */
  autoRetry?: boolean
  /**
   * 重试次数
   * @default 1
   */
  retryCount?: number
  /**
   * 重试延迟（毫秒）
   * @default 2000
   */
  retryDelay?: number
}

/**
 * 高德地图加载 Hook
 *
 * 统一管理高德地图 SDK 的加载逻辑，避免在多个组件中重复代码
 *
 * @example
 * ```tsx
 * function MapComponent() {
 *   const { loading, error, isLoaded } = useAMapLoader()
 *
 *   if (loading) return <div>加载地图中...</div>
 *   if (error) return <div>错误: {error}</div>
 *   if (!isLoaded) return null
 *
 *   // 使用 window.AMap 初始化地图
 *   return <div ref={mapRef} />
 * }
 * ```
 *
 * @param options - 加载配置选项
 * @returns 地图加载状态
 */
export function useAMapLoader(options: AMapLoaderOptions = {}): AMapLoaderState {
  const {
    apiKeySource = 'config',
    autoRetry = false,
    retryCount = 1,
    retryDelay = 2000
  } = options

  const [loading, setLoading] = useState<boolean>(!window.AMap)
  const [error, setError] = useState<string | null>(null)
  const [retries, setRetries] = useState<number>(0)

  useEffect(() => {
    // 获取 API Key
    let apiKey: string | undefined

    if (apiKeySource === 'config') {
      apiKey = appConfig.map.apiKey
    } else if (apiKeySource === 'env') {
      apiKey = process.env.NEXT_PUBLIC_MAP_API_KEY
    } else {
      apiKey = apiKeySource
    }

    // 检查 API Key 是否配置
    if (!apiKey) {
      setError('未配置地图 API Key，地图功能不可用。您可以在设置页面添加高德地图 API Key 以使用地图功能。')
      setLoading(false)
      return
    }

    // 检查是否已加载
    if (window.AMap) {
      setLoading(false)
      setError(null)
      return
    }

    // 检查是否已存在加载中的脚本
    const existingScript = document.querySelector('script[src*="webapi.amap.com/maps"]')
    if (existingScript) {
      // 如果脚本正在加载，等待加载完成
      const checkInterval = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkInterval)
          setLoading(false)
          setError(null)
        }
      }, 100)

      // 10 秒超时
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.AMap) {
          setError('地图加载超时，请刷新页面重试')
          setLoading(false)
        }
      }, 10000)

      return () => clearInterval(checkInterval)
    }

    // 设置安全密钥（必须在加载脚本之前设置）
    const securityKey = process.env.NEXT_PUBLIC_MAP_SECURITY_KEY
    if (securityKey && !window._AMapSecurityConfig) {
      window._AMapSecurityConfig = {
        securityJsCode: securityKey,
      }
    }

    // 动态加载高德地图脚本
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`
    script.async = true

    // 加载成功
    script.onload = () => {
      if (window.AMap) {
        setLoading(false)
        setError(null)
        setRetries(0)
      } else {
        setError('地图 SDK 加载失败，window.AMap 未定义')
        setLoading(false)
      }
    }

    // 加载失败
    script.onerror = () => {
      const errorMsg = '地图加载失败，请检查网络连接或 API Key 是否正确'

      // 自动重试逻辑
      if (autoRetry && retries < retryCount) {
        console.warn(`地图加载失败，${retryDelay}ms 后重试 (${retries + 1}/${retryCount})`)
        setTimeout(() => {
          setRetries(prev => prev + 1)
          document.head.removeChild(script)
        }, retryDelay)
      } else {
        setError(errorMsg)
        setLoading(false)
      }
    }

    document.head.appendChild(script)

    // 清理函数
    return () => {
      // 注意：不移除 script 标签，因为其他组件可能还在使用
      // 高德地图 SDK 是全局单例，移除会导致其他组件无法使用
    }
  }, [apiKeySource, autoRetry, retryCount, retryDelay, retries])

  return {
    loading,
    error,
    isLoaded: !!window.AMap && !loading && !error
  }
}

/**
 * 默认配置的地图加载 Hook
 * 使用 lib/config 中的配置
 */
export function useAMapLoaderDefault(): AMapLoaderState {
  return useAMapLoader({ apiKeySource: 'config' })
}

/**
 * 从环境变量加载的地图 Hook
 * 使用 NEXT_PUBLIC_MAP_API_KEY 环境变量
 */
export function useAMapLoaderFromEnv(): AMapLoaderState {
  return useAMapLoader({ apiKeySource: 'env' })
}

/**
 * 带自动重试的地图加载 Hook
 * 在加载失败时自动重试 3 次
 */
export function useAMapLoaderWithRetry(): AMapLoaderState {
  return useAMapLoader({
    apiKeySource: 'config',
    autoRetry: true,
    retryCount: 3,
    retryDelay: 2000
  })
}
