import { useState, useEffect, useCallback } from 'react'
import { Trip } from '@/types'
import { db } from '@/lib/supabase'
import { offlineTrips } from '@/lib/offline'

interface UseOfflineTripReturn {
  trip: Trip | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateTrip: (updates: Partial<Trip>) => Promise<void>
  fromCache: boolean
}

export function useOfflineTrip(tripId: string | null): UseOfflineTripReturn {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchTrip = useCallback(async () => {
    if (!tripId) {
      setTrip(null)
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      // Try to load from cache first (offline-first strategy)
      const cachedTrip = await offlineTrips.getById(tripId)

      if (cachedTrip) {
        setTrip(cachedTrip)
        setFromCache(true)
        setIsLoading(false) // 立即停止加载，显示缓存数据
      } else {
        setIsLoading(true) // 只有在没有缓存时才显示加载状态
      }

      // Then try to fetch from server if online (在后台进行)
      if (navigator.onLine) {
        try {
          const { data: serverTrip, error: serverError } = await db.trips.getById(tripId)

          if (serverError) throw serverError

          if (serverTrip) {
            // 只有当数据真的不同时才更新
            const isDifferent = JSON.stringify(cachedTrip) !== JSON.stringify(serverTrip)
            if (isDifferent) {
              // Update cache with fresh data
              await offlineTrips.save(serverTrip)
              setTrip(serverTrip)
              setFromCache(false)
            }
          }
        } catch (networkError) {
          console.error('Failed to fetch from server, using cached data:', networkError)
          // If we have cached data, continue using it
          if (!cachedTrip) {
            throw networkError
          }
        }
      } else {
        // Offline: use cached data
        if (!cachedTrip) {
          throw new Error('Trip not available offline')
        }
      }
    } catch (err) {
      console.error('Error fetching trip:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch trip'))
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    fetchTrip()
  }, [fetchTrip])

  const refetch = useCallback(async () => {
    await fetchTrip()
  }, [fetchTrip])

  const updateTrip = useCallback(async (updates: Partial<Trip>) => {
    if (!trip) return

    try {
      const updatedTrip: Trip = {
        ...trip,
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Update local cache immediately (optimistic update)
      await offlineTrips.save(updatedTrip)
      setTrip(updatedTrip)

      // Try to sync to server if online
      if (navigator.onLine) {
        try {
          await db.trips.update(tripId!, updatedTrip)
        } catch (networkError) {
          console.error('Failed to sync to server, will retry later:', networkError)
          // Add to sync queue (handled by offlineData.updateTrip)
          const { offlineData } = await import('@/lib/offline')
          await offlineData.updateTrip(updatedTrip, true)
        }
      } else {
        // Offline: add to sync queue
        const { offlineData } = await import('@/lib/offline')
        await offlineData.updateTrip(updatedTrip, true)
      }
    } catch (err) {
      console.error('Error updating trip:', err)
      throw err
    }
  }, [trip, tripId])

  return { trip, isLoading, error, refetch, updateTrip, fromCache }
}
