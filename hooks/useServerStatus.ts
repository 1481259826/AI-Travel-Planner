import { useState, useEffect } from 'react'

/**
 * Hook to detect if the server is actually reachable (not just network connection)
 * Checks by attempting to fetch a lightweight endpoint
 */
export function useServerStatus() {
  const [isServerOnline, setIsServerOnline] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  const checkServerStatus = async () => {
    // Don't check if already checking
    if (isChecking) return

    setIsChecking(true)

    try {
      // Try to fetch a lightweight endpoint with short timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      })

      clearTimeout(timeoutId)

      // Server is online only if we get 200 OK
      setIsServerOnline(response.ok)
    } catch (error) {
      // Network error or timeout = server offline
      setIsServerOnline(false)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Initial check
    checkServerStatus()

    // Check periodically (every 10 seconds)
    const interval = setInterval(checkServerStatus, 10000)

    // Also check when browser comes back online
    const handleOnline = () => checkServerStatus()
    window.addEventListener('online', handleOnline)

    // Mark as offline when browser goes offline
    const handleOffline = () => setIsServerOnline(false)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isServerOnline, checkServerStatus }
}
