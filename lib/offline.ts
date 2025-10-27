import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Trip, Expense } from '@/types'

// Database schema definition
interface OfflineDB extends DBSchema {
  trips: {
    key: string
    value: Trip
    indexes: { 'by-user': string; 'by-updated': string }
  }
  expenses: {
    key: string
    value: Expense
    indexes: { 'by-trip': string }
  }
  sync_queue: {
    key: number
    value: SyncQueueItem
    indexes: { 'by-status': string }
  }
}

interface SyncQueueItem {
  id?: number
  type: 'create' | 'update' | 'delete'
  entity: 'trip' | 'expense'
  entityId: string
  data?: any
  timestamp: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  error?: string
}

const DB_NAME = 'ai-travel-planner-offline'
const DB_VERSION = 1

// Database initialization
let dbInstance: IDBPDatabase<OfflineDB> | null = null

async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create trips store
      if (!db.objectStoreNames.contains('trips')) {
        const tripStore = db.createObjectStore('trips', { keyPath: 'id' })
        tripStore.createIndex('by-user', 'user_id')
        tripStore.createIndex('by-updated', 'updated_at')
      }

      // Create expenses store
      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' })
        expenseStore.createIndex('by-trip', 'trip_id')
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', {
          keyPath: 'id',
          autoIncrement: true,
        })
        syncStore.createIndex('by-status', 'status')
      }
    },
  })

  return dbInstance
}

// Trip operations
export const offlineTrips = {
  async getAll(userId: string): Promise<Trip[]> {
    const db = await getDB()
    return db.getAllFromIndex('trips', 'by-user', userId)
  },

  async getById(id: string): Promise<Trip | undefined> {
    const db = await getDB()
    return db.get('trips', id)
  },

  async save(trip: Trip): Promise<void> {
    const db = await getDB()
    await db.put('trips', trip)
  },

  async saveMany(trips: Trip[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('trips', 'readwrite')
    await Promise.all([
      ...trips.map(trip => tx.store.put(trip)),
      tx.done,
    ])
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('trips', id)
  },

  async clear(): Promise<void> {
    const db = await getDB()
    await db.clear('trips')
  },
}

// Expense operations
export const offlineExpenses = {
  async getByTrip(tripId: string): Promise<Expense[]> {
    const db = await getDB()
    return db.getAllFromIndex('expenses', 'by-trip', tripId)
  },

  async getById(id: string): Promise<Expense | undefined> {
    const db = await getDB()
    return db.get('expenses', id)
  },

  async save(expense: Expense): Promise<void> {
    const db = await getDB()
    await db.put('expenses', expense)
  },

  async saveMany(expenses: Expense[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('expenses', 'readwrite')
    await Promise.all([
      ...expenses.map(expense => tx.store.put(expense)),
      tx.done,
    ])
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('expenses', id)
  },

  async clear(): Promise<void> {
    const db = await getDB()
    await db.clear('expenses')
  },
}

// Sync queue operations
export const syncQueue = {
  async add(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
    const db = await getDB()
    return db.add('sync_queue', item as SyncQueueItem)
  },

  async getAll(): Promise<SyncQueueItem[]> {
    const db = await getDB()
    return db.getAll('sync_queue')
  },

  async getPending(): Promise<SyncQueueItem[]> {
    const db = await getDB()
    return db.getAllFromIndex('sync_queue', 'by-status', 'pending')
  },

  async updateStatus(
    id: number,
    status: SyncQueueItem['status'],
    error?: string
  ): Promise<void> {
    const db = await getDB()
    const item = await db.get('sync_queue', id)
    if (item) {
      item.status = status
      if (error) {
        item.error = error
      }
      await db.put('sync_queue', item)
    }
  },

  async remove(id: number): Promise<void> {
    const db = await getDB()
    await db.delete('sync_queue', id)
  },

  async clear(): Promise<void> {
    const db = await getDB()
    await db.clear('sync_queue')
  },

  async clearSynced(): Promise<void> {
    const db = await getDB()
    const synced = await db.getAllFromIndex('sync_queue', 'by-status', 'synced')
    const tx = db.transaction('sync_queue', 'readwrite')
    await Promise.all([
      ...synced.map(item => item.id && tx.store.delete(item.id)),
      tx.done,
    ])
  },
}

// Offline-first data operations with sync queue
export const offlineData = {
  async updateTrip(trip: Trip, isOffline: boolean = false): Promise<void> {
    // Save to local cache
    await offlineTrips.save(trip)

    // Add to sync queue if offline or explicitly requested
    if (isOffline || !navigator.onLine) {
      await syncQueue.add({
        type: 'update',
        entity: 'trip',
        entityId: trip.id,
        data: trip,
        timestamp: Date.now(),
        status: 'pending',
      })
    }
  },

  async updateExpense(expense: Expense, isOffline: boolean = false): Promise<void> {
    // Save to local cache
    await offlineExpenses.save(expense)

    // Add to sync queue if offline or explicitly requested
    if (isOffline || !navigator.onLine) {
      await syncQueue.add({
        type: 'update',
        entity: 'expense',
        entityId: expense.id,
        data: expense,
        timestamp: Date.now(),
        status: 'pending',
      })
    }
  },

  async deleteTrip(id: string, isOffline: boolean = false): Promise<void> {
    // Remove from local cache
    await offlineTrips.delete(id)

    // Add to sync queue if offline
    if (isOffline || !navigator.onLine) {
      await syncQueue.add({
        type: 'delete',
        entity: 'trip',
        entityId: id,
        timestamp: Date.now(),
        status: 'pending',
      })
    }
  },

  async deleteExpense(id: string, isOffline: boolean = false): Promise<void> {
    // Remove from local cache
    await offlineExpenses.delete(id)

    // Add to sync queue if offline
    if (isOffline || !navigator.onLine) {
      await syncQueue.add({
        type: 'delete',
        entity: 'expense',
        entityId: id,
        timestamp: Date.now(),
        status: 'pending',
      })
    }
  },
}

// Conflict resolution based on timestamps (last-write-wins)
export function resolveConflict<T extends { updated_at: string }>(
  local: T,
  remote: T
): T {
  const localTime = new Date(local.updated_at).getTime()
  const remoteTime = new Date(remote.updated_at).getTime()

  // Return the version with the latest timestamp
  return localTime > remoteTime ? local : remote
}

// Cache size utilities
export async function getCacheSize(): Promise<{
  trips: number
  expenses: number
  syncQueue: number
  total: number
}> {
  const db = await getDB()

  const [trips, expenses, queue] = await Promise.all([
    db.count('trips'),
    db.count('expenses'),
    db.count('sync_queue'),
  ])

  return {
    trips,
    expenses,
    syncQueue: queue,
    total: trips + expenses + queue,
  }
}

// Clear all offline data
export async function clearAllCache(): Promise<void> {
  await Promise.all([
    offlineTrips.clear(),
    offlineExpenses.clear(),
    syncQueue.clear(),
  ])
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

// Export type for sync queue item
export type { SyncQueueItem }
