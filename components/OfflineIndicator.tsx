'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showIndicator, setShowIndicator] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted state
    setMounted(true)

    // Initial state (only on client)
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
      setShowIndicator(!navigator.onLine)
    }

    // Event listeners
    const handleOnline = () => {
      setIsOnline(true)
      setShowIndicator(true)

      // Hide the online indicator after 3 seconds
      setTimeout(() => {
        setShowIndicator(false)
      }, 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowIndicator(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  // Don't show anything if online and indicator is hidden
  if (isOnline && !showIndicator) {
    return null
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-amber-500 text-white animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">已连接</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">离线模式</span>
        </>
      )}
    </div>
  )
}
