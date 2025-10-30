'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react'
import { onSyncStatusChange, startSync, getSyncStats, type SyncStatus as SyncStatusType } from '@/lib/sync'
import { useServerStatus } from '@/hooks/useServerStatus'

interface SyncStats {
  pending: number
  syncing: number
  synced: number
  failed: number
}

export default function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusType>('idle')
  const [message, setMessage] = useState<string>('')
  const [stats, setStats] = useState<SyncStats>({ pending: 0, syncing: 0, synced: 0, failed: 0 })
  const [showStats, setShowStats] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Check if server is actually reachable
  const { isServerOnline } = useServerStatus()

  useEffect(() => {
    // Set mounted to true after component mounts (client-side only)
    setMounted(true)

    // Subscribe to sync status changes
    const unsubscribe = onSyncStatusChange((newStatus, newMessage) => {
      setStatus(newStatus)
      setMessage(newMessage || '')
    })

    // Load initial stats
    loadStats()

    // Refresh stats periodically
    const interval = setInterval(loadStats, 10000) // Every 10 seconds

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const loadStats = async () => {
    try {
      const newStats = await getSyncStats()
      setStats(newStats)
    } catch (error) {
      console.error('Failed to load sync stats:', error)
    }
  }

  const handleManualSync = async () => {
    try {
      await startSync()
      await loadStats()
    } catch (error) {
      console.error('Manual sync failed:', error)
    }
  }

  const hasPendingChanges = stats.pending > 0 || stats.syncing > 0

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Main sync status */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Status icon */}
          <div className="flex-shrink-0">
            {status === 'syncing' && (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            )}
            {status === 'synced' && (
              <Check className="w-5 h-5 text-green-500" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {status === 'idle' && hasPendingChanges && (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
            {status === 'idle' && !hasPendingChanges && (
              <Check className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* Status text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {!isServerOnline && '离线模式'}
              {isServerOnline && status === 'syncing' && '正在同步...'}
              {isServerOnline && status === 'synced' && '已同步'}
              {isServerOnline && status === 'error' && '同步失败'}
              {isServerOnline && status === 'idle' && hasPendingChanges && `${stats.pending} 个待同步更改`}
              {isServerOnline && status === 'idle' && !hasPendingChanges && '已同步'}
            </p>
            {message && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Stats toggle */}
            {hasPendingChanges && (
              <button
                onClick={() => setShowStats(!showStats)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showStats ? '隐藏' : '详情'}
              </button>
            )}

            {/* Manual sync button */}
            <button
              onClick={handleManualSync}
              disabled={status === 'syncing' || !isServerOnline}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="手动同步"
            >
              <RefreshCw className={`w-4 h-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats details */}
        {showStats && hasPendingChanges && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="space-y-2 text-xs">
              {stats.pending > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">待同步:</span>
                  <span className="font-medium text-amber-600">{stats.pending}</span>
                </div>
              )}
              {stats.syncing > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">同步中:</span>
                  <span className="font-medium text-blue-600">{stats.syncing}</span>
                </div>
              )}
              {stats.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">失败:</span>
                  <span className="font-medium text-red-600">{stats.failed}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
