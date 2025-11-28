import { useState, useEffect } from 'react'

/**
 * Hook to detect if the server is actually reachable (not just network connection)
 * Checks by attempting to fetch a lightweight endpoint
 *
 * 注意：开发环境下禁用定时检查，避免日志刷屏
 */
export function useServerStatus() {
  const [isServerOnline, setIsServerOnline] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  // 开发环境下跳过定时检查
  const isDev = process.env.NODE_ENV === 'development'

  const checkServerStatus = async () => {
    // Don't check if already checking
    if (isChecking) return

    setIsChecking(true)

    try {
      // Try to fetch a lightweight endpoint with short timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout（开发环境更稳）

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      })

      clearTimeout(timeoutId)

      // Server is online only if we get 200 OK
      setIsServerOnline(response.ok)
    } catch (error) {
      // 忽略被主动中止（AbortController）的错误，按离线处理但不抛出
      if ((error as any)?.name === 'AbortError') {
        setIsServerOnline(false)
      } else {
        setIsServerOnline(false)
      }
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // 开发环境下不进行定时检查，直接假设在线
    if (isDev) {
      setIsServerOnline(true)
      return
    }

    // 初次检查延迟 1s，避免热更新/页面切换导致请求被中止
    const initialTimer = setTimeout(checkServerStatus, 1000)

    // Check periodically (every 10 seconds)
    const interval = setInterval(checkServerStatus, 10000)

    // Also check when browser comes back online
    const handleOnline = () => checkServerStatus()
    window.addEventListener('online', handleOnline)

    // Mark as offline when browser goes offline
    const handleOffline = () => setIsServerOnline(false)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isDev])

  return { isServerOnline, checkServerStatus }
}
