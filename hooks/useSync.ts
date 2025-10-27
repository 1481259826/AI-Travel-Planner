import { useState, useEffect, useCallback } from 'react'
import {
  onSyncStatusChange,
  startSync,
  forceFullSync,
  startNetworkMonitoring,
  stopNetworkMonitoring,
  startAutoSync,
  stopAutoSync,
  type SyncStatus,
} from '@/lib/sync'

interface UseSyncReturn {
  status: SyncStatus
  message: string
  isOnline: boolean
  syncNow: () => Promise<void>
  fullSync: (userId: string) => Promise<void>
  isSyncing: boolean
}

export function useSync(autoSync: boolean = true): UseSyncReturn {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [message, setMessage] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Initial online status
    setIsOnline(navigator.onLine)

    // Subscribe to sync status changes
    const unsubscribe = onSyncStatusChange((newStatus, newMessage) => {
      setStatus(newStatus)
      setMessage(newMessage || '')
      setIsSyncing(newStatus === 'syncing')
    })

    // Start network monitoring
    startNetworkMonitoring()

    // Start auto-sync if enabled
    if (autoSync) {
      startAutoSync()
    }

    // Monitor online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      stopNetworkMonitoring()
      if (autoSync) {
        stopAutoSync()
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [autoSync])

  const syncNow = useCallback(async () => {
    try {
      await startSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
      throw error
    }
  }, [])

  const fullSync = useCallback(async (userId: string) => {
    try {
      await forceFullSync(userId)
    } catch (error) {
      console.error('Full sync failed:', error)
      throw error
    }
  }, [])

  return {
    status,
    message,
    isOnline,
    syncNow,
    fullSync,
    isSyncing,
  }
}
