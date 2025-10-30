import { db } from './supabase'
import {
  offlineTrips,
  offlineExpenses,
  syncQueue,
  resolveConflict,
  type SyncQueueItem,
} from './offline'
import { Trip, Expense } from '@/types'

// Sync status type
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

// Sync event listeners
type SyncEventListener = (status: SyncStatus, message?: string) => void
const syncListeners: SyncEventListener[] = []

export function onSyncStatusChange(listener: SyncEventListener) {
  syncListeners.push(listener)
  return () => {
    const index = syncListeners.indexOf(listener)
    if (index > -1) {
      syncListeners.splice(index, 1)
    }
  }
}

function notifySyncStatus(status: SyncStatus, message?: string) {
  syncListeners.forEach(listener => listener(status, message))
}

// Sync manager
let isSyncing = false
let syncInterval: NodeJS.Timeout | null = null

export async function startSync(): Promise<void> {
  if (isSyncing) {
    console.log('Sync already in progress')
    return
  }

  if (!navigator.onLine) {
    console.log('Cannot sync: offline')
    return
  }

  isSyncing = true
  notifySyncStatus('syncing')

  try {
    // 1. Upload local changes (sync queue)
    await uploadLocalChanges()

    // 2. Download remote updates
    await downloadRemoteUpdates()

    // 3. Clean up synced items
    await syncQueue.clearSynced()

    notifySyncStatus('synced', '数据同步成功')
  } catch (error) {
    console.error('Sync failed:', error)
    notifySyncStatus('error', error instanceof Error ? error.message : '同步失败')
  } finally {
    isSyncing = false
  }
}

async function uploadLocalChanges(): Promise<void> {
  const pendingItems = await syncQueue.getPending()

  if (pendingItems.length === 0) {
    console.log('No pending changes to upload')
    return
  }

  console.log(`Uploading ${pendingItems.length} pending changes...`)

  for (const item of pendingItems) {
    try {
      await syncQueue.updateStatus(item.id!, 'syncing')

      if (item.entity === 'trip') {
        await syncTripItem(item)
      } else if (item.entity === 'expense') {
        await syncExpenseItem(item)
      }

      await syncQueue.updateStatus(item.id!, 'synced')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to sync item ${item.id}:`, errorMessage)
      await syncQueue.updateStatus(item.id!, 'failed', errorMessage)
    }
  }
}

async function syncTripItem(item: SyncQueueItem): Promise<void> {
  switch (item.type) {
    case 'update': {
      // Get current remote version
      const { data: remoteTrip } = await db.trips.getById(item.entityId)

      if (remoteTrip) {
        // Resolve conflict: last-write-wins
        const localTrip = item.data as Trip
        const resolvedTrip = resolveConflict(localTrip, remoteTrip)

        // Update remote with resolved version
        await db.trips.update(item.entityId, resolvedTrip)

        // Update local cache if remote was newer
        if (resolvedTrip.id === remoteTrip.id) {
          await offlineTrips.save(remoteTrip)
        }
      } else {
        // Remote doesn't exist, just upload
        await db.trips.update(item.entityId, item.data)
      }
      break
    }

    case 'delete': {
      await db.trips.delete(item.entityId)
      break
    }

    case 'create': {
      // Note: We don't support offline creation in this version
      console.warn('Create operations are not supported yet')
      break
    }
  }
}

async function syncExpenseItem(item: SyncQueueItem): Promise<void> {
  switch (item.type) {
    case 'update': {
      // Get current remote version
      const { data: remoteExpense } = await db.expenses.getById?.(item.entityId) || {}

      if (remoteExpense) {
        // Resolve conflict: last-write-wins
        const localExpense = item.data as Expense
        const resolvedExpense = resolveConflict(localExpense, remoteExpense)

        // Update remote with resolved version
        await db.expenses.update(item.entityId, resolvedExpense)

        // Update local cache if remote was newer
        if (resolvedExpense.id === remoteExpense.id) {
          await offlineExpenses.save(remoteExpense)
        }
      } else {
        // Remote doesn't exist, just upload
        await db.expenses.update(item.entityId, item.data)
      }
      break
    }

    case 'delete': {
      await db.expenses.delete(item.entityId)
      break
    }

    case 'create': {
      // Note: We don't support offline creation in this version
      console.warn('Create operations are not supported yet')
      break
    }
  }
}

async function downloadRemoteUpdates(): Promise<void> {
  // Get user ID from auth (this would need to be passed in or retrieved from context)
  // For now, we'll skip the automatic download and rely on manual refresh
  // In a full implementation, you'd:
  // 1. Get the user's ID
  // 2. Fetch all trips for that user
  // 3. Compare timestamps with local cache
  // 4. Update local cache with newer remote items

  console.log('Remote update download not implemented in this version')
  console.log('Use the refresh button in the UI to manually fetch latest data')
}

// Cache trips from server
export async function cacheTripsFromServer(userId: string): Promise<void> {
  try {
    const { data: trips, error } = await db.trips.getAll(userId)

    if (error) throw error

    if (trips && trips.length > 0) {
      await offlineTrips.saveMany(trips)
      console.log(`Cached ${trips.length} trips`)
    }
  } catch (error) {
    console.error('Failed to cache trips:', error)
    throw error
  }
}

// Cache expenses for a trip
export async function cacheExpensesFromServer(tripId: string): Promise<void> {
  try {
    const { data: expenses, error } = await db.expenses.getByTrip(tripId)

    if (error) throw error

    if (expenses && expenses.length > 0) {
      await offlineExpenses.saveMany(expenses)
      console.log(`Cached ${expenses.length} expenses`)
    }
  } catch (error) {
    console.error('Failed to cache expenses:', error)
    throw error
  }
}

// Auto-sync setup
export function startAutoSync(intervalMs: number = 5 * 60 * 1000): void {
  if (syncInterval) {
    console.warn('Auto-sync already started')
    return
  }

  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      startSync().catch(console.error)
    }
  }, intervalMs)

  console.log(`Auto-sync started (interval: ${intervalMs}ms)`)
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('Auto-sync stopped')
  }
}

// Network status monitoring
let onlineListener: (() => void) | null = null
let offlineListener: (() => void) | null = null

export function startNetworkMonitoring(): void {
  if (typeof window === 'undefined') return

  onlineListener = () => {
    console.log('Network online - starting sync')
    startSync().catch(console.error)
  }

  offlineListener = () => {
    console.log('Network offline')
    notifySyncStatus('idle', '离线模式')
  }

  window.addEventListener('online', onlineListener)
  window.addEventListener('offline', offlineListener)

  // Initial status
  if (navigator.onLine) {
    notifySyncStatus('idle')
  } else {
    notifySyncStatus('idle', '离线模式')
  }
}

export function stopNetworkMonitoring(): void {
  if (typeof window === 'undefined') return

  if (onlineListener) {
    window.removeEventListener('online', onlineListener)
    onlineListener = null
  }

  if (offlineListener) {
    window.removeEventListener('offline', offlineListener)
    offlineListener = null
  }
}

// Get sync statistics
export async function getSyncStats(): Promise<{
  pending: number
  syncing: number
  synced: number
  failed: number
}> {
  const allItems = await syncQueue.getAll()

  return {
    pending: allItems.filter(item => item.status === 'pending').length,
    syncing: allItems.filter(item => item.status === 'syncing').length,
    synced: allItems.filter(item => item.status === 'synced').length,
    failed: allItems.filter(item => item.status === 'failed').length,
  }
}

// Prefetch all trip details (including itinerary) for offline access
export async function prefetchAllTripDetails(userId: string): Promise<void> {
  try {
    const { data: trips, error } = await db.trips.getAll(userId)

    if (error) throw error

    if (!trips || trips.length === 0) {
      console.log('No trips to prefetch')
      return
    }

    console.log(`Prefetching details for ${trips.length} trips...`)

    // Fetch full details for each trip in parallel (with limit to avoid overwhelming server)
    const batchSize = 3 // Fetch 3 trips at a time
    for (let i = 0; i < trips.length; i += batchSize) {
      const batch = trips.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (trip) => {
          try {
            const { data: fullTrip, error: tripError } = await db.trips.getById(trip.id)
            if (tripError) throw tripError

            if (fullTrip) {
              // Save complete trip data (including itinerary) to IndexedDB
              await offlineTrips.save(fullTrip)
              console.log(`Prefetched trip: ${fullTrip.destination}`)
            }
          } catch (err) {
            console.error(`Failed to prefetch trip ${trip.id}:`, err)
            // Continue with other trips even if one fails
          }
        })
      )
    }

    console.log('Prefetch completed')
  } catch (error) {
    console.error('Prefetch failed:', error)
    // Don't throw - prefetch is a background operation
  }
}

// Force full sync (download all data from server)
export async function forceFullSync(userId: string): Promise<void> {
  notifySyncStatus('syncing', '正在同步所有数据...')

  try {
    // Upload local changes first
    await uploadLocalChanges()

    // Download all trips
    await cacheTripsFromServer(userId)

    // Prefetch all trip details (including itinerary)
    await prefetchAllTripDetails(userId)

    // Download expenses for all cached trips
    const trips = await offlineTrips.getAll(userId)
    for (const trip of trips) {
      await cacheExpensesFromServer(trip.id)
    }

    await syncQueue.clearSynced()
    notifySyncStatus('synced', '全量同步完成')
  } catch (error) {
    console.error('Full sync failed:', error)
    notifySyncStatus('error', '同步失败')
    throw error
  }
}
