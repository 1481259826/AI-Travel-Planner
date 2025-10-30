import { useState, useEffect, useCallback } from 'react'
import { Trip } from '@/types'
import { db } from '@/lib/supabase'
import { offlineTrips } from '@/lib/offline'
import { cacheTripsFromServer, prefetchAllTripDetails } from '@/lib/sync'

interface UseOfflineTripsReturn {
  trips: Trip[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  fromCache: boolean
}

export function useOfflineTrips(userId: string | null): UseOfflineTripsReturn {
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchTrips = useCallback(async () => {
    if (!userId) {
      setTrips([])
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // Try to load from cache first (offline-first strategy)
      const cachedTrips = await offlineTrips.getAll(userId)

      if (cachedTrips.length > 0) {
        setTrips(cachedTrips)
        setFromCache(true)
        setIsLoading(false) // 立即停止加载，显示缓存数据
      } else {
        setIsLoading(true) // 只有在没有缓存时才显示加载状态
      }

      // Then try to fetch from server if online (在后台进行)
      if (navigator.onLine) {
        try {
          const { data: serverTrips, error: serverError } = await db.trips.getAll(userId)

          if (serverError) throw serverError

          if (serverTrips) {
            // 只有当数据真的不同时才更新
            const isDifferent = JSON.stringify(cachedTrips) !== JSON.stringify(serverTrips)
            if (isDifferent) {
              // Update cache with fresh data
              await offlineTrips.saveMany(serverTrips)
              setTrips(serverTrips)
              setFromCache(false)
            }

            // Prefetch all trip details in background for offline access
            // This ensures all trips are fully cached even if user hasn't clicked them
            prefetchAllTripDetails(userId).catch(err => {
              console.error('Background prefetch failed:', err)
              // Don't throw - this is a background operation
            })
          }
        } catch (networkError) {
          console.error('Failed to fetch from server, using cached data:', networkError)
          // If we have cached data, continue using it
          if (cachedTrips.length === 0) {
            throw networkError
          }
        }
      } else {
        // Offline: use cached data
        if (cachedTrips.length === 0) {
          console.log('No cached trips available offline')
        }
      }
    } catch (err) {
      console.error('Error fetching trips:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch trips'))
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  const refetch = useCallback(async () => {
    await fetchTrips()
  }, [fetchTrips])

  return { trips, isLoading, error, refetch, fromCache }
}
